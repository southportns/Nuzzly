// =============================================
// Phase 3.7: Rollback Root Cause Analyzer
// Timeline First Architecture — Automated Root Cause Diagnosis
// =============================================
// Purpose: Given a rollback event, identify the triggering metric,
//          reconstruct pre-rollback state, and correlate with system changes.

import { createClient } from "@/lib/supabase/server"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RootCauseCandidate {
  cause: string
  confidence: number       // 0-1
  evidence: string[]
  severity: "critical" | "high" | "medium" | "low"
  metricName: string
  metricValue: number
  threshold: number
}

export interface RollbackRootCauseResult {
  rollbackEventId: string
  rollbackReason: string
  rollbackType: string
  rollbackTime: string
  preRollbackState: {
    currentPhase: string
    timelineTrafficPct: number
    activeFlags: Record<string, unknown>
  }
  rootCauses: RootCauseCandidate[]
  correlatedEvents: Array<{
    eventType: string
    timestamp: string
    details: Record<string, unknown>
  }>
  evidenceTraces: Array<{
    requestId: string
    decisionPath: string
    latencyMs: number | null
    createdAt: string
  }>
  analyzedAt: string
  durationMs: number
}

export interface RootCauseInput {
  rollbackEventId?: string
  timeRangeHours?: number
}

// ─── Root Cause Analyzer ────────────────────────────────────────────────────

/**
 * Analyze a rollback event to identify root causes.
 *
 * Flow:
 * 1. Fetch rollback event from rollout_event_log
 * 2. Reconstruct pre-rollback state (flags, rollout %, phase)
 * 3. Analyze decision traces in the 1-hour window before rollback
 * 4. Correlate with: latency spikes, score drift, flag changes, traffic shifts
 * 5. Rank root causes by confidence
 */
export async function analyzeRollbackRootCause(input: RootCauseInput): Promise<RollbackRootCauseResult> {
  const t0 = performance.now()
  const supabase = await createClient()
  const timeRangeHours = input.timeRangeHours ?? 2

  // Step 1: Fetch rollback event
  let rollbackEvent: Record<string, unknown> | null = null

  if (input.rollbackEventId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("rollout_event_log")
      .select("*")
      .eq("id", input.rollbackEventId)
      .single()
    rollbackEvent = data
  }

  // If no specific event, get most recent rollback
  if (!rollbackEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("rollout_event_log")
      .select("*")
      .in("event_type", ["rollback", "auto_rollback"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    rollbackEvent = data
  }

  if (!rollbackEvent) {
    throw new Error("No rollback event found")
  }

  const rollbackTime = rollbackEvent.created_at as string
  const rollbackReason = (rollbackEvent.reason as string) ?? "Unknown"
  const rollbackType = (rollbackEvent.event_type as string) ?? "unknown"

  // Step 2: Reconstruct pre-rollback state
  const preRollbackState = await reconstructPreRollbackState(supabase, rollbackTime)

  // Step 3: Analyze decision traces before rollback
  const cutoffTime = new Date(new Date(rollbackTime).getTime() - timeRangeHours * 3600_000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: traces } = await (supabase as any)
    .from("decision_trace_log")
    .select("*")
    .gte("created_at", cutoffTime)
    .lte("created_at", rollbackTime)
    .order("created_at", { ascending: true })

  const evidenceTraces = (traces ?? []).slice(0, 50).map((t: Record<string, unknown>) => ({
    requestId: (t.request_id as string) ?? "",
    decisionPath: (t.decision_path as string) ?? "unknown",
    latencyMs: t.latency_ms as number | null,
    createdAt: (t.created_at as string) ?? "",
  }))

  // Step 4: Correlate with events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase as any)
    .from("rollout_event_log")
    .select("*")
    .gte("created_at", cutoffTime)
    .lte("created_at", rollbackTime)
    .order("created_at", { ascending: true })

  const correlatedEvents = (events ?? []).map((e: Record<string, unknown>) => ({
    eventType: (e.event_type as string) ?? "unknown",
    timestamp: (e.created_at as string) ?? "",
    details: (e.new_value as Record<string, unknown>) ?? {},
  }))

  // Step 5: Identify root causes
  const rootCauses = identifyRootCauses(traces ?? [], rollbackEvent, preRollbackState)

  const durationMs = Math.round(performance.now() - t0)

  return {
    rollbackEventId: (rollbackEvent.id as string) ?? "",
    rollbackReason,
    rollbackType,
    rollbackTime,
    preRollbackState,
    rootCauses,
    correlatedEvents,
    evidenceTraces,
    analyzedAt: new Date().toISOString(),
    durationMs,
  }
}

// ─── Internal Functions ─────────────────────────────────────────────────────

async function reconstructPreRollbackState(
  supabase: unknown,
  rollbackTime: string
): Promise<RollbackRootCauseResult["preRollbackState"]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: state } = await (supabase as any)
    .from("rollout_state")
    .select("*")
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: flags } = await (supabase as any)
    .from("feature_flags")
    .select("flag_key,flag_value")

  const activeFlags: Record<string, unknown> = {}
  for (const flag of flags ?? []) {
    activeFlags[flag.flag_key] = flag.flag_value
  }

  return {
    currentPhase: (state?.current_phase as string) ?? "unknown",
    timelineTrafficPct: (state?.timeline_traffic_pct as number) ?? 0,
    activeFlags,
  }
}

function identifyRootCauses(
  traces: Record<string, unknown>[],
  rollbackEvent: Record<string, unknown>,
  preRollbackState: RollbackRootCauseResult["preRollbackState"]
): RootCauseCandidate[] {
  const causes: RootCauseCandidate[] = []

  // Cause 1: Latency spike analysis
  const latencyCause = analyzeLatencySpike(traces)
  if (latencyCause) causes.push(latencyCause)

  // Cause 2: Fallback rate analysis
  const fallbackCause = analyzeFallbackRate(traces)
  if (fallbackCause) causes.push(fallbackCause)

  // Cause 3: Traffic composition change
  const trafficCause = analyzeTrafficChange(traces, preRollbackState)
  if (trafficCause) causes.push(trafficCause)

  // Cause 4: Flag change correlation
  const flagCause = analyzeFlagChange(rollbackEvent)
  if (flagCause) causes.push(flagCause)

  // Sort by confidence descending
  causes.sort((a, b) => b.confidence - a.confidence)

  return causes
}

function analyzeLatencySpike(traces: Record<string, unknown>[]): RootCauseCandidate | null {
  const latencies = traces
    .map((t) => t.latency_ms as number | null)
    .filter((l): l is number => l !== null && l > 0)

  if (latencies.length < 10) return null

  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
  const p95Index = Math.floor(latencies.length * 0.95)
  const sorted = [...latencies].sort((a, b) => a - b)
  const p95 = sorted[p95Index] ?? 0

  // Threshold: 3000ms
  const threshold = 3000
  if (p95 > threshold) {
    return {
      cause: "P95 latency exceeded threshold",
      confidence: Math.min(0.95, 0.5 + (p95 - threshold) / 5000),
      evidence: [
        `P95 latency: ${p95}ms (threshold: ${threshold}ms)`,
        `Average latency: ${Math.round(avg)}ms`,
        `Sample size: ${latencies.length} requests`,
      ],
      severity: p95 > threshold * 2 ? "critical" : "high",
      metricName: "latency_p95_ms",
      metricValue: p95,
      threshold,
    }
  }

  return null
}

function analyzeFallbackRate(traces: Record<string, unknown>[]): RootCauseCandidate | null {
  if (traces.length < 10) return null

  const fallbackCount = traces.filter(
    (t) => t.decision_path === "FALLBACK" || t.decision_path === "MASTER_OFF" || t.decision_path === "ROLLBACK"
  ).length

  const fallbackRate = (fallbackCount / traces.length) * 100
  const threshold = 5 // 5%

  if (fallbackRate > threshold) {
    return {
      cause: "High fallback rate detected",
      confidence: Math.min(0.95, 0.5 + (fallbackRate - threshold) / 20),
      evidence: [
        `Fallback rate: ${fallbackRate.toFixed(1)}% (threshold: ${threshold}%)`,
        `Fallback count: ${fallbackCount} / ${traces.length}`,
      ],
      severity: fallbackRate > threshold * 3 ? "critical" : "high",
      metricName: "fallback_rate_pct",
      metricValue: Math.round(fallbackRate * 100) / 100,
      threshold,
    }
  }

  return null
}

function analyzeTrafficChange(
  traces: Record<string, unknown>[],
  preRollbackState: RollbackRootCauseResult["preRollbackState"]
): RootCauseCandidate | null {
  const trafficPct = preRollbackState.timelineTrafficPct

  // If traffic was high (>50%) and rollback happened, traffic may be a factor
  if (trafficPct > 50) {
    const timelineCount = traces.filter(
      (t) => t.decision_path !== "FALLBACK" && t.decision_path !== "MASTER_OFF" && t.decision_path !== "ROLLBACK"
    ).length

    const timelineRate = (timelineCount / traces.length) * 100

    return {
      cause: `High Timeline traffic (${trafficPct}%) may have exposed issues`,
      confidence: Math.min(0.7, trafficPct / 200),
      evidence: [
        `Timeline traffic: ${trafficPct}%`,
        `Actual Timeline decisions: ${timelineRate.toFixed(1)}%`,
        `Phase: ${preRollbackState.currentPhase}`,
      ],
      severity: trafficPct > 80 ? "high" : "medium",
      metricName: "timeline_traffic_pct",
      metricValue: trafficPct,
      threshold: 50,
    }
  }

  return null
}

function analyzeFlagChange(rollbackEvent: Record<string, unknown>): RootCauseCandidate | null {
  const reason = (rollbackEvent.reason as string) ?? ""

  // Check if rollback reason mentions specific triggers
  if (reason.toLowerCase().includes("failure rate")) {
    return {
      cause: "Scoring failure rate triggered rollback",
      confidence: 0.85,
      evidence: [`Rollback reason: ${reason}`],
      severity: "critical",
      metricName: "failure_rate",
      metricValue: 0,
      threshold: 5,
    }
  }

  if (reason.toLowerCase().includes("latency")) {
    return {
      cause: "Latency spike triggered rollback",
      confidence: 0.85,
      evidence: [`Rollback reason: ${reason}`],
      severity: "critical",
      metricName: "latency",
      metricValue: 0,
      threshold: 3000,
    }
  }

  if (reason.toLowerCase().includes("drift")) {
    return {
      cause: "Score distribution drift triggered rollback",
      confidence: 0.8,
      evidence: [`Rollback reason: ${reason}`],
      severity: "high",
      metricName: "score_drift",
      metricValue: 0,
      threshold: 30,
    }
  }

  return null
}
