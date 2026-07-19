// =============================================
// Phase 3.9: Policy Evaluation Simulator (Offline)
// Timeline First Architecture — What-if analysis engine
// =============================================
// Uses the replay system (Phase 3.7) to simulate global policy changes
// offline. Evaluates impact across all segments, estimates system-wide
// uplift or degradation.
//
// Supports:
//   - What-if analysis
//   - Global policy comparison
//   - Safe pre-deployment validation

import { createClient } from "@/lib/supabase/server"
import type { GlobalPolicyConfig } from "@/lib/timeline/global-policy-orchestrator"
import type { ObjectiveWeights } from "@/lib/timeline/multi-objective"
import { computeCompositeScore, normalizeValue } from "@/lib/timeline/multi-objective"
import { computeSegmentAdjustment, type SegmentPolicyAdjustment } from "@/lib/timeline/cross-segment-policy"
import { preExecutionGate } from "@/lib/timeline/global-constraints"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SimulationInput {
  /** Policy version to simulate (or inline config). */
  policyVersion?: string
  inlineConfig?: Partial<GlobalPolicyConfig>
  /** Time window for replay data. */
  windowHours?: number
  /** Segments to include (default: all). */
  segments?: SegmentKey[]
}

export interface SegmentSimulationResult {
  segmentKey: SegmentKey
  baselineScore: number
  simulatedScore: number
  uplift: number
  upliftPct: number
  sampleSize: number
  constraintViolations: number
}

export interface SystemUplift {
  overallUlift: number
  overallUliftPct: number
  totalSampleSize: number
  paretoImprovements: number
  constraintViolations: number
  recommendation: "approve" | "reject" | "neutral" | "needs_tuning"
}

export interface SimulationResult {
  simulationId: string
  policyVersion: string
  baselinePolicyVersion: string | null
  segmentResults: Record<string, SegmentSimulationResult>
  systemUplift: SystemUplift
  paretoFrontier: Array<{ armId: string; isParetoOptimal: boolean; rank: number }>
  constraintViolations: Array<{ type: string; count: number }>
  recommendation: "approve" | "reject" | "neutral" | "needs_tuning"
  status: "completed" | "failed" | "cancelled"
  errorMessage: string | null
  createdAt: string
  completedAt: string
}

// ─── Simulation Engine ──────────────────────────────────────────────────────

/**
 * Run a full offline simulation of a global policy change.
 * Uses historical bandit reward data as the replay source.
 */
export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  const simulationId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const startedAt = new Date().toISOString()

  try {
    // 1. Resolve the policy to simulate
    const policy = await resolvePolicy(input)
    if (!policy) {
      return makeFailedResult(simulationId, input, "Policy not found")
    }

    // 2. Load historical replay data
    const windowHours = input.windowHours ?? 168 // 7 days
    const replayData = await loadReplayData(windowHours, input.segments)

    if (replayData.length === 0) {
      return makeFailedResult(simulationId, input, "No replay data available for the specified window")
    }

    // 3. Compute baseline scores (using current active policy or default weights)
    const baselineWeights = await loadBaselineWeights()
    const baselineResults = computeScoresForData(replayData, baselineWeights)

    // 4. Compute simulated scores (using the new policy weights)
    const simWeights = policy.objectiveWeights
    const simulatedResults = computeScoresForData(replayData, simWeights)

    // 5. Compute segment-level results
    const segmentResults = computeSegmentResults(
      replayData,
      baselineResults,
      simulatedResults,
      policy
    )

    // 6. Compute system-wide uplift
    const systemUplift = computeSystemUplift(segmentResults)

    // 7. Run constraint checks on the simulated policy
    const constraintCheck = await preExecutionGate({
      diversityIndex: 0.5, // Would come from actual diversity metrics
    })

    // 8. Determine recommendation
    const recommendation = determineRecommendation(systemUplift, constraintCheck.passed)

    // 9. Persist result
    await saveSimulationResult({
      simulationId,
      policyVersion: policy.version,
      baselinePolicyVersion: null,
      segmentResults,
      systemUplift,
      paretoFrontier: [],
      constraintViolations: constraintCheck.violations.map((v) => ({
        type: v.type,
        count: 1,
      })),
      recommendation,
      status: "completed",
      errorMessage: null,
      createdAt: startedAt,
      completedAt: new Date().toISOString(),
    })

    return {
      simulationId,
      policyVersion: policy.version,
      baselinePolicyVersion: null,
      segmentResults,
      systemUplift,
      paretoFrontier: [],
      constraintViolations: constraintCheck.violations.map((v) => ({
        type: v.type,
        count: 1,
      })),
      recommendation,
      status: "completed",
      errorMessage: null,
      createdAt: startedAt,
      completedAt: new Date().toISOString(),
    }
  } catch (err) {
    return makeFailedResult(simulationId, input, (err as Error).message)
  }
}

// ─── Score Computation ──────────────────────────────────────────────────────

interface ReplayRow {
  armId: string
  segment: SegmentKey
  reward: number
  ctr: number
  conversion: number
  dwellTimeMs: number
  skipRate: number
  bounceRate: number
}

interface ScoredRow {
  armId: string
  segment: SegmentKey
  compositeScore: number
}

function computeScoresForData(
  data: ReplayRow[],
  weights: ObjectiveWeights
): ScoredRow[] {
  return data.map((row) => {
    // Normalize raw engagement metrics to objective scores
    const objectives = {
      ctr: normalizeValue(row.ctr, 0, 1),
      conversion: normalizeValue(row.conversion, 0, 1),
      retention: normalizeValue(row.reward, 0, 1), // Use reward as retention proxy
      diversity: 0.5, // Would come from actual diversity computation
      stability: normalizeValue(1 - row.skipRate, 0, 1),
    }

    const composite = computeCompositeScore(objectives, weights)

    return {
      armId: row.armId,
      segment: row.segment,
      compositeScore: composite,
    }
  })
}

function computeSegmentResults(
  data: ReplayRow[],
  baseline: ScoredRow[],
  simulated: ScoredRow[],
  policy: GlobalPolicyConfig
): Record<string, SegmentSimulationResult> {
  const segments = new Set(data.map((d) => d.segment))
  const results: Record<string, SegmentSimulationResult> = {}

  for (const segment of segments) {
    const segmentData = data.filter((d) => d.segment === segment)
    const segmentBaseline = baseline.filter((_, i) => data[i].segment === segment)
    const segmentSimulated = simulated.filter((_, i) => data[i].segment === segment)

    const avgBaseline =
      segmentBaseline.length > 0
        ? segmentBaseline.reduce((s, r) => s + r.compositeScore, 0) / segmentBaseline.length
        : 0

    const avgSimulated =
      segmentSimulated.length > 0
        ? segmentSimulated.reduce((s, r) => s + r.compositeScore, 0) / segmentSimulated.length
        : 0

    const uplift = avgSimulated - avgBaseline
    const upliftPct = avgBaseline > 0 ? (uplift / avgBaseline) * 100 : 0

    results[segment] = {
      segmentKey: segment as SegmentKey,
      baselineScore: avgBaseline,
      simulatedScore: avgSimulated,
      uplift,
      upliftPct,
      sampleSize: segmentData.length,
      constraintViolations: 0,
    }
  }

  return results
}

function computeSystemUplift(
  segmentResults: Record<string, SegmentSimulationResult>
): SystemUplift {
  const segments = Object.values(segmentResults)
  const totalSamples = segments.reduce((s, r) => s + r.sampleSize, 0)

  if (totalSamples === 0) {
    return {
      overallUlift: 0,
      overallUliftPct: 0,
      totalSampleSize: 0,
      paretoImprovements: 0,
      constraintViolations: 0,
      recommendation: "neutral",
    }
  }

  // Weighted average uplift
  const weightedUplift = segments.reduce(
    (s, r) => s + r.uplift * r.sampleSize,
    0
  ) / totalSamples

  const weightedUpliftPct = segments.reduce(
    (s, r) => s + r.upliftPct * r.sampleSize,
    0
  ) / totalSamples

  const positiveSegments = segments.filter((r) => r.uplift > 0).length
  const paretoImprovements = positiveSegments

  return {
    overallUlift: weightedUplift,
    overallUliftPct: weightedUpliftPct,
    totalSampleSize: totalSamples,
    paretoImprovements,
    constraintViolations: segments.reduce((s, r) => s + r.constraintViolations, 0),
    recommendation: "neutral", // Will be set by determineRecommendation
  }
}

function determineRecommendation(
  uplift: SystemUplift,
  constraintsPassed: boolean
): "approve" | "reject" | "neutral" | "needs_tuning" {
  if (!constraintsPassed) return "reject"
  if (uplift.overallUliftPct > 5) return "approve"
  if (uplift.overallUliftPct < -5) return "reject"
  if (uplift.overallUliftPct > 0) return "needs_tuning"
  return "neutral"
}

// ─── Data Loading ───────────────────────────────────────────────────────────

async function loadReplayData(
  windowHours: number,
  segments?: SegmentKey[]
): Promise<ReplayRow[]> {
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - windowHours * 3600_000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("bandit_rewards")
    .select("arm_id, segment, reward, reward_components, created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(10000)

  if (segments && segments.length > 0) {
    q = q.in("segment", segments)
  }

  const { data } = await q
  if (!data) return []

  return data.map((row: any) => {
    const rc = row.reward_components ?? {}
    return {
      armId: row.arm_id,
      segment: (row.segment ?? "global") as SegmentKey,
      reward: Number(row.reward) ?? 0,
      ctr: Number(rc.ctr) ?? 0,
      conversion: Number(rc.conversion) ?? 0,
      dwellTimeMs: Number(rc.dwell_time_ms) ?? 0,
      skipRate: Number(rc.skip) ?? 0,
      bounceRate: Number(rc.bounce) ?? 0,
    }
  })
}

async function resolvePolicy(
  input: SimulationInput
): Promise<GlobalPolicyConfig | null> {
  if (input.inlineConfig) {
    // Use inline config — fill defaults for missing fields
    return {
      version: input.inlineConfig.version ?? `inline-${Date.now()}`,
      status: "simulated",
      objectiveWeights: input.inlineConfig.objectiveWeights ?? (await loadBaselineWeights()),
      hardConstraints: input.inlineConfig.hardConstraints ?? {
        maxLatencyMs: 200,
        minQualityScore: 0.3,
        rollbackSafety: true,
      },
      softConstraints: input.inlineConfig.softConstraints ?? {
        minDiversityThreshold: 0.1,
        maxExplorationCapPct: 15,
        fairnessMinExposurePct: 2,
      },
      segmentAdjustments: input.inlineConfig.segmentAdjustments ?? {},
      approvedStrategies: input.inlineConfig.approvedStrategies ?? [],
      explorationBounds: input.inlineConfig.explorationBounds ?? { minPct: 5, maxPct: 15 },
      createdAt: new Date().toISOString(),
      activatedAt: null,
      metadata: input.inlineConfig.metadata ?? {},
    }
  }

  // Load from database
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("global_policy_config")
    .select("*")
    .eq("version", input.policyVersion)
    .single()

  if (!data) return null

  const ow = data.objective_weights ?? {}
  const hc = data.hard_constraints ?? {}
  const sc = data.soft_constraints ?? {}
  const eb = data.exploration_bounds ?? {}

  return {
    version: data.version,
    status: data.status,
    objectiveWeights: {
      ctr: ow.ctr ?? 0.3,
      conversion: ow.conversion ?? 0.25,
      retention: ow.retention ?? 0.2,
      diversity: ow.diversity ?? 0.15,
      stability: ow.stability ?? 0.1,
    },
    hardConstraints: {
      maxLatencyMs: hc.max_latency_ms ?? 200,
      minQualityScore: hc.min_quality_score ?? 0.3,
      rollbackSafety: hc.rollback_safety ?? true,
    },
    softConstraints: {
      minDiversityThreshold: sc.min_diversity_threshold ?? 0.1,
      maxExplorationCapPct: sc.max_exploration_cap_pct ?? 15,
      fairnessMinExposurePct: sc.fairness_min_exposure_pct ?? 2,
    },
    segmentAdjustments: data.segment_adjustments ?? {},
    approvedStrategies: data.approved_strategies ?? [],
    explorationBounds: {
      minPct: eb.min_pct ?? 5,
      maxPct: eb.max_pct ?? 15,
    },
    createdAt: data.created_at,
    activatedAt: data.activated_at,
    metadata: data.metadata ?? {},
  }
}

async function loadBaselineWeights(): Promise<ObjectiveWeights> {
  // Try to load from active policy, fall back to defaults
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("global_policy_config")
    .select("objective_weights")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .single()

  if (!data?.objective_weights) {
    return { ctr: 0.3, conversion: 0.25, retention: 0.2, diversity: 0.15, stability: 0.1 }
  }

  const w = data.objective_weights
  return {
    ctr: w.ctr ?? 0.3,
    conversion: w.conversion ?? 0.25,
    retention: w.retention ?? 0.2,
    diversity: w.diversity ?? 0.15,
    stability: w.stability ?? 0.1,
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

async function saveSimulationResult(result: Omit<SimulationResult, "baselinePolicyVersion"> & { baselinePolicyVersion: string | null }): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("policy_simulation_results").insert({
    simulation_id: result.simulationId,
    policy_version: result.policyVersion,
    baseline_policy_version: result.baselinePolicyVersion,
    segment_results: result.segmentResults,
    system_uplift: result.systemUplift,
    pareto_frontier: result.paretoFrontier,
    constraint_violations: result.constraintViolations,
    recommendation: result.recommendation,
    status: result.status,
    error_message: result.errorMessage,
    created_at: result.createdAt,
    completed_at: result.completedAt,
  })
}

function makeFailedResult(
  simulationId: string,
  input: SimulationInput,
  errorMessage: string
): SimulationResult {
  const now = new Date().toISOString()
  return {
    simulationId,
    policyVersion: input.policyVersion ?? "unknown",
    baselinePolicyVersion: null,
    segmentResults: {},
    systemUplift: {
      overallUlift: 0,
      overallUliftPct: 0,
      totalSampleSize: 0,
      paretoImprovements: 0,
      constraintViolations: 0,
      recommendation: "reject",
    },
    paretoFrontier: [],
    constraintViolations: [],
    recommendation: "reject",
    status: "failed",
    errorMessage,
    createdAt: now,
    completedAt: now,
  }
}

/**
 * Get simulation results.
 */
export async function getSimulationResults(options: {
  limit?: number
  status?: string
} = {}): Promise<SimulationResult[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("policy_simulation_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 20)

  if (options.status) q = q.eq("status", options.status)

  const { data } = await q
  if (!data) return []

  return data.map((row: any) => ({
    simulationId: row.simulation_id,
    policyVersion: row.policy_version,
    baselinePolicyVersion: row.baseline_policy_version,
    segmentResults: row.segment_results ?? {},
    systemUplift: row.system_uplift ?? {},
    paretoFrontier: row.pareto_frontier ?? [],
    constraintViolations: row.constraint_violations ?? [],
    recommendation: row.recommendation ?? "neutral",
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }))
}
