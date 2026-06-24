// =============================================
// Phase 3.8: Bandit Observability
// Timeline First Architecture — Metric Emission
// =============================================
// Emits and aggregates the metrics required by the Phase 3.8 spec:
//
//   - bandit_arm_selection_distribution
//   - reward_trend_per_arm
//   - exploration_rate_over_time
//   - strategy_performance_delta
//   - auto_weight_adjustment_events
//   - counterfactual_lift_estimates
//
// Implementation follows the same pattern as shadow-observability.ts:
//   - In-memory event log (bounded buffer)
//   - Aggregation by metric type
//   - resetBanditMetrics() for test/operator use

// ─── Event Types ───────────────────────────────────────────────────────────

export type BanditEventType =
  | "ARM_SELECTED"
  | "REWARD_RECORDED"
  | "WEIGHT_ADJUSTED"
  | "EXPLORATION_PAUSED"
  | "EXPLORATION_RESUMED"
  | "ROLLBACK_TRIGGERED"
  | "STRATEGY_CREATED"
  | "STRATEGY_STATUS_CHANGED"
  | "STRATEGY_ROLLBACK"
  | "NEARLINE_LOOP_COMPLETED"
  | "OFFLINE_LOOP_COMPLETED"
  | "COUNTERFACTUAL_EVALUATED"

export interface BanditEvent {
  type: BanditEventType
  armId: string
  segment: string
  sampledValue: number
  reward?: number
  requestId: string
  metadata?: Record<string, unknown>
  timestamp: number
}

// ─── In-Memory Storage ─────────────────────────────────────────────────────

const eventBuffer: BanditEvent[] = []
const MAX_BUFFER = 5_000

let sessionStart = Date.now()

// Aggregates (live, in-memory)
const armSelectionCount = new Map<string, number>()
const armRewardSum = new Map<string, number>()
const armRewardCount = new Map<string, number>()
let totalSelections = 0
let totalRewards = 0
let weightAdjustmentCount = 0
let counterfactualCount = 0
let nearlineLoopCount = 0
let offlineLoopCount = 0

// ─── Recording ─────────────────────────────────────────────────────────────

export function recordBanditEvent(input: Omit<BanditEvent, "timestamp">): void {
  const event: BanditEvent = { ...input, timestamp: Date.now() }

  // Maintain bounded buffer
  if (eventBuffer.length >= MAX_BUFFER) {
    eventBuffer.shift()
  }
  eventBuffer.push(event)

  // Update live aggregates
  totalSelections++
  armSelectionCount.set(event.armId, (armSelectionCount.get(event.armId) ?? 0) + 1)

  if (event.type === "REWARD_RECORDED" && typeof event.reward === "number") {
    totalRewards++
    armRewardSum.set(event.armId, (armRewardSum.get(event.armId) ?? 0) + event.reward)
    armRewardCount.set(event.armId, (armRewardCount.get(event.armId) ?? 0) + 1)
  }
  if (event.type === "WEIGHT_ADJUSTED") weightAdjustmentCount++
  if (event.type === "COUNTERFACTUAL_EVALUATED") counterfactualCount++
  if (event.type === "NEARLINE_LOOP_COMPLETED") nearlineLoopCount++
  if (event.type === "OFFLINE_LOOP_COMPLETED") offlineLoopCount++
}

// ─── Metrics Snapshot ──────────────────────────────────────────────────────

export interface BanditMetricsSnapshot {
  // arm_selection_distribution — {arm_id: count}
  bandit_arm_selection_distribution: Record<string, number>
  // reward_trend_per_arm — {arm_id: {mean_reward, count}}
  reward_trend_per_arm: Record<string, { mean_reward: number; count: number }>
  // exploration_rate_over_time — fraction of selections that were not the deterministic fallback
  exploration_rate_over_time: number
  // strategy_performance_delta — naive per-arm lift vs review_only
  strategy_performance_delta: Record<string, number>
  // auto_weight_adjustment_events — count of applied weight adjustments
  auto_weight_adjustment_events: number
  // counterfactual_lift_estimates — count of completed evaluations
  counterfactual_lift_estimates: number
  // session metadata
  session_start: string
  uptime_seconds: number
  total_selections: number
  total_rewards: number
  nearline_loop_count: number
  offline_loop_count: number
  recent_events: BanditEvent[]
}

export function getBanditMetrics(): BanditMetricsSnapshot {
  const distribution: Record<string, number> = {}
  for (const [arm, count] of armSelectionCount.entries()) {
    distribution[arm] = count
  }

  const trends: Record<string, { mean_reward: number; count: number }> = {}
  for (const [arm, sum] of armRewardSum.entries()) {
    const count = armRewardCount.get(arm) ?? 0
    trends[arm] = {
      mean_reward: count > 0 ? sum / count : 0,
      count,
    }
  }

  // Exploration rate: fraction of selections that came from a non-deterministic source.
  // We approximate this as 1 - (review_only selections / total selections).
  const reviewOnly = armSelectionCount.get("review_only") ?? 0
  const explorationRate = totalSelections > 0 ? 1 - reviewOnly / totalSelections : 0

  // Strategy performance delta: per-arm lift relative to review_only.
  const reviewMean = trends["review_only"]?.mean_reward ?? 0
  const deltas: Record<string, number> = {}
  for (const [arm, t] of Object.entries(trends)) {
    if (arm === "review_only") continue
    deltas[arm] = t.mean_reward - reviewMean
  }

  return {
    bandit_arm_selection_distribution: distribution,
    reward_trend_per_arm: trends,
    exploration_rate_over_time: round4(explorationRate),
    strategy_performance_delta: deltas,
    auto_weight_adjustment_events: weightAdjustmentCount,
    counterfactual_lift_estimates: counterfactualCount,
    session_start: new Date(sessionStart).toISOString(),
    uptime_seconds: Math.round((Date.now() - sessionStart) / 1000),
    total_selections: totalSelections,
    total_rewards: totalRewards,
    nearline_loop_count: nearlineLoopCount,
    offline_loop_count: offlineLoopCount,
    recent_events: eventBuffer.slice(-50),
  }
}

// ─── Reset (for tests / operator) ──────────────────────────────────────────

export function resetBanditMetrics(): void {
  eventBuffer.length = 0
  armSelectionCount.clear()
  armRewardSum.clear()
  armRewardCount.clear()
  totalSelections = 0
  totalRewards = 0
  weightAdjustmentCount = 0
  counterfactualCount = 0
  nearlineLoopCount = 0
  offlineLoopCount = 0
  sessionStart = Date.now()
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function round4(v: number): number {
  return Math.round(v * 10000) / 10000
}
