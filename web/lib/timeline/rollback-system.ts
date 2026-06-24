// =============================================
// Phase 3.6: Rollback System
// Timeline First Architecture — Safe Rollback Mechanism
// =============================================
// Supports:
// - Instant global rollback → Review Score only
// - Partial rollback → reduce Timeline traffic %
// - Automatic rollback trigger hooks (based on error rate / latency / score anomalies)

import { createClient } from "@/lib/supabase/server"
import { rolloutController } from "@/lib/timeline/rollout-controller"
import { FLAG_KEYS, updateFlag } from "@/lib/timeline/feature-flags"
import { getShadowMetrics } from "@/lib/timeline/shadow-observability"

// ─── Rollback Types ─────────────────────────────────────────────────────────

export type RollbackType = "full" | "partial" | "auto"

export interface RollbackResult {
  success: boolean
  previousPhase: string
  newPhase: string
  previousTrafficPct: number
  newTrafficPct: number
  reason: string
  triggeredBy: RollbackType
  timestamp: string
}

export interface RollbackThresholds {
  failureRatePct: number
  latencyP95Ms: number
  scoreDriftThreshold: number
}

// ─── Rollback Controller ────────────────────────────────────────────────────

export async function executeRollback(
  reason: string,
  type: RollbackType = "full"
): Promise<RollbackResult> {
  const supabase = await createClient()

  // Get current state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentState } = await (supabase as any).rpc("get_rollout_status")
  const previousPhase = currentState?.current_phase ?? "unknown"
  const previousTrafficPct = currentState?.timeline_traffic_pct ?? 0

  if (type === "full") {
    // Full rollback: disable Timeline completely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("execute_rollback", {
      p_reason: reason,
    })

    if (error) {
      throw new Error(`Rollback failed: ${error.message}`)
    }

    // Clear rollout controller cache + activate short-circuit
    rolloutController.clearCache()
    rolloutController.setRollbackActive(true)

    return {
      success: true,
      previousPhase,
      newPhase: "rolled_back",
      previousTrafficPct,
      newTrafficPct: 0,
      reason,
      triggeredBy: type,
      timestamp: new Date().toISOString(),
    }
  } else {
    // Partial rollback: reduce to 10%
    const newPercentage = type === "auto" ? 10 : Math.max(0, previousTrafficPct - 20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("update_rollout_percentage", {
      p_percentage: newPercentage,
      p_reason: reason,
    })

    rolloutController.clearCache()

    return {
      success: true,
      previousPhase,
      newPhase: data?.current_phase ?? "partial",
      previousTrafficPct,
      newTrafficPct: newPercentage,
      reason,
      triggeredBy: type,
      timestamp: new Date().toISOString(),
    }
  }
}

// ─── Automatic Rollback Checker ─────────────────────────────────────────────

export async function checkAndAutoRollback(): Promise<RollbackResult | null> {
  const metrics = getShadowMetrics()

  // Check if enough data
  const total = metrics.timeline_used_count + metrics.review_fallback_count
  if (total < 50) return null // Not enough data

  // Get thresholds
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: thresholdsData } = await (supabase as any)
    .from("feature_flags")
    .select("flag_value")
    .eq("flag_key", FLAG_KEYS.AUTO_ROLLBACK_THRESHOLDS)
    .single()

  const thresholds: RollbackThresholds = {
    failureRatePct: thresholdsData?.flag_value?.failure_rate_pct ?? 5,
    latencyP95Ms: thresholdsData?.flag_value?.latency_p95_ms ?? 3000,
    scoreDriftThreshold: thresholdsData?.flag_value?.score_drift_threshold ?? 30,
  }

  // Check failure rate
  const failureRate = (metrics.review_fallback_count / total) * 100
  if (failureRate > thresholds.failureRatePct) {
    return executeRollback(
      `Auto-rollback: failure rate ${failureRate.toFixed(1)}% > ${thresholds.failureRatePct}%`,
      "auto"
    )
  }

  // Check latency
  if (metrics.scoring_latency_ms.p95 > thresholds.latencyP95Ms) {
    return executeRollback(
      `Auto-rollback: P95 latency ${metrics.scoring_latency_ms.p95}ms > ${thresholds.latencyP95Ms}ms`,
      "auto"
    )
  }

  // Check score drift
  const avgDelta = metrics.timeline_vs_review_delta.avg ?? 0
  if (Math.abs(avgDelta) > thresholds.scoreDriftThreshold) {
    return executeRollback(
      `Auto-rollback: score drift ${avgDelta.toFixed(1)} > ${thresholds.scoreDriftThreshold}`,
      "auto"
    )
  }

  return null
}

// ─── Rollback History ───────────────────────────────────────────────────────

export async function getRollbackHistory(limit = 20): Promise<unknown[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("rollout_event_log")
    .select("*")
    .in("event_type", ["rollback", "auto_rollback"])
    .order("created_at", { ascending: false })
    .limit(limit)

  return data ?? []
}
