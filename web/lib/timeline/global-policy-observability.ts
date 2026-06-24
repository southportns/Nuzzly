// =============================================
// Phase 3.9: Global Policy Observability
// Timeline First Architecture — Metrics and event logging
// =============================================
// Emits observability events for the global policy layer:
//   - global_policy_objective_weights
//   - segment_policy_distribution
//   - strategy_synthesis_events
//   - pareto_frontier_metrics
//   - global_policy_simulation_uplift
//   - constraint_violation_events

import type { SegmentKey } from "@/lib/timeline/bandit-policy"

// ─── Types ──────────────────────────────────────────────────────────────────

export type GlobalPolicyEventType =
  | "POLICY_COMPUTED"
  | "POLICY_ACTIVATED"
  | "POLICY_ARCHIVED"
  | "POLICY_SIMULATED"
  | "POLICY_APPLIED"
  | "SEGMENT_POLICY_UPDATED"
  | "STRATEGY_SYNTHESIS"
  | "PARETO_FRONTIER_UPDATE"
  | "SIMULATION_UPlift"
  | "CONSTRAINT_VIOLATION"

export interface GlobalPolicyEvent {
  type: GlobalPolicyEventType
  version: string
  segment: SegmentKey | "global"
  sampledValue: number
  requestId: string
  metadata?: Record<string, unknown>
}

// ─── In-Memory Metrics (process-level) ──────────────────────────────────────

interface MetricsState {
  policyComputedCount: number
  policyActivatedCount: number
  simulationCount: number
  constraintViolationCount: number
  lastPolicyVersion: string | null
  lastObjectiveWeights: Record<string, number> | null
  lastSimulationUplift: number | null
  segmentPolicyDistribution: Record<string, number>
  strategySynthesisEvents: number
  paretoFrontierMetrics: Array<{ armId: string; rank: number; isOptimal: boolean }>
}

let metrics: MetricsState = {
  policyComputedCount: 0,
  policyActivatedCount: 0,
  simulationCount: 0,
  constraintViolationCount: 0,
  lastPolicyVersion: null,
  lastObjectiveWeights: null,
  lastSimulationUplift: null,
  segmentPolicyDistribution: {},
  strategySynthesisEvents: 0,
  paretoFrontierMetrics: [],
}

// ─── Event Recording ────────────────────────────────────────────────────────

export function recordGlobalPolicyEvent(event: GlobalPolicyEvent): void {
  switch (event.type) {
    case "POLICY_COMPUTED":
      metrics.policyComputedCount++
      metrics.lastPolicyVersion = event.version
      metrics.lastObjectiveWeights = event.metadata?.objective_weights as Record<string, number> | null
      break
    case "POLICY_ACTIVATED":
      metrics.policyActivatedCount++
      metrics.lastPolicyVersion = event.version
      break
    case "POLICY_SIMULATED":
    case "SIMULATION_UPlift":
      metrics.simulationCount++
      metrics.lastSimulationUplift = event.metadata?.uplift as number | null
      break
    case "CONSTRAINT_VIOLATION":
      metrics.constraintViolationCount++
      break
    case "STRATEGY_SYNTHESIS":
      metrics.strategySynthesisEvents++
      break
    case "PARETO_FRONTIER_UPDATE":
      metrics.paretoFrontierMetrics = (event.metadata?.frontier as Array<{ armId: string; rank: number; isOptimal: boolean }>) ?? []
      break
    case "SEGMENT_POLICY_UPDATED":
      if (event.segment !== "global") {
        metrics.segmentPolicyDistribution[event.segment] =
          (metrics.segmentPolicyDistribution[event.segment] ?? 0) + 1
      }
      break
  }
}

// ─── Metrics Retrieval ──────────────────────────────────────────────────────

export function getGlobalPolicyMetrics(): MetricsState {
  return { ...metrics }
}

export function resetGlobalPolicyMetrics(): void {
  metrics = {
    policyComputedCount: 0,
    policyActivatedCount: 0,
    simulationCount: 0,
    constraintViolationCount: 0,
    lastPolicyVersion: null,
    lastObjectiveWeights: null,
    lastSimulationUplift: null,
    segmentPolicyDistribution: {},
    strategySynthesisEvents: 0,
    paretoFrontierMetrics: [],
  }
}
