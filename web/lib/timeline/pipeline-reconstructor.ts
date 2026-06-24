// =============================================
// Phase 3.7: Scoring Pipeline Reconstructor
// Timeline First Architecture — Step-by-step pipeline reconstruction
// =============================================
// Purpose: Reconstruct the full scoring pipeline step-by-step for any past decision,
//          showing each intermediate value and execution order.

import { createClient } from "@/lib/supabase/server"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TraceNode {
  id: string
  name: string
  stepOrder: number
  input: Record<string, unknown>
  output: Record<string, unknown>
  durationMs: number
  children: TraceNode[]
  status: "success" | "skipped" | "error"
}

export interface PipelineReconstruction {
  requestId: string
  rootTrace: TraceNode
  totalSteps: number
  totalDurationMs: number
  reconstructedAt: string
}

// ─── Reconstructor ──────────────────────────────────────────────────────────

/**
 * Reconstruct the full scoring pipeline for a given request_id.
 *
 * Returns a structured trace tree showing:
 * - Feature flag evaluation
 * - AB group assignment
 * - Rollout decision
 * - Scoring engine selection
 * - Final ranking computation
 *
 * Each step is independently inspectable.
 */
export async function reconstructPipeline(requestId: string): Promise<PipelineReconstruction> {
  const supabase = await createClient()

  // Fetch original trace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trace } = await (supabase as any)
    .from("decision_trace_log")
    .select("*")
    .eq("request_id", requestId)
    .single()

  if (!trace) {
    throw new Error(`No decision trace found for request_id: ${requestId}`)
  }

  // Build trace tree
  const rootTrace = buildTraceTree(trace)

  return {
    requestId,
    rootTrace,
    totalSteps: countSteps(rootTrace),
    totalDurationMs: sumDurations(rootTrace),
    reconstructedAt: new Date().toISOString(),
  }
}

// ─── Trace Tree Builder ─────────────────────────────────────────────────────

function buildTraceTree(trace: Record<string, unknown>): TraceNode {
  const steps = (trace.scoring_path_steps as string[]) ?? []

  // Root node
  const root: TraceNode = {
    id: "root",
    name: "Recommendation Pipeline",
    stepOrder: 0,
    input: {
      request_id: trace.request_id,
      user_id: trace.user_id,
    },
    output: {
      decision_path: trace.decision_path,
      final_score_source: trace.final_score_source,
    },
    durationMs: trace.latency_ms as number ?? 0,
    children: [],
    status: "success",
  }

  // Step 1: Feature Flag Evaluation
  root.children.push({
    id: "step_flags",
    name: "Feature Flag Evaluation",
    stepOrder: 1,
    input: { flag_keys: Object.keys(trace.feature_flags_snapshot ?? {}) },
    output: (trace.feature_flags_snapshot as Record<string, unknown>) ?? {},
    durationMs: 0,
    children: [],
    status: "success",
  })

  // Step 2: Identity Resolution
  root.children.push({
    id: "step_identity",
    name: "Identity Resolution",
    stepOrder: 2,
    input: { hash_source: trace.hash_source },
    output: { hash_bucket: trace.hash_bucket },
    durationMs: 0,
    children: [],
    status: "success",
  })

  // Step 3: AB Assignment (if applicable)
  if (trace.ab_group) {
    root.children.push({
      id: "step_ab",
      name: "A/B Group Assignment",
      stepOrder: 3,
      input: { hash_bucket: trace.hash_bucket },
      output: { ab_group: trace.ab_group },
      durationMs: 0,
      children: [],
      status: "success",
    })
  }

  // Step 4: Rollout Decision
  root.children.push({
    id: "step_rollout",
    name: "Rollout Decision",
    stepOrder: trace.ab_group ? 4 : 3,
    input: { rollout_percent: trace.rollout_percent },
    output: { decision_path: trace.decision_path },
    durationMs: 0,
    children: [],
    status: "success",
  })

  // Step 5: Scoring Engine Selection
  const scoringStep = trace.decision_path === "ROLLBACK" || trace.decision_path === "MASTER_OFF"
    ? {
        id: "step_scoring",
        name: "Scoring Engine Selection",
        stepOrder: trace.ab_group ? 5 : 4,
        input: { decision_path: trace.decision_path },
        output: { engine: "review", reason: "Fallback to Review Score" },
        durationMs: 0,
        children: [],
        status: "success" as const,
      }
    : {
        id: "step_scoring",
        name: "Scoring Engine Selection",
        stepOrder: trace.ab_group ? 5 : 4,
        input: { decision_path: trace.decision_path },
        output: { engine: trace.final_score_source, scoring_steps: steps },
        durationMs: 0,
        children: [],
        status: "success" as const,
      }
  root.children.push(scoringStep)

  // Step 6: Final Ranking
  root.children.push({
    id: "step_ranking",
    name: "Final Ranking Computation",
    stepOrder: trace.ab_group ? 6 : 5,
    input: { scoring_engine: trace.final_score_source },
    output: { ranking: trace.ranking_output ?? [] },
    durationMs: 0,
    children: [],
    status: "success",
  })

  return root
}

function countSteps(node: TraceNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countSteps(child), 0)
}

function sumDurations(node: TraceNode): number {
  return node.durationMs + node.children.reduce((sum, child) => sum + sumDurations(child), 0)
}
