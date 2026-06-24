// =============================================
// Phase 3.6: Decision Trace Logger
// Fix #5: Per-request decision audit trail
// =============================================
// Records WHY each request chose its scoring path for:
// - Debugging recommendation issues
// - Explaining A/B group assignments
// - Verifying rollback behavior
// - Offline replay and analysis

import { createClient } from "@/lib/supabase/server"
import type { DecisionPath } from "@/lib/timeline/rollout-controller"

export interface DecisionTraceEntry {
  requestId: string
  userId?: string
  decisionPath: DecisionPath
  hashBucket: number | null
  hashSource: string
  rolloutPercent: number
  abGroup: string | null
  latencyMs: number
  scoringPathSteps?: string[]
  finalScoreSource?: string
}

// In-memory buffer for batch inserts (reduces DB writes)
const traceBuffer: DecisionTraceEntry[] = []
const MAX_BUFFER_SIZE = 50
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL_MS = 5_000 // Flush every 5s

/**
 * Log a decision trace entry.
 * Buffered for performance — flushed every 5s or when buffer is full.
 */
export function logDecision(entry: DecisionTraceEntry): void {
  traceBuffer.push(entry)

  if (traceBuffer.length >= MAX_BUFFER_SIZE) {
    flushDecisionTraces()
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushDecisionTraces, FLUSH_INTERVAL_MS)
  }
}

/**
 * Force flush all buffered traces to DB.
 */
export async function flushDecisionTraces(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  if (traceBuffer.length === 0) return

  const entries = [...traceBuffer]
  traceBuffer.length = 0

  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("decision_trace_log")
      .insert(
        entries.map((e) => ({
          request_id: e.requestId,
          user_id: e.userId || null,
          decision_path: e.decisionPath,
          hash_bucket: e.hashBucket,
          hash_source: e.hashSource,
          rollout_percent: e.rolloutPercent,
          ab_group: e.abGroup,
          latency_ms: e.latencyMs,
          scoring_path_steps: e.scoringPathSteps ?? [],
          final_score_source: e.finalScoreSource,
        }))
      )

    if (error) {
      console.error("[DecisionTrace] Failed to flush traces:", error.message)
    }
  } catch (err) {
    console.error("[DecisionTrace] Flush error:", (err as Error).message)
  }
}

/**
 * Query decision traces for analysis.
 */
export async function queryDecisionTraces(filters: {
  userId?: string
  decisionPath?: DecisionPath
  limit?: number
  hoursAgo?: number
}): Promise<unknown[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("decision_trace_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100)

  if (filters.userId) {
    query = query.eq("user_id", filters.userId)
  }
  if (filters.decisionPath) {
    query = query.eq("decision_path", filters.decisionPath)
  }
  if (filters.hoursAgo) {
    const cutoff = new Date(Date.now() - filters.hoursAgo * 3600_000).toISOString()
    query = query.gte("created_at", cutoff)
  }

  const { data } = await query
  return data ?? []
}

/**
 * Get decision path distribution for a time window.
 */
export async function getDecisionPathDistribution(hoursAgo = 24): Promise<Record<string, number>> {
  const traces = await queryDecisionTraces({ hoursAgo, limit: 10_000 })
  const distribution: Record<string, number> = {}

  for (const trace of traces as Array<{ decision_path: string }>) {
    const path = trace.decision_path
    distribution[path] = (distribution[path] ?? 0) + 1
  }

  return distribution
}
