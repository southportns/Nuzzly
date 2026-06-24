// =============================================
// Phase 3.8.1: Delayed Reward Proxy
// Timeline First Architecture — Long-Term Signal Layer
// =============================================
// Closes the long-term alignment gap in Phase 3.8's reward function.
// While the base reward (CTR / conversion / dwell / bounce / skip)
// captures *immediate* engagement, this module adds three long-term
// proxies that arrive days-to-weeks after the impression:
//
//   - retention_d7        — did the user return within 7 days?
//   - revisit             — did the user click the same product again?
//   - session_continuity  — did the user continue browsing after the click?
//
// Why this matters:
//   Without long-term signal, a bandit will over-exploit the highest-CTR
//   arm and converge to "clickbait" strategies that hurt retention.
//   Adding a 7-day proxy weight (default 0.3) re-aligns the gradient.
//
// Workflow:
//   1. Real-world: server-side batch job ingests user activity events
//      (returns, revisits, sessions) and inserts into delayed_rewards.
//   2. computeDelayedRewardProxy() aggregates the table per (arm, segment).
//   3. reward-function combines base reward + delayed proxy.
//   4. applyDelayedRewards() writes Beta posterior updates for arms with
//      sufficient unapplied rows.

import { createClient } from "@/lib/supabase/server"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"
import { getFlag, FLAG_KEYS } from "@/lib/timeline/feature-flags"
import { recordBanditReward } from "@/lib/timeline/bandit-policy"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"

// ─── Types ─────────────────────────────────────────────────────────────────

export type DelayedEventType = "retention_d7" | "revisit" | "session_continuity" | "repeat_purchase" | "subscriber_keep"

export interface DelayedRewardConfig {
  enabled: boolean
  /** How much the delayed proxy contributes to final reward (default 0.3). */
  weight: number
  /** Default retention lookback window in days (default 7). */
  retentionWindowDays: number
  /** Maximum age of delayed events to consider (default 30). */
  maxLookbackDays: number
}

export interface DelayedProxyComponents {
  retention_d7: number
  revisit: number
  session_continuity: number
  sampleSize: number
}

export interface DelayedProxyResult {
  armId: string
  segment: SegmentKey
  proxyReward: number
  components: DelayedProxyComponents
  windowStart: string
  windowEnd: string
}

export interface DelayedRewardRow {
  id: string
  request_id: string
  arm_id: string
  user_id: string | null
  segment: string
  event_type: DelayedEventType
  event_value: number
  lookback_days: number
  applied_to_bandit: boolean
  created_at: string
}

// ─── Config Loading ────────────────────────────────────────────────────────

export const DEFAULT_DELAYED_CONFIG: DelayedRewardConfig = {
  enabled: true,
  weight: 0.3,
  retentionWindowDays: 7,
  maxLookbackDays: 30,
}

export async function loadDelayedConfig(): Promise<DelayedRewardConfig> {
  try {
    const flag = await getFlag(FLAG_KEYS.BANDIT_DELAYED_REWARD ?? ("bandit_delayed_reward" as any))
    return {
      enabled: flag.enabled !== false,
      weight: typeof flag.weight === "number" ? flag.weight : DEFAULT_DELAYED_CONFIG.weight,
      retentionWindowDays:
        typeof flag.retention_window_days === "number"
          ? flag.retention_window_days
          : DEFAULT_DELAYED_CONFIG.retentionWindowDays,
      maxLookbackDays:
        typeof flag.max_lookback_days === "number" ? flag.max_lookback_days : DEFAULT_DELAYED_CONFIG.maxLookbackDays,
    }
  } catch {
    return DEFAULT_DELAYED_CONFIG
  }
}

// ─── Event Recording ──────────────────────────────────────────────────────

/**
 * Record a delayed reward event (called by retention-tracking batch job
 * or test code).  Each event is one (request, arm, event_type) tuple.
 */
export async function addDelayedRewardEvent(input: {
  requestId: string
  armId: string
  userId?: string
  sessionId?: string
  segment?: SegmentKey
  eventType: DelayedEventType
  eventValue: number
  lookbackDays: number
}): Promise<DelayedRewardRow | null> {
  const value = clamp01(input.eventValue)
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data, error } = await (supabase as any)
    .from("delayed_rewards")
    .insert({
      request_id: input.requestId,
      arm_id: input.armId,
      user_id: input.userId ?? null,
      session_id: input.sessionId ?? null,
      segment: input.segment ?? "global",
      event_type: input.eventType,
      event_value: value,
      lookback_days: input.lookbackDays,
      window_start: new Date(Date.now() - input.lookbackDays * 86400_000).toISOString(),
      window_end: new Date().toISOString(),
    })
    .select("*")
    .single()
  if (error || !data) return null
  return data as DelayedRewardRow
}

// ─── Proxy Computation ────────────────────────────────────────────────────

/**
 * Compute the delayed-reward proxy for one arm in a segment.
 * Aggregates delayed_rewards over [windowEnd - maxLookbackDays, windowEnd].
 * Returns a value in [0, 1] and the per-component breakdown.
 *
 * When the table is empty (no real tracking data yet), returns 0.5
 * (neutral proxy — no adjustment to the bandit).
 */
export async function computeDelayedRewardProxy(input: {
  armId: string
  segment?: SegmentKey
  lookbackDays?: number
  config?: Partial<DelayedRewardConfig>
}): Promise<DelayedProxyResult> {
  const segment: SegmentKey = input.segment ?? "global"
  const config: DelayedRewardConfig = { ...DEFAULT_DELAYED_CONFIG, ...(input.config ?? {}) }
  const lookbackDays = Math.min(input.lookbackDays ?? config.maxLookbackDays, config.maxLookbackDays)
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - lookbackDays * 86400_000)
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data: rows, error } = await (supabase as any)
    .from("delayed_rewards")
    .select("event_type, event_value, created_at")
    .eq("arm_id", input.armId)
    .eq("segment", segment)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())

  if (error) {
    console.error("[DelayedProxy] query failed:", error.message)
  }

  const arr = (rows ?? []) as Array<{ event_type: DelayedEventType; event_value: number; created_at: string }>
  const components: DelayedProxyComponents = {
    retention_d7: 0,
    revisit: 0,
    session_continuity: 0,
    sampleSize: arr.length,
  }

  if (arr.length === 0) {
    return {
      armId: input.armId,
      segment,
      proxyReward: 0.5,
      components,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    }
  }

  // Mean per event type
  const sums = { retention_d7: 0, revisit: 0, session_continuity: 0 }
  const counts = { retention_d7: 0, revisit: 0, session_continuity: 0 }
  for (const r of arr) {
    if (r.event_type in sums) {
      sums[r.event_type as keyof typeof sums] += r.event_value
      counts[r.event_type as keyof typeof counts]++
    }
  }
  components.retention_d7 = counts.retention_d7 > 0 ? sums.retention_d7 / counts.retention_d7 : 0
  components.revisit = counts.revisit > 0 ? sums.revisit / counts.revisit : 0
  components.session_continuity = counts.session_continuity > 0 ? sums.session_continuity / counts.session_continuity : 0

  // Weighted composite (retention > revisit > session)
  const proxyReward = clamp01(0.5 * components.retention_d7 + 0.3 * components.revisit + 0.2 * components.session_continuity)

  return {
    armId: input.armId,
    segment,
    proxyReward,
    components,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  }
}

// ─── Apply to Bandit Posterior ────────────────────────────────────────────

/**
 * Apply all unapplied delayed-reward events to the bandit's Beta posterior.
 * Each event contributes a (reward = event_value) update.
 * Returns the number of rows applied.
 *
 * NOTE: We blend the delayed reward with the original short-term reward
 * using the configured weight, so the bandit doesn't completely re-learn
 * from the long-term signal alone.
 */
export async function applyDelayedRewards(input: {
  blendWeight?: number
  segment?: SegmentKey
  limit?: number
}): Promise<{ applied: number; skipped: number }> {
  const supabase = await createClient()
  const limit = input.limit ?? 500
  const blendWeight = input.blendWeight ?? 0.5

  // Fetch unapplied rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("delayed_rewards")
    .select("id, request_id, arm_id, event_value, segment")
    .eq("applied_to_bandit", false)
    .limit(limit)

  if (error) {
    console.error("[DelayedProxy] apply query failed:", error.message)
    return { applied: 0, skipped: 0 }
  }

  const arr = (rows ?? []) as Array<{ id: string; request_id: string; arm_id: string; event_value: number; segment: string }>
  if (arr.length === 0) return { applied: 0, skipped: 0 }

  let applied = 0
  let skipped = 0

  for (const row of arr) {
    // Blend the delayed signal with a neutral 0.5 to dampen variance.
    const blended = clamp01(blendWeight * Number(row.event_value) + (1 - blendWeight) * 0.5)

    const result = await recordBanditReward({
      armId: row.arm_id,
      reward: blended,
      requestId: row.request_id,
      segment: (row.segment as SegmentKey) ?? "global",
      rewardComponents: { source: "delayed_reward", raw: Number(row.event_value), blended },
    })

    if (result) {
      // eslint-disable-next-line @typescript-eslint/no-explicitany
      await (supabase as any)
        .from("delayed_rewards")
        .update({ applied_to_bandit: true, applied_at: new Date().toISOString() })
        .eq("id", row.id)
      applied++
    } else {
      skipped++
    }
  }

  recordBanditEvent({
    type: "REWARD_RECORDED",
    armId: "all",
    segment: "global",
    sampledValue: 0,
    requestId: `delayed-apply-${Date.now()}`,
    metadata: { applied, skipped, source: "delayed_rewards" },
  })

  return { applied, skipped }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}
