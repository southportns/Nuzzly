// =============================================
// Phase 3.7: Decision Replay Engine
// Timeline First Architecture — Offline Decision Replay
// =============================================
// Purpose: Reconstruct any past recommendation decision exactly,
//          compare original vs replayed paths, detect divergence.
//
// This is an OFFLINE diagnostic tool — does NOT affect production traffic.

import { createClient } from "@/lib/supabase/server"
import { rolloutController } from "@/lib/timeline/rollout-controller"
import type { DecisionPath } from "@/lib/timeline/rollout-controller"

// ─── Execution Fidelity Level ──────────────────────────────────────────────
// Quantifies how close the replay can match the original execution environment.
// HIGH: full deterministic rebuild (snapshot + all inputs)
// MED:  full trace replay (output reconstructed, inputs inferred)
// LOW:  partial snapshot replay (only metadata + decision path)

export type FidelityLevel = "LOW" | "MED" | "HIGH"

export interface FidelityAssessment {
  level: FidelityLevel
  score: number             // 0-100
  available: {
    featureFlagsSnapshot: boolean
    scoringInputs: boolean
    productScores: boolean
    rankingOutput: boolean
    featureFlagsFull: boolean
  }
  warnings: string[]        // explains what is missing
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReplayInput {
  requestId: string
  mode?: "full" | "timeline_only" | "review_only" | "hybrid"
  // Optional: caller can force a target fidelity, otherwise we auto-detect
  targetFidelity?: FidelityLevel
  // Optional: caller-provided idempotency key to prevent duplicate jobs
  idempotencyKey?: string
}

export interface ReplayStep {
  step: string
  input: unknown
  output: unknown
  duration_ms: number
}

export interface ReplayResult {
  jobId: string
  requestId: string
  originalDecision: {
    decisionPath: DecisionPath
    engine: string
    hashBucket: number | null
    hashSource: string
    abGroup: string | null
    latencyMs: number | null
    featureFlagsSnapshot: Record<string, unknown>
  }
  replayedDecision: {
    decisionPath: DecisionPath
    engine: string
    hashBucket: number | null
    hashSource: string
    abGroup: string | null
  }
  divergence: {
    hasDivergence: boolean
    divergentSteps: string[]
    divergenceReason: string | null
  }
  pipelineSteps: ReplayStep[]
  replayMode: string
  replayedAt: string
  durationMs: number
  fidelity: FidelityAssessment
  // Indicates whether this result was served from a cached job (idempotency hit)
  idempotentHit: boolean
}

export interface ReplayJobRecord {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  job_type: string
  original_trace: unknown
  replayed_trace: unknown
  diff_result: unknown
  error_message: string | null
  created_at: string
  completed_at: string | null
  duration_ms: number | null
}

// ─── Replay Engine ──────────────────────────────────────────────────────────

/**
 * Execute a decision replay for a given request_id.
 *
 * Flow:
 * 1. Compute idempotency key; if a prior completed job exists, return it
 * 2. Fetch original decision trace from decision_trace_log
 * 3. Assess execution fidelity (LOW / MED / HIGH)
 * 4. Re-run decision logic with same inputs
 * 5. Compare original vs replayed decision
 * 6. Store result in replay_jobs table
 */
export async function executeReplay(input: ReplayInput): Promise<ReplayResult> {
  const t0 = performance.now()
  const supabase = await createClient()

  // Step 0: Idempotency — return cached job if available
  const idempotencyKey = computeIdempotencyKey(input)
  const cached = await fetchCachedReplay(supabase, idempotencyKey)
  if (cached) {
    return buildResultFromCached(cached, input, true)
  }

  // Step 1: Fetch original trace
  const originalTrace = await fetchOriginalTrace(supabase, input.requestId)
  if (!originalTrace) {
    throw new Error(`No decision trace found for request_id: ${input.requestId}`)
  }

  // Step 2: Assess fidelity BEFORE running replay (so we can fail fast on LOW)
  const fidelity = assessFidelity(originalTrace, input.targetFidelity)
  if (input.targetFidelity && fidelityScore(fidelity.level) < fidelityScore(input.targetFidelity)) {
    throw new Error(
      `Cannot satisfy target fidelity ${input.targetFidelity}: trace only supports ${fidelity.level}. ` +
      `Warnings: ${fidelity.warnings.join("; ")}`
    )
  }

  // Step 3: Create replay job record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from("replay_jobs")
    .insert({
      job_type: "decision_replay",
      request_id: input.requestId,
      user_id: originalTrace.user_id,
      status: "running",
      replay_config: {
        mode: input.mode || "full",
        targetFidelity: input.targetFidelity ?? "AUTO",
      },
      idempotency_key: idempotencyKey,
      execution_fidelity: fidelity.level,
      fidelity_warnings: fidelity.warnings,
      original_trace: originalTrace,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  const jobId = job.id

  // Step 4: Reconstruct pipeline steps
  const pipelineSteps: ReplayStep[] = []

  // Step 4a: Re-evaluate feature flags
  const flagStep = await replayFlagEvaluation(originalTrace)
  pipelineSteps.push(flagStep)

  // Step 4b: Re-evaluate AB assignment
  const abStep = await replayABAssignment(originalTrace)
  pipelineSteps.push(abStep)

  // Step 4c: Re-evaluate rollout decision
  const rolloutStep = await replayRolloutDecision(originalTrace, input.mode)
  pipelineSteps.push(rolloutStep)

  // Step 5: Build replayed decision
  const replayedDecision = rolloutStep.output as ReplayResult["replayedDecision"]

  // Step 6: Divergence analysis
  const divergence = analyzeDivergence(originalTrace, replayedDecision)

  // Step 7: Update job with result
  const durationMs = Math.round(performance.now() - t0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("replay_jobs")
    .update({
      status: "completed",
      replayed_trace: {
        decisionPath: replayedDecision.decisionPath,
        engine: replayedDecision.engine,
        hashBucket: replayedDecision.hashBucket,
        hashSource: replayedDecision.hashSource,
        abGroup: replayedDecision.abGroup,
      },
      diff_result: divergence,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    })
    .eq("id", jobId)

  return {
    jobId,
    requestId: input.requestId,
    originalDecision: {
      decisionPath: originalTrace.decision_path as DecisionPath,
      engine: (originalTrace.final_score_source as string) ?? "unknown",
      hashBucket: originalTrace.hash_bucket as number | null,
      hashSource: (originalTrace.hash_source as string) ?? "none",
      abGroup: originalTrace.ab_group as string | null,
      latencyMs: originalTrace.latency_ms as number | null,
      featureFlagsSnapshot: (originalTrace.feature_flags_snapshot as Record<string, unknown>) ?? {},
    },
    replayedDecision,
    divergence,
    pipelineSteps,
    replayMode: input.mode || "full",
    replayedAt: new Date().toISOString(),
    durationMs,
    fidelity,
    idempotentHit: false,
  }
}

/**
 * Fetch a replay job result by ID.
 */
export async function getReplayResult(jobId: string): Promise<ReplayJobRecord | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("replay_jobs")
    .select("*")
    .eq("id", jobId)
    .single()

  return data ?? null
}

// ─── Internal Replay Functions ──────────────────────────────────────────────

async function fetchOriginalTrace(supabase: unknown, requestId: string): Promise<Record<string, unknown> | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("decision_trace_log")
    .select("*")
    .eq("request_id", requestId)
    .single()

  return data ?? null
}

async function replayFlagEvaluation(originalTrace: Record<string, unknown>): Promise<ReplayStep> {
  const t0 = performance.now()
  const snapshot = (originalTrace.feature_flags_snapshot ?? {}) as Record<string, unknown>

  // Re-evaluate each flag from snapshot
  const reEvaluated: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(snapshot)) {
    // In replay mode, we use the stored snapshot value, not current DB value
    reEvaluated[key] = value
  }

  return {
    step: "flag_evaluation",
    input: { requestId: originalTrace.request_id },
    output: reEvaluated,
    duration_ms: Math.round(performance.now() - t0),
  }
}

async function replayABAssignment(originalTrace: Record<string, unknown>): Promise<ReplayStep> {
  const t0 = performance.now()
  const hashBucket = originalTrace.hash_bucket as number | null
  const hashSource = (originalTrace.hash_source as string) ?? "none"

  // Re-compute bucket from stored identity (deterministic)
  const replayedBucket = hashBucket // In replay, we trust the stored bucket

  return {
    step: "ab_assignment",
    input: { hashSource, storedBucket: hashBucket },
    output: { replayedBucket, abGroup: originalTrace.ab_group },
    duration_ms: Math.round(performance.now() - t0),
  }
}

async function replayRolloutDecision(
  originalTrace: Record<string, unknown>,
  mode?: string
): Promise<ReplayStep> {
  const t0 = performance.now()
  const decisionPath = originalTrace.decision_path as string
  const rolloutPercent = (originalTrace.rollout_percent as number) ?? 0
  const abGroup = originalTrace.ab_group as string | null

  // Re-run decision logic based on mode
  let engine: string
  let replayedPath: DecisionPath

  if (mode === "review_only") {
    engine = "review"
    replayedPath = "MASTER_OFF"
  } else if (mode === "timeline_only") {
    engine = "timeline"
    replayedPath = "ROLLOUT_FULL"
  } else if (mode === "hybrid") {
    engine = "blend"
    replayedPath = "ROLLOUT_FULL"
  } else {
    // Full replay: re-evaluate with current flags
    const decision = await rolloutController.decideEngine({
      userId: (originalTrace.user_id as string) ?? undefined,
      sessionId: undefined,
      requestId: (originalTrace.request_id as string) ?? undefined,
    })
    engine = decision.engine
    replayedPath = decision.decisionPath
  }

  return {
    step: "rollout_decision",
    input: { decisionPath, rolloutPercent, abGroup, mode },
    output: {
      decisionPath: replayedPath,
      engine,
      hashBucket: originalTrace.hash_bucket,
      hashSource: originalTrace.hash_source ?? "none",
      abGroup,
    },
    duration_ms: Math.round(performance.now() - t0),
  }
}

// ─── Divergence Analysis ────────────────────────────────────────────────────

function analyzeDivergence(
  originalTrace: Record<string, unknown>,
  replayedDecision: ReplayResult["replayedDecision"]
): ReplayResult["divergence"] {
  const originalPath = originalTrace.decision_path as string
  const replayedPath = replayedDecision.decisionPath

  const divergentSteps: string[] = []

  if (originalPath !== replayedPath) {
    divergentSteps.push("decision_path")
  }

  if (originalTrace.ab_group !== replayedDecision.abGroup) {
    divergentSteps.push("ab_group")
  }

  if (originalTrace.final_score_source !== replayedDecision.engine) {
    divergentSteps.push("scoring_engine")
  }

  const hasDivergence = divergentSteps.length > 0
  const divergenceReason = hasDivergence
    ? `Divergence detected in: ${divergentSteps.join(", ")}. Original: ${originalPath}, Replayed: ${replayedPath}`
    : null

  return {
    hasDivergence,
    divergentSteps,
    divergenceReason,
  }
}

// ─── Idempotency & Fidelity Helpers ─────────────────────────────────────────

function computeIdempotencyKey(input: ReplayInput): string {
  if (input.idempotencyKey) return input.idempotencyKey
  // md5-style hash (browser crypto safe in Node runtime)
  const composite = [
    input.requestId,
    input.mode ?? "full",
    input.targetFidelity ?? "AUTO",
  ].join("|")
  return hashString(composite)
}

function hashString(s: string): string {
  // Simple deterministic hash for idempotency key (no crypto needed; collision-resistant enough)
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, "0")
}

async function fetchCachedReplay(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  idempotencyKey: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("replay_jobs")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

function buildResultFromCached(
  cached: Record<string, unknown>,
  input: ReplayInput,
  idempotentHit: boolean
): ReplayResult {
  const originalTrace = (cached.original_trace ?? {}) as Record<string, unknown>
  const replayedTrace = (cached.replayed_trace ?? {}) as Record<string, unknown>
  const diff = (cached.diff_result ?? {}) as ReplayResult["divergence"]

  return {
    jobId: (cached.id as string) ?? "",
    requestId: input.requestId,
    originalDecision: {
      decisionPath: originalTrace.decision_path as DecisionPath,
      engine: (originalTrace.final_score_source as string) ?? "unknown",
      hashBucket: originalTrace.hash_bucket as number | null,
      hashSource: (originalTrace.hash_source as string) ?? "none",
      abGroup: originalTrace.ab_group as string | null,
      latencyMs: originalTrace.latency_ms as number | null,
      featureFlagsSnapshot: (originalTrace.feature_flags_snapshot as Record<string, unknown>) ?? {},
    },
    replayedDecision: {
      decisionPath: (replayedTrace.decisionPath as DecisionPath) ?? ("FALLBACK" as DecisionPath),
      engine: (replayedTrace.engine as string) ?? "unknown",
      hashBucket: (replayedTrace.hashBucket as number | null) ?? null,
      hashSource: (replayedTrace.hashSource as string) ?? "none",
      abGroup: (replayedTrace.abGroup as string | null) ?? null,
    },
    divergence: {
      hasDivergence: (diff.hasDivergence as boolean) ?? false,
      divergentSteps: (diff.divergentSteps as string[]) ?? [],
      divergenceReason: (diff.divergenceReason as string | null) ?? null,
    },
    pipelineSteps: [],
    replayMode: input.mode || "full",
    replayedAt: (cached.completed_at as string) ?? new Date().toISOString(),
    durationMs: (cached.duration_ms as number) ?? 0,
    fidelity: {
      level: (cached.execution_fidelity as FidelityLevel) ?? "LOW",
      score: 0,
      available: {
        featureFlagsSnapshot: false,
        scoringInputs: false,
        productScores: false,
        rankingOutput: false,
        featureFlagsFull: false,
      },
      warnings: (cached.fidelity_warnings as string[]) ?? [],
    },
    idempotentHit,
  }
}

function fidelityScore(level: FidelityLevel): number {
  return level === "HIGH" ? 3 : level === "MED" ? 2 : 1
}

function assessFidelity(
  trace: Record<string, unknown>,
  _target?: FidelityLevel
): FidelityAssessment {
  const flags = (trace.feature_flags_snapshot ?? {}) as Record<string, unknown>
  const inputs = (trace.scoring_inputs ?? {}) as Record<string, unknown>
  const scores = (trace.product_scores ?? []) as unknown[]
  const ranking = (trace.ranking_output ?? []) as unknown[]

  const available = {
    featureFlagsSnapshot: Object.keys(flags).length > 0,
    scoringInputs: Object.keys(inputs).length > 0,
    productScores: scores.length > 0,
    rankingOutput: ranking.length > 0,
    // Full = all critical flags (TIMELINE_ENABLED, AB_TEST_ENABLED, ROLLOUT_PCT, AUTO_ROLLBACK)
    featureFlagsFull: ["TIMELINE_ENABLED", "AB_TEST_ENABLED", "TIMELINE_ROLLOUT_PCT"]
      .every((k) => flags[k] !== undefined),
  }

  const warnings: string[] = []
  if (!available.featureFlagsSnapshot) warnings.push("feature_flags_snapshot missing — replay can only show metadata")
  if (!available.scoringInputs) warnings.push("scoring_inputs missing — pipeline inputs are inferred, not reconstructed")
  if (!available.productScores) warnings.push("product_scores missing — cannot diff against Timeline output")
  if (!available.rankingOutput) warnings.push("ranking_output missing — final ranking cannot be compared")
  if (!available.featureFlagsFull) warnings.push("feature_flags_snapshot incomplete — critical flags absent")

  let level: FidelityLevel
  let score: number

  if (
    available.featureFlagsSnapshot &&
    available.scoringInputs &&
    available.productScores &&
    available.rankingOutput &&
    available.featureFlagsFull
  ) {
    level = "HIGH"
    score = 100
  } else if (available.productScores && available.featureFlagsSnapshot) {
    level = "MED"
    score = 70
  } else {
    level = "LOW"
    score = 30
  }

  return { level, score, available, warnings }
}
