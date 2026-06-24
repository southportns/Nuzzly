// =============================================
// Phase 3.95: Outcome Observability
// Timeline First Architecture — Metrics and event logging for outcome intelligence
// =============================================

// ─── Types ──────────────────────────────────────────────────────────────────

export type OutcomeEventType =
  | "ATTRIBUTION_COMPUTED"
  | "LONGITUDINAL_RECORDED"
  | "BENCHMARK_UPDATED"
  | "EFFECTIVENESS_SCORED"
  | "EXPLAINABILITY_GENERATED"
  | "COHORT_INTELLIGENCE_UPDATED"
  | "FLYWHEEL_COMPLETED"

export interface OutcomeEvent {
  type: OutcomeEventType
  entityId: string
  segment: string
  sampledValue: number
  requestId: string
  metadata?: Record<string, unknown>
}

// ─── In-Memory Metrics ──────────────────────────────────────────────────────

interface MetricsState {
  attributionCount: number
  longitudinalCount: number
  benchmarkUpdateCount: number
  effectivenessScoreCount: number
  explainabilityCount: number
  cohortUpdateCount: number
  flywheelCompletedCount: number
  lastAttributionConfidence: number | null
  lastBenchmarkConfidence: number | null
  lastEffectivenessScore: number | null
  lastCohortDelta: number | null
  outcomeImprovementRate: number | null
  longitudinalSuccessRate: number | null
}

let metrics: MetricsState = {
  attributionCount: 0,
  longitudinalCount: 0,
  benchmarkUpdateCount: 0,
  effectivenessScoreCount: 0,
  explainabilityCount: 0,
  cohortUpdateCount: 0,
  flywheelCompletedCount: 0,
  lastAttributionConfidence: null,
  lastBenchmarkConfidence: null,
  lastEffectivenessScore: null,
  lastCohortDelta: null,
  outcomeImprovementRate: null,
  longitudinalSuccessRate: null,
}

// ─── Event Recording ────────────────────────────────────────────────────────

export function recordOutcomeEvent(event: OutcomeEvent): void {
  switch (event.type) {
    case "ATTRIBUTION_COMPUTED":
      metrics.attributionCount++
      metrics.lastAttributionConfidence = event.metadata?.confidence as number | null
      break
    case "LONGITUDINAL_RECORDED":
      metrics.longitudinalCount++
      break
    case "BENCHMARK_UPDATED":
      metrics.benchmarkUpdateCount++
      metrics.lastBenchmarkConfidence = event.metadata?.sample_size as number
        ? Math.min(1, (event.metadata?.sample_size as number) / 100)
        : null
      break
    case "EFFECTIVENESS_SCORED":
      metrics.effectivenessScoreCount++
      metrics.lastEffectivenessScore = event.metadata?.effectiveness_score as number | null
      break
    case "EXPLAINABILITY_GENERATED":
      metrics.explainabilityCount++
      break
    case "COHORT_INTELLIGENCE_UPDATED":
      metrics.cohortUpdateCount++
      metrics.lastCohortDelta = event.sampledValue
      break
    case "FLYWHEEL_COMPLETED":
      metrics.flywheelCompletedCount++
      metrics.outcomeImprovementRate = event.sampledValue
      break
  }
}

// ─── Metrics Retrieval ──────────────────────────────────────────────────────

export function getOutcomeMetrics(): MetricsState {
  return { ...metrics }
}

export function resetOutcomeMetrics(): void {
  metrics = {
    attributionCount: 0,
    longitudinalCount: 0,
    benchmarkUpdateCount: 0,
    effectivenessScoreCount: 0,
    explainabilityCount: 0,
    cohortUpdateCount: 0,
    flywheelCompletedCount: 0,
    lastAttributionConfidence: null,
    lastBenchmarkConfidence: null,
    lastEffectivenessScore: null,
    lastCohortDelta: null,
    outcomeImprovementRate: null,
    longitudinalSuccessRate: null,
  }
}
