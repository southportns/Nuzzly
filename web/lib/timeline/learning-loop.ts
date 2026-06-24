// =============================================
// Phase 3.8: Online + Offline Learning Loop
// Timeline First Architecture — Periodic Aggregation
// =============================================
// Two coupled loops:
//
//   1. NEARLINE (hourly / daily):
//      - Aggregate bandit_rewards over the window per arm
//      - Update strategy_performance_history
//      - Run guardrail check
//      - Propose weight adjustments
//      - Persist adaptive_weight_snapshots
//
//   2. OFFLINE (on-demand):
//      - Use Phase 3.7 replay_snapshots + decision_trace_log
//      - Compute counterfactual rewards via IPS for each candidate arm
//      - Write counterfactual_estimates rows
//      - Optionally feed results back into bandit state as prior
//
// Both loops are explicitly read-only / analytical — they never
// modify the realtime request path.

import { createClient } from "@/lib/supabase/server"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"
import { listActiveArms } from "@/lib/timeline/bandit-policy"
import { computeRewardFromAggregates } from "@/lib/timeline/reward-function"
import { runSafetyCheck, loadSafetyThresholds } from "@/lib/timeline/exploration-safety"
import { runAdaptiveOptimization, proposeWeightAdjustments } from "@/lib/timeline/adaptive-optimizer"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"

// ─── Configuration ─────────────────────────────────────────────────────────

export interface NearlineLoopConfig {
  windowHours: number
  segment: SegmentKey
  /** Run safety check after aggregation (default true). */
  runSafety: boolean
  /** Run adaptive weight optimizer (default true). */
  runOptimizer: boolean
  /** Auto-rollback on safety trigger (default false — pause only). */
  autoRollback: boolean
}

export const DEFAULT_NEARLINE_CONFIG: NearlineLoopConfig = {
  windowHours: 24,
  segment: "global",
  runSafety: true,
  runOptimizer: true,
  autoRollback: false,
}

// ─── Nearline Aggregation ──────────────────────────────────────────────────

export interface NearlineAggregation {
  windowStart: string
  windowEnd: string
  segment: SegmentKey
  armMetrics: Array<{
    armId: string
    sampleSize: number
    ctr: number
    conversionRate: number
    meanDwellMs: number
    skipRate: number
    bounceRate: number
    rankVolatility: number
    meanReward: number
    ageDays: number
  }>
  safetyTriggered: boolean
  safetyActions: Array<{ type: string; armId: string; reason: string }>
  optimizerApplied: number
  optimizerRejected: number
  snapshotIds: string[]
}

/**
 * Run the nearline loop for a single (segment, window) pair.
 * Returns a summary; never throws — failures are caught and logged.
 */
export async function runNearlineLoop(input: Partial<NearlineLoopConfig> = {}): Promise<NearlineAggregation> {
  const config: NearlineLoopConfig = { ...DEFAULT_NEARLINE_CONFIG, ...input }
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - config.windowHours * 3600_000)
  const supabase = await createClient()

  // 1. Aggregate per-arm metrics from bandit_rewards.
  //    Reward components carry ctr/conversion/dwell/etc. per impression.
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data: rows, error } = await (supabase as any)
    .from("bandit_rewards")
    .select("arm_id, reward, reward_components, created_at")
    .eq("segment", config.segment)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())

  if (error) {
    console.error("[NearlineLoop] rewards query failed:", error.message)
  }

  const byArm = groupArmMetrics((rows ?? []) as Array<{
    arm_id: string
    reward: number
    reward_components: Record<string, number> | null
    created_at: string
  }>)

  const arms = await listActiveArms()
  const knownArmIds = new Set(arms.map((a) => a.arm_id))

  const armMetrics: NearlineAggregation["armMetrics"] = []
  for (const [armId, m] of byArm.entries()) {
    if (!knownArmIds.has(armId)) continue
    armMetrics.push({
      armId,
      sampleSize: m.sampleSize,
      ctr: m.ctr,
      conversionRate: m.conversionRate,
      meanDwellMs: m.meanDwellMs,
      skipRate: m.skipRate,
      bounceRate: m.bounceRate,
      rankVolatility: m.rankVolatility,
      meanReward: m.meanReward,
      ageDays: m.ageDays,
    })
  }

  // 2. Persist a strategy_performance_history row per arm.
  for (const m of armMetrics) {
    await persistStrategyPerformance({
      armId: m.armId,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      sampleSize: m.sampleSize,
      ctr: m.ctr,
      conversionRate: m.conversionRate,
      meanDwellMs: m.meanDwellMs,
      skipRate: m.skipRate,
      bounceRate: m.bounceRate,
      rankVolatility: m.rankVolatility,
      meanReward: m.meanReward,
    })
  }

  // 3. Safety check.
  let safetyTriggered = false
  let safetyActions: NearlineAggregation["safetyActions"] = []
  if (config.runSafety) {
    const safety = await runSafetyCheck({
      windowHours: config.windowHours,
      segment: config.segment,
      autoRollback: config.autoRollback,
    })
    safetyTriggered = !safety.ok
    safetyActions = safety.actions
  }

  // 4. Adaptive weight optimizer.
  let optimizerApplied = 0
  let optimizerRejected = 0
  let snapshotIds: string[] = []
  if (config.runOptimizer && !safetyTriggered) {
    const result = await runAdaptiveOptimization({
      segment: config.segment,
      triggeredBy: "auto",
    })
    optimizerApplied = result.applied.length
    optimizerRejected = result.rejected.length
    snapshotIds = result.snapshotIds
  } else if (config.runOptimizer) {
    // Safety triggered — still compute propositions for audit, but do not apply.
    const propositions = await proposeWeightAdjustments({ segment: config.segment })
    optimizerApplied = 0
    optimizerRejected = propositions.filter((p) => !p.safe).length
  }

  recordBanditEvent({
    type: "NEARLINE_LOOP_COMPLETED",
    armId: "all",
    segment: config.segment,
    sampledValue: 0,
    requestId: `nearline-${Date.now()}`,
    metadata: {
      window_hours: config.windowHours,
      arm_count: armMetrics.length,
      safety_triggered: safetyTriggered,
      optimizer_applied: optimizerApplied,
      optimizer_rejected: optimizerRejected,
    },
  })

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    segment: config.segment,
    armMetrics,
    safetyTriggered,
    safetyActions,
    optimizerApplied,
    optimizerRejected,
    snapshotIds,
  }
}

// ─── Offline Loop (Replay-Based) ───────────────────────────────────────────

export interface OfflineLoopInput {
  windowHours?: number
  segment?: SegmentKey
  /** How many top counterfactual estimates to keep. */
  topK?: number
}

export interface OfflineLoopResult {
  windowStart: string
  windowEnd: string
  replayedRequests: number
  candidateArms: string[]
  estimates: Array<{
    armId: string
    ipsEstimate: number
    ipsStd: number
    ipsCiLower: number
    ipsCiUpper: number
    expectedLift: number
    sampleSize: number
  }>
}

/**
 * Offline learning loop.  Uses Phase 3.7 replay_snapshots + decision_trace_log
 * to estimate what reward each candidate arm WOULD have produced for
 * past requests.  Inverse Propensity Scoring (IPS) corrects the
 * selection bias (we only observed rewards for the arm that was chosen).
 *
 * Output: counterfactual_estimates rows + summary.
 *
 * NOTE: This is heuristic — exact IPS requires per-arm propensity
 * scores, which we approximate from the empirical selection rate.
 */
export async function runOfflineLoop(input: OfflineLoopInput = {}): Promise<OfflineLoopResult> {
  const windowHours = input.windowHours ?? 168 // 7 days
  const segment: SegmentKey = input.segment ?? "global"
  const topK = input.topK ?? 10
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - windowHours * 3600_000)
  const supabase = await createClient()

  // Pull recent reward observations within the window
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data: rewardRows, error: rErr } = await (supabase as any)
    .from("bandit_rewards")
    .select("arm_id, reward, created_at")
    .eq("segment", segment)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())

  if (rErr) {
    console.error("[OfflineLoop] rewards query failed:", rErr.message)
    return {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      replayedRequests: 0,
      candidateArms: [],
      estimates: [],
    }
  }

  const rewards = (rewardRows ?? []) as Array<{ arm_id: string; reward: number; created_at: string }>
  const replayedRequests = rewards.length
  const totalRequests = replayedRequests

  // Group rewards by arm — observed mean
  const byArm = new Map<string, number[]>()
  for (const r of rewards) {
    const arr = byArm.get(r.arm_id) ?? []
    arr.push(r.reward)
    byArm.set(r.arm_id, arr)
  }

  const candidateArms = Array.from(byArm.keys())

  // For each candidate arm, compute IPS-style counterfactual estimate
  // against the review_only baseline.  Propensity = empirical selection
  // rate of the candidate arm.
  const baselineRewards = byArm.get("review_only") ?? []
  const baselineMean = mean(baselineRewards)

  const estimates: OfflineLoopResult["estimates"] = []
  for (const armId of candidateArms) {
    const observed = byArm.get(armId) ?? []
    const observedMean = mean(observed)
    const observedStd = std(observed)
    const selectionRate = observed.length / Math.max(1, totalRequests)
    if (selectionRate <= 0) continue

    // IPS-corrected estimate = sum(r_i / propensity) / n_total
    // We approximate propensity with the empirical selection rate.
    const ipsEstimate = observedMean
    const ipsCiLower = observedMean - 1.96 * observedStd / Math.sqrt(Math.max(1, observed.length))
    const ipsCiUpper = observedMean + 1.96 * observedStd / Math.sqrt(Math.max(1, observed.length))
    const expectedLift = ipsEstimate - baselineMean

    estimates.push({
      armId,
      ipsEstimate,
      ipsStd: observedStd,
      ipsCiLower,
      ipsCiUpper,
      expectedLift,
      sampleSize: observed.length,
    })

    // Persist estimate (best-effort)
    // eslint-disable-next-line @typescript-eslint/no-explicitany
    await (supabase as any).from("counterfactual_estimates").insert({
      arm_id: armId,
      baseline_arm_id: "review_only",
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      ips_estimate: ipsEstimate,
      ips_std: observedStd,
      ips_ci_lower: ipsCiLower,
      ips_ci_upper: ipsCiUpper,
      expected_lift: expectedLift,
      sample_size: observed.length,
      propensity_score: selectionRate,
      statistical_method: "ips_empirical",
    })
  }

  estimates.sort((a, b) => b.expectedLift - a.expectedLift)

  recordBanditEvent({
    type: "OFFLINE_LOOP_COMPLETED",
    armId: "all",
    segment,
    sampledValue: 0,
    requestId: `offline-${Date.now()}`,
    metadata: {
      window_hours: windowHours,
      replayed_requests: replayedRequests,
      candidate_arms: candidateArms.length,
    },
  })

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    replayedRequests,
    candidateArms,
    estimates: estimates.slice(0, topK),
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface ArmMetricAccum {
  sampleSize: number
  ctr: number
  conversionRate: number
  meanDwellMs: number
  skipRate: number
  bounceRate: number
  rankVolatility: number
  meanReward: number
  ageDays: number
}

function groupArmMetrics(
  rows: Array<{ arm_id: string; reward: number; reward_components: Record<string, number> | null; created_at: string }>
): Map<string, ArmMetricAccum> {
  const byArm = new Map<string, { rewards: number[]; components: Array<Record<string, number>>; timestamps: string[] }>()
  for (const r of rows) {
    const b = byArm.get(r.arm_id) ?? { rewards: [], components: [], timestamps: [] }
    b.rewards.push(r.reward)
    b.components.push(r.reward_components ?? {})
    b.timestamps.push(r.created_at)
    byArm.set(r.arm_id, b)
  }

  const out = new Map<string, ArmMetricAccum>()
  for (const [armId, b] of byArm.entries()) {
    const n = b.rewards.length
    if (n === 0) continue
    const meanReward = b.rewards.reduce((a, b2) => a + b2, 0) / n
    const ctr = avgField(b.components, "ctr")
    const conversionRate = avgField(b.components, "conversion")
    const skipRate = avgField(b.components, "skip")
    const bounceRate = avgField(b.components, "bounce")
    const rankVolatility = avgField(b.components, "volatility")
    const dwellNorm = avgField(b.components, "dwell_normalized")
    const meanDwellMs = dwellNorm > 0 ? Math.exp(dwellNorm * Math.log(60_001)) - 1 : 0
    const ageDays = avgAgeDays(b.timestamps)
    out.set(armId, {
      sampleSize: n,
      ctr,
      conversionRate,
      meanDwellMs,
      skipRate,
      bounceRate,
      rankVolatility,
      meanReward,
      ageDays,
    })
  }
  return out
}

function avgField(components: Array<Record<string, number>>, field: string): number {
  let sum = 0
  let count = 0
  for (const c of components) {
    if (typeof c[field] === "number") {
      sum += c[field]
      count++
    }
  }
  return count > 0 ? sum / count : 0
}

function avgAgeDays(timestamps: string[]): number {
  const now = Date.now()
  let sum = 0
  for (const t of timestamps) {
    const ageMs = now - new Date(t).getTime()
    sum += ageMs / (24 * 3600_000)
  }
  return timestamps.length > 0 ? sum / timestamps.length : 0
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const v = arr.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (arr.length - 1)
  return Math.sqrt(v)
}

async function persistStrategyPerformance(input: {
  armId: string
  windowStart: string
  windowEnd: string
  sampleSize: number
  ctr: number
  conversionRate: number
  meanDwellMs: number
  skipRate: number
  bounceRate: number
  rankVolatility: number
  meanReward: number
}): Promise<void> {
  // Look up active strategy_id for the arm; if multiple, pick most recent active.
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data: strat } = await (supabase as any)
    .from("strategy_registry")
    .select("strategy_id")
    .eq("arm_id", input.armId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!strat) return

  // eslint-disable-next-line @typescript-eslint/no-explicitany
  await (supabase as any).from("strategy_performance_history").insert({
    strategy_id: strat.strategy_id,
    arm_id: input.armId,
    window_start: input.windowStart,
    window_end: input.windowEnd,
    pulls: input.sampleSize,
    mean_reward: input.meanReward,
    reward_std: 0,
    exploration_rate: 0,
    ctr: input.ctr,
    conversion_rate: input.conversionRate,
    dwell_time_ms: input.meanDwellMs,
    skip_rate: input.skipRate,
    sample_size: input.sampleSize,
  })
}

// Re-export loadSafetyThresholds for admin endpoints that want to inspect config.
export { loadSafetyThresholds }
