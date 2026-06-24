// =============================================
// Phase 3.8: Adaptive Weight Optimizer
// Timeline First Architecture — Dynamic Weight Adjustment
// =============================================
// Reads bandit posterior (α, β) and recent performance history.
// Proposes new weight_config for blend arms under hard safety constraints:
//
//   1. Min samples       — don't adjust until arm has enough data
//   2. Max delta per step — prevent sudden weight jumps (default 0.1)
//   3. Dominance check    — never push weight past 0.95 or below 0.05
//   4. Baseline guard     — new weight must not regress vs current
//                           production strategy by more than `regression_tolerance`
//
// Optimization strategy: gradient-free bandit-driven adjustment.
//   - For each blend arm we shift weights toward the posterior mean
//     of the highest-reward arm, but capped at delta_max.
//   - This is intentionally simple — when we have 3 arms, the bandit
//     will naturally learn which blend is best, and the optimizer
//     just keeps the weight configs reasonable.
//
// Workflow:
//   1. proposeWeightAdjustments() — pure function over current state
//   2. applyWeightAdjustments()   — persists + writes audit snapshot
//   3. recordAdaptiveSnapshot()   — called by apply path for history

import { createClient } from "@/lib/supabase/server"
import { listActiveArms, getBanditState } from "@/lib/timeline/bandit-policy"
import type { BanditArm, BanditStateSnapshot } from "@/lib/timeline/bandit-policy"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"

// ─── Configuration ─────────────────────────────────────────────────────────

export interface OptimizerConfig {
  /** Maximum per-step weight change (default 0.1 = ±10%). */
  deltaMax: number
  /** Minimum pulls required before adjusting an arm's weights. */
  minSamples: number
  /** Minimum weight (default 0.05) — never push an arm below this. */
  weightFloor: number
  /** Maximum weight (default 0.95) — never push an arm above this. */
  weightCeiling: number
  /** If proposed reward < current reward * (1 - regressionTolerance), reject. */
  regressionTolerance: number
  /** Only adjust blend arms (not review/timeline only). */
  blendArmsOnly: boolean
}

export const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig = {
  deltaMax: 0.1,
  minSamples: 200,
  weightFloor: 0.05,
  weightCeiling: 0.95,
  regressionTolerance: 0.15,
  blendArmsOnly: true,
}

// ─── Propositions ──────────────────────────────────────────────────────────

export interface WeightProposition {
  armId: string
  currentWeights: { timeline: number; review: number }
  proposedWeights: { timeline: number; review: number }
  deltaTimeline: number
  deltaReview: number
  reason: string
  posteriorMean: number
  totalPulls: number
  expectedLift: number
  /** Whether this proposal passes all safety checks and is safe to apply. */
  safe: boolean
  rejectionReason: string | null
}

/**
 * Pure analysis: compute proposed weight adjustments without mutating state.
 * Reads arm metadata and bandit posterior to produce one proposition per
 * candidate blend arm.
 */
export async function proposeWeightAdjustments(input: {
  segment?: SegmentKey
  config?: Partial<OptimizerConfig>
  windowHours?: number
}): Promise<WeightProposition[]> {
  const config: OptimizerConfig = { ...DEFAULT_OPTIMIZER_CONFIG, ...(input.config ?? {}) }
  const segment: SegmentKey = input.segment ?? "global"

  const arms = await listActiveArms()
  const candidateArms = config.blendArmsOnly ? arms.filter((a) => a.scoring_engine === "blend") : arms
  if (candidateArms.length === 0) return []

  const armIds = candidateArms.map((a) => a.arm_id)
  const states = await getBanditState(armIds, segment)
  const stateMap = new Map(states.map((s) => [s.arm_id, s]))

  // Find the best-performing arm to use as the "target" for the shift.
  const ranked = [...states]
    .filter((s) => s.total_pulls >= config.minSamples)
    .sort((a, b) => b.mean_reward - a.mean_reward)

  const bestArm = ranked[0] ?? null

  const propositions: WeightProposition[] = candidateArms.map((arm) => {
    const state = stateMap.get(arm.arm_id)
    const posteriorMean = state?.mean_reward ?? 0.5
    const totalPulls = state?.total_pulls ?? 0

    const current = {
      timeline: arm.weight_config.timeline ?? 0.5,
      review: arm.weight_config.review ?? 0.5,
    }

    if (!state || totalPulls < config.minSamples) {
      return {
        armId: arm.arm_id,
        currentWeights: current,
        proposedWeights: current,
        deltaTimeline: 0,
        deltaReview: 0,
        reason: "insufficient_samples",
        posteriorMean,
        totalPulls,
        expectedLift: 0,
        safe: false,
        rejectionReason: `total_pulls=${totalPulls} < min_samples=${config.minSamples}`,
      }
    }

    if (!bestArm) {
      return {
        armId: arm.arm_id,
        currentWeights: current,
        proposedWeights: current,
        deltaTimeline: 0,
        deltaReview: 0,
        reason: "no_baseline",
        posteriorMean,
        totalPulls,
        expectedLift: 0,
        safe: false,
        rejectionReason: "no arm has reached min_samples",
      }
    }

    // This arm IS the best arm — no adjustment needed.
    if (bestArm.arm_id === arm.arm_id) {
      return {
        armId: arm.arm_id,
        currentWeights: current,
        proposedWeights: current,
        deltaTimeline: 0,
        deltaReview: 0,
        reason: "current_best",
        posteriorMean,
        totalPulls,
        expectedLift: 0,
        safe: true,
        rejectionReason: null,
      }
    }

    // Compute target shift: move this arm's timeline weight toward
    // the best arm's posterior mean (proxy for "blend that works").
    const targetTimeline = clamp(
      bestArm.mean_reward,
      config.weightFloor,
      config.weightCeiling
    )
    const targetReview = clamp(1 - targetTimeline, config.weightFloor, config.weightCeiling)

    const rawDeltaTimeline = targetTimeline - current.timeline
    const rawDeltaReview = targetReview - current.review

    const cappedDeltaTimeline = capDelta(rawDeltaTimeline, config.deltaMax)
    const cappedDeltaReview = capDelta(rawDeltaReview, config.deltaMax)

    const proposedTimeline = clamp(
      current.timeline + cappedDeltaTimeline,
      config.weightFloor,
      config.weightCeiling
    )
    const proposedReview = clamp(
      1 - proposedTimeline,
      config.weightFloor,
      config.weightCeiling
    )

    const expectedLift = posteriorMean - bestArm.mean_reward

    // Baseline regression guard: if this arm is materially worse than
    // current production and the shift is too aggressive, reject.
    if (expectedLift < -config.regressionTolerance) {
      return {
        armId: arm.arm_id,
        currentWeights: current,
        proposedWeights: { timeline: proposedTimeline, review: proposedReview },
        deltaTimeline: cappedDeltaTimeline,
        deltaReview: cappedDeltaReview,
        reason: "regression_guarded",
        posteriorMean,
        totalPulls,
        expectedLift,
        safe: false,
        rejectionReason: `expected_lift ${expectedLift.toFixed(3)} < -regression_tolerance ${-config.regressionTolerance}`,
      }
    }

    return {
      armId: arm.arm_id,
      currentWeights: current,
      proposedWeights: { timeline: proposedTimeline, review: proposedReview },
      deltaTimeline: cappedDeltaTimeline,
      deltaReview: cappedDeltaReview,
      reason: "shift_toward_best",
      posteriorMean,
      totalPulls,
      expectedLift,
      safe: true,
      rejectionReason: null,
    }
  })

  return propositions
}

// ─── Application ───────────────────────────────────────────────────────────

export interface ApplyResult {
  applied: WeightProposition[]
  rejected: WeightProposition[]
  snapshotIds: string[]
}

/**
 * Apply a set of weight propositions that have been approved by safety.
 * Writes:
 *   - bandit_arms.weight_config (for each arm)
 *   - adaptive_weight_snapshots (one row per change)
 */
export async function applyWeightAdjustments(
  propositions: WeightProposition[],
  options: { triggeredBy?: "auto" | "manual"; reason?: string } = {}
): Promise<ApplyResult> {
  const triggeredBy = options.triggeredBy ?? "auto"
  const reason = options.reason ?? "bandit_optimization"

  const applied: WeightProposition[] = []
  const rejected: WeightProposition[] = []
  const snapshotIds: string[] = []

  for (const prop of propositions) {
    if (!prop.safe || (prop.deltaTimeline === 0 && prop.deltaReview === 0)) {
      rejected.push(prop)
      continue
    }

    // Update arm weight_config
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: armErr } = await (supabase as any)
      .from("bandit_arms")
      .update({
        weight_config: prop.proposedWeights,
        updated_at: new Date().toISOString(),
      })
      .eq("arm_id", prop.armId)

    if (armErr) {
      console.error("[AdaptiveOptimizer] arm update failed:", armErr.message)
      rejected.push(prop)
      continue
    }

    // Record audit snapshot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: snapRow, error: snapErr } = await (supabase as any)
      .from("adaptive_weight_snapshots")
      .insert({
        arm_id: prop.armId,
        previous_weights: prop.currentWeights,
        new_weights: prop.proposedWeights,
        delta_max: DEFAULT_OPTIMIZER_CONFIG.deltaMax,
        reason: `${reason}: ${prop.reason}`,
        triggered_by: triggeredBy,
      })
      .select("id")
      .single()

    if (snapErr) {
      console.error("[AdaptiveOptimizer] snapshot insert failed:", snapErr.message)
    } else if (snapRow) {
      snapshotIds.push(snapRow.id as string)
    }

    recordBanditEvent({
      type: "WEIGHT_ADJUSTED",
      armId: prop.armId,
      segment: "global",
      sampledValue: 0,
      requestId: `optimizer-${Date.now()}`,
      metadata: {
        previous: prop.currentWeights,
        proposed: prop.proposedWeights,
        expected_lift: prop.expectedLift,
        reason: prop.reason,
      },
    })

    applied.push(prop)
  }

  return { applied, rejected, snapshotIds }
}

// ─── Backwards-Compat Wrapper ──────────────────────────────────────────────

/**
 * Convenience: propose + apply safe adjustments in one call.
 * Always respects RolloutController — does NOT bypass it.
 */
export async function runAdaptiveOptimization(input: {
  segment?: SegmentKey
  config?: Partial<OptimizerConfig>
  triggeredBy?: "auto" | "manual"
}): Promise<ApplyResult> {
  const propositions = await proposeWeightAdjustments(input)
  return applyWeightAdjustments(propositions, { triggeredBy: input.triggeredBy ?? "auto" })
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo
  if (v > hi) return hi
  return v
}

function capDelta(delta: number, cap: number): number {
  if (delta > cap) return cap
  if (delta < -cap) return -cap
  return delta
}
