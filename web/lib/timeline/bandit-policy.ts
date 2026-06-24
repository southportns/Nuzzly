// =============================================
// Phase 3.8: Bandit Policy Layer (Self-Optimizing Ranking)
// Timeline First Architecture — Multi-Armed Bandit
// =============================================
// Algorithm: Thompson Sampling with Beta posteriors
//   - Each arm maintains a Beta(α, β) posterior over its reward.
//   - On selection: sample ~Beta(α, β) per arm, pick the largest sample.
//   - On reward: α += reward, β += (1 - reward).
// Why Thompson Sampling over UCB:
//   - Naturally handles cold-start (uniform Beta(1,1) prior).
//   - Probabilistic exploration, no manual confidence width tuning.
//   - Better empirical regret on non-stationary reward distributions.
//
// Integration:
//   - This layer is ADDITIVE — RolloutController remains the source of
//     truth for engine choice (review / timeline / blend) and AB routing.
//   - When RolloutController selects 'blend' or 'timeline' and the bandit
//     is enabled, we pick one of the candidate arms to vary the weight
//     configuration.  RolloutController still decides the engine.
//   - The bandit NEVER bypasses RolloutController's short-circuit.

import { createClient } from "@/lib/supabase/server"
import { rolloutController } from "@/lib/timeline/rollout-controller"
import type { RolloutDecision } from "@/lib/timeline/rollout-controller"
import { FLAG_KEYS, getFlag } from "@/lib/timeline/feature-flags"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"
import { identifyForcedExplorationArms, recordArmExposure } from "@/lib/timeline/forced-exploration"

// ─── Types ──────────────────────────────────────────────────────────────────

export type SegmentKey = "global" | "new_user" | "returning_user" | "high_intent" | "low_intent"

export interface BanditArm {
  arm_id: string
  arm_name: string
  scoring_engine: "review" | "timeline" | "blend"
  weight_config: {
    timeline: number
    review: number
    [k: string]: number
  }
  description: string | null
  is_active: boolean
}

export interface BanditStateSnapshot {
  arm_id: string
  segment: string
  alpha: number
  beta: number
  total_pulls: number
  total_reward: number
  cumulative_regret: number
  mean_reward: number
}

export interface ArmSelection {
  armId: string
  weightConfig: { timeline: number; review: number }
  scoringEngine: "review" | "timeline" | "blend"
  sampledValue: number
  alpha: number
  beta: number
  segment: SegmentKey
  // Source of the selection — for audit
  source: "BANDIT" | "FALLBACK_BLEND" | "FALLBACK_REVIEW" | "FORCED_EXPLORATION"
  // Eligible candidate arms considered in this draw
  candidates: string[]
  // True if this selection was forced by the exposure scheduler.
  forced: boolean
}

// ─── Master Switch ──────────────────────────────────────────────────────────

/**
 * Check if the bandit layer is enabled via feature flag.
 * Defaults to disabled (fail-closed).
 */
export async function isBanditEnabled(): Promise<boolean> {
  try {
    const flag = await getFlag(FLAG_KEYS.BANDIT_ENABLED)
    return flag.enabled === true
  } catch {
    return false
  }
}

// ─── Arm Registry ──────────────────────────────────────────────────────────

/**
 * Fetch all active bandit arms from the database.
 */
export async function listActiveArms(): Promise<BanditArm[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("bandit_arms")
    .select("*")
    .eq("is_active", true)
    .order("arm_id")

  if (error || !data) return []
  return data as BanditArm[]
}

/**
 * Fetch state snapshots for given arms in a segment.
 */
export async function getBanditState(armIds: string[], segment: SegmentKey = "global"): Promise<BanditStateSnapshot[]> {
  if (armIds.length === 0) return []

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("bandit_state")
    .select("*")
    .eq("segment", segment)
    .in("arm_id", armIds)

  if (error || !data) return []

  return (data as Array<{
    arm_id: string
    segment: string
    alpha: number
    beta: number
    total_pulls: number
    total_reward: number
    cumulative_regret: number
  }>).map((row) => ({
    arm_id: row.arm_id,
    segment: row.segment,
    alpha: Number(row.alpha),
    beta: Number(row.beta),
    total_pulls: Number(row.total_pulls),
    total_reward: Number(row.total_reward),
    cumulative_regret: Number(row.cumulative_regret),
    mean_reward: row.total_pulls > 0 ? Number(row.total_reward) / row.total_pulls : 0,
  }))
}

// ─── Thompson Sampling ─────────────────────────────────────────────────────

/**
 * Approximate Beta(α, β) sampling via Gamma ratio.
 * Uses the Marsaglia & Tsang (2000) Gamma sampler for α, β ≥ 1.
 * Falls back to a uniform prior for α, β < 1.
 */
function sampleBeta(alpha: number, beta: number): number {
  if (alpha < 1 && beta < 1) {
    // Use the Johnk-style mixture for α, β < 1
    const u = Math.random()
    const v = Math.random()
    const x = Math.pow(u, 1 / alpha)
    const y = Math.pow(v, 1 / beta)
    return x / (x + y)
  }
  const x = sampleGamma(Math.max(alpha, 1))
  const y = sampleGamma(Math.max(beta, 1))
  return x / (x + y)
}

/**
 * Marsaglia & Tsang (2000) Gamma sampler for shape ≥ 1.
 */
function sampleGamma(shape: number): number {
  if (shape < 1) {
    // Boost shape for shape < 1
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  while (true) {
    let x: number
    let v: number
    do {
      x = gaussian()
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = Math.random()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

/**
 * Box–Muller standard normal sample.
 */
function gaussian(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

// ─── Core Policy ────────────────────────────────────────────────────────────

/**
 * Candidate arms per RolloutController engine decision.
 * - review → review_only
 * - timeline → timeline_only
 * - blend → all 3 blends (bandit chooses the weight config)
 */
function candidateArmsForEngine(engine: RolloutDecision["engine"]): string[] {
  switch (engine) {
    case "review":
      return ["review_only"]
    case "timeline":
      return ["timeline_only"]
    case "blend":
      return ["blend_70_30", "blend_50_50", "blend_30_70"]
    default:
      return ["blend_70_30"]
  }
}

/**
 * Select an arm for the current request.
 *
 * - Respects RolloutController short-circuit (returns review-only).
 * - When bandit is disabled, returns a deterministic fallback to the
 *   engine's default arm (matches Phase 3.6 default weights).
 * - When enabled, performs Thompson Sampling over candidate arms.
 */
export async function selectBanditArm(input: {
  decision: RolloutDecision
  userId?: string
  sessionId?: string
  requestId: string
  segment?: SegmentKey
}): Promise<ArmSelection> {
  const { decision, requestId } = input
  const segment: SegmentKey = input.segment ?? "global"

  // Hard pre-condition: if RolloutController is rolling back, never override.
  if (rolloutController.shouldShortCircuit() || decision.engine === "review" && decision.decisionPath === "ROLLBACK") {
    return {
      armId: "review_only",
      weightConfig: { timeline: 0, review: 1 },
      scoringEngine: "review",
      sampledValue: 0,
      alpha: 1,
      beta: 1,
      segment,
      source: "FALLBACK_REVIEW",
      candidates: ["review_only"],
      forced: false,
    }
  }

  const enabled = await isBanditEnabled()
  const candidates = candidateArmsForEngine(decision.engine)

  // Fallback path — bandit disabled or AB is the authoritative source.
  if (!enabled) {
    const fallback = candidates[0]
    return {
      armId: fallback,
      weightConfig: decision.timelineWeight > 0
        ? { timeline: decision.timelineWeight, review: decision.reviewWeight }
        : { timeline: 0, review: 1 },
      scoringEngine: decision.engine,
      sampledValue: 0,
      alpha: 1,
      beta: 1,
      segment,
      source: decision.timelineWeight > 0 ? "FALLBACK_BLEND" : "FALLBACK_REVIEW",
      candidates,
      forced: false,
    }
  }

  // Forced-exploration hook (Phase 3.8.1): if any candidate arm is below
  // its minimum exposure quota, force-select the most-deprived arm.  This
  // is a *soft* override — we still record the choice with source =
  // "FORCED_EXPLORATION" so it is fully auditable.
  let forcedArmId: string | null = null
  try {
    const { forcedArms } = await identifyForcedExplorationArms({
      candidateArms: candidates,
      segment,
    })
    if (forcedArms.length > 0) forcedArmId = forcedArms[0]
  } catch (err) {
    // Forced exploration is best-effort; if it fails we fall through to
    // the standard Thompson sampling path.
    console.error("[BanditPolicy] forced exploration check failed:", (err as Error).message)
  }

  // Thompson sampling path
  const states = await getBanditState(candidates, segment)
  const stateMap = new Map(states.map((s) => [s.arm_id, s]))

  // Fetch arm metadata for the candidates
  const arms = await listActiveArms()
  const armMap = new Map(arms.map((a) => [a.arm_id, a]))

  let best: { armId: string; sample: number; alpha: number; beta: number; forced: boolean } | null = null

  // If we have a forced arm, short-circuit the Thompson sampling
  // and use that arm with a synthetic sample = posterior mean.
  if (forcedArmId) {
    const state = stateMap.get(forcedArmId)
    const alpha = state?.alpha ?? 1
    const beta = state?.beta ?? 1
    const meanSample = alpha / (alpha + beta)
    best = { armId: forcedArmId, sample: meanSample, alpha, beta, forced: true }
  } else {
    for (const armId of candidates) {
      const state = stateMap.get(armId)
      const alpha = state?.alpha ?? 1
      const beta = state?.beta ?? 1
      const sample = sampleBeta(alpha, beta)
      if (!best || sample > best.sample) {
        best = { armId, sample, alpha, beta, forced: false }
      }
    }
  }

  if (!best) {
    // Should not happen — candidates is non-empty by construction.
    const fallback = candidates[0]
    return {
      armId: fallback,
      weightConfig: { timeline: decision.timelineWeight, review: decision.reviewWeight },
      scoringEngine: decision.engine,
      sampledValue: 0,
      alpha: 1,
      beta: 1,
      segment,
      source: "FALLBACK_BLEND",
      candidates,
      forced: false,
    }
  }

  const arm = armMap.get(best.armId)
  const weightConfig = arm?.weight_config ?? { timeline: decision.timelineWeight, review: decision.reviewWeight }

  const selection: ArmSelection = {
    armId: best.armId,
    weightConfig,
    scoringEngine: decision.engine,
    sampledValue: best.sample,
    alpha: best.alpha,
    beta: best.beta,
    segment,
    source: best.forced ? "FORCED_EXPLORATION" : "BANDIT",
    candidates,
    forced: best.forced,
  }

  // Record exposure for the selected arm (best-effort).
  void recordArmExposure({ armId: best.armId, segment }).catch(() => {})

  // Observability
  recordBanditEvent({
    type: "ARM_SELECTED",
    armId: best.armId,
    segment,
    sampledValue: best.sample,
    requestId,
    metadata: { forced: best.forced },
  })

  return selection
}

// ─── Reward Recording ──────────────────────────────────────────────────────

/**
 * Update Beta posterior for an arm after observing a reward.
 * α += reward, β += (1 - reward).  Reward must be in [0, 1].
 *
 * Returns the new state row for downstream logging.
 */
export async function recordBanditReward(input: {
  armId: string
  reward: number
  segment?: SegmentKey
  requestId: string
  userId?: string
  sessionId?: string
  rewardComponents?: Record<string, number | string>
  traceId?: string
}): Promise<BanditStateSnapshot | null> {
  const reward = clamp01(input.reward)
  const segment: SegmentKey = input.segment ?? "global"

  const supabase = await createClient()
  // Fetch current state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase as any)
    .from("bandit_state")
    .select("*")
    .eq("arm_id", input.armId)
    .eq("segment", segment)
    .single()

  const cur = current as {
    alpha: number
    beta: number
    total_pulls: number
    total_reward: number
    cumulative_regret: number
  } | null

  const newAlpha = (cur?.alpha ?? 1) + reward
  const newBeta = (cur?.beta ?? 1) + (1 - reward)
  const newTotalPulls = (cur?.total_pulls ?? 0) + 1
  const newTotalReward = (cur?.total_reward ?? 0) + reward

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase as any)
    .from("bandit_state")
    .update({
      alpha: newAlpha,
      beta: newBeta,
      total_pulls: newTotalPulls,
      total_reward: newTotalReward,
      last_pulled_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    })
    .eq("arm_id", input.armId)
    .eq("segment", segment)
    .select("*")
    .single()

  if (error) {
    console.error("[BanditPolicy] Failed to update state:", error.message)
    return null
  }

  // Persist the individual reward event (for offline replay / counterfactual)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("bandit_rewards").insert({
    request_id: input.requestId,
    arm_id: input.armId,
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    segment,
    reward,
    reward_components: input.rewardComponents ?? {},
    trace_id: input.traceId ?? null,
  })

  const snapshot: BanditStateSnapshot = {
    arm_id: input.armId,
    segment,
    alpha: newAlpha,
    beta: newBeta,
    total_pulls: newTotalPulls,
    total_reward: newTotalReward,
    cumulative_regret: cur?.cumulative_regret ?? 0,
    mean_reward: newTotalPulls > 0 ? newTotalReward / newTotalPulls : 0,
  }

  recordBanditEvent({
    type: "REWARD_RECORDED",
    armId: input.armId,
    segment,
    sampledValue: reward,
    requestId: input.requestId,
    reward,
  })

  return snapshot
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}
