// =============================================
// Phase 3.9: Global Policy Orchestrator
// Timeline First Architecture — Top-level decision engine
// =============================================
// Aggregates signals from bandit layer, AB tests, causal layer, and
// replay insights to produce a global policy configuration.
//
// Decision hierarchy:
//   1. Global Policy Layer (Phase 3.9)
//   2. Segment Policy Adjustment
//   3. Bandit Selection (Phase 3.8)
//   4. Rollout Controller (Phase 3.6)
//   5. Scoring Engine
//
// This module is the entry point for the meta-policy layer. It does NOT
// modify Phase 3.6–3.8 systems — it produces configuration that those
// systems consume.

import { createClient } from "@/lib/supabase/server"
import {
  loadObjectiveWeights,
  DEFAULT_OBJECTIVE_WEIGHTS,
  type ObjectiveWeights,
  adjustWeightsForContext,
  normalizeWeights,
} from "@/lib/timeline/multi-objective"
import {
  computeAllSegmentAdjustments,
  type SegmentPolicyAdjustment,
} from "@/lib/timeline/cross-segment-policy"
import {
  generateSynthesisCandidates,
  identifyPruneCandidates,
  logSynthesis,
  type SynthesisCandidate,
} from "@/lib/timeline/strategy-synthesis"
import {
  preExecutionGate,
  loadHardConstraints,
  loadSoftConstraints,
  DEFAULT_HARD_CONSTRAINTS,
  DEFAULT_SOFT_CONSTRAINTS,
} from "@/lib/timeline/global-constraints"
import { recordGlobalPolicyEvent } from "@/lib/timeline/global-policy-observability"
import { getRollbackHistory } from "@/lib/timeline/rollback-system"
import { rolloutController } from "@/lib/timeline/rollout-controller"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GlobalPolicyConfig {
  version: string
  status: "draft" | "active" | "archived" | "simulated"
  objectiveWeights: ObjectiveWeights
  hardConstraints: {
    maxLatencyMs: number
    minQualityScore: number
    rollbackSafety: boolean
  }
  softConstraints: {
    minDiversityThreshold: number
    maxExplorationCapPct: number
    fairnessMinExposurePct: number
  }
  segmentAdjustments: Record<string, SegmentPolicyAdjustment>
  approvedStrategies: string[]
  explorationBounds: { minPct: number; maxPct: number }
  createdAt: string
  activatedAt: string | null
  metadata: Record<string, unknown>
}

export interface PolicyComputeResult {
  config: GlobalPolicyConfig
  synthesisCandidates: SynthesisCandidate[]
  pruneCandidates: string[]
  constraintCheckPassed: boolean
  reason: string
}

// ─── Policy Computation ─────────────────────────────────────────────────────

/**
 * Main compute function — called on schedule or on-demand.
 * Produces a new draft global policy config based on current signals.
 */
export async function computeGlobalPolicy(options: {
  triggeredBy?: "manual" | "auto" | "simulation"
  reason?: string
} = {}): Promise<PolicyComputeResult> {
  const triggeredBy = options.triggeredBy ?? "manual"
  const reason = options.reason ?? "Scheduled policy compute"

  // 1. Load current objective weights
  const baseWeights = await loadObjectiveWeights()

  // 2. Gather system context for dynamic weight adjustment
  const rollbackHistory = await getRollbackHistory(10)
  const context = {
    rollbackCount: rollbackHistory.length,
    // These would come from actual metrics in production
    diversityIndex: 0.5,
    conversionRate: 0.08,
    retentionRate: 0.4,
  }

  // 3. Adjust weights based on context
  const adjustedWeights = adjustWeightsForContext(baseWeights, context)

  // 4. Compute segment adjustments
  const segmentAdjustments = await computeAllSegmentAdjustments(adjustedWeights)

  // 5. Load constraints
  const [hard, soft] = await Promise.all([loadHardConstraints(), loadSoftConstraints()])

  // 6. Generate synthesis candidates
  const synthesisCandidates = await generateSynthesisCandidates({
    mutationCount: 3,
    crossoverCount: 2,
    mutationStrength: 0.05,
  })

  // 7. Identify prune candidates
  const pruneCandidates = await identifyPruneCandidates({
    rewardThreshold: 0.2,
    consecutiveWindows: 3,
  })

  // 8. Run pre-execution constraint check
  const constraintCheck = await preExecutionGate({
    isRollbackActive: rolloutController.shouldShortCircuit(),
    diversityIndex: context.diversityIndex,
  })

  // 9. Build policy config
  const version = `gp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const config: GlobalPolicyConfig = {
    version,
    status: "draft",
    objectiveWeights: adjustedWeights,
    hardConstraints: hard,
    softConstraints: soft,
    segmentAdjustments: segmentAdjustments as Record<string, SegmentPolicyAdjustment>,
    approvedStrategies: [],
    explorationBounds: {
      minPct: soft.fairnessMinExposurePct,
      maxPct: soft.maxExplorationCapPct,
    },
    createdAt: new Date().toISOString(),
    activatedAt: null,
    metadata: {
      triggered_by: triggeredBy,
      reason,
      rollback_count: context.rollbackCount,
      synthesis_candidate_count: synthesisCandidates.length,
      prune_candidate_count: pruneCandidates.length,
      constraint_check_passed: constraintCheck.passed,
    },
  }

  // 10. Persist
  await savePolicyConfig(config)

  // 11. Log synthesis candidates
  for (const candidate of synthesisCandidates) {
    await logSynthesis({ candidate, status: "candidate" })
  }

  // 12. Observability
  recordGlobalPolicyEvent({
    type: "POLICY_COMPUTED",
    version,
    segment: "global",
    sampledValue: 0,
    requestId: `policy-compute-${Date.now()}`,
    metadata: {
      objective_weights: adjustedWeights,
      synthesis_candidates: synthesisCandidates.length,
      prune_candidates: pruneCandidates.length,
      constraint_check_passed: constraintCheck.passed,
    },
  })

  return {
    config,
    synthesisCandidates,
    pruneCandidates: pruneCandidates.map((s) => s.strategy_id),
    constraintCheckPassed: constraintCheck.passed,
    reason,
  }
}

// ─── Policy Activation ──────────────────────────────────────────────────────

/**
 * Activate a draft policy config.
 */
export async function activatePolicy(version: string, reason?: string): Promise<GlobalPolicyConfig | null> {
  const supabase = await createClient()

  // 1. Archive current active policy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("global_policy_config")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("status", "active")

  // 2. Activate the new policy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("global_policy_config")
    .update({
      status: "active",
      activated_at: new Date().toISOString(),
      metadata: { activated_reason: reason ?? "Manual activation" },
    })
    .eq("version", version)
    .eq("status", "draft")
    .select("*")
    .single()

  if (error || !data) return null

  // 3. Log to policy history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("policy_history").insert({
    event_type: "policy_activated",
    policy_version: version,
    new_state: { version, activated_at: new Date().toISOString(), reason },
    triggered_by: "manual",
    reason: reason ?? "Manual activation",
  })

  recordGlobalPolicyEvent({
    type: "POLICY_ACTIVATED",
    version,
    segment: "global",
    sampledValue: 0,
    requestId: `policy-activate-${Date.now()}`,
    metadata: { reason },
  })

  return mapRowToConfig(data)
}

// ─── Policy Retrieval ───────────────────────────────────────────────────────

/**
 * Get the currently active global policy config.
 */
export async function getActivePolicy(): Promise<GlobalPolicyConfig | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("global_policy_config")
    .select("*")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return mapRowToConfig(data)
}

/**
 * Get policy history.
 */
export async function getPolicyHistory(limit = 20): Promise<unknown[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("policy_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  return data ?? []
}

/**
 * Get all policy configs (for admin listing).
 */
export async function listPolicyConfigs(options: {
  status?: string
  limit?: number
} = {}): Promise<GlobalPolicyConfig[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("global_policy_config")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50)

  if (options.status) q = q.eq("status", options.status)

  const { data } = await q
  if (!data) return []
  return data.map(mapRowToConfig)
}

// ─── Persistence ────────────────────────────────────────────────────────────

async function savePolicyConfig(config: GlobalPolicyConfig): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("global_policy_config").insert({
    version: config.version,
    status: config.status,
    objective_weights: config.objectiveWeights,
    hard_constraints: config.hardConstraints,
    soft_constraints: config.softConstraints,
    segment_adjustments: config.segmentAdjustments,
    approved_strategies: config.approvedStrategies,
    exploration_bounds: config.explorationBounds,
    created_at: config.createdAt,
    metadata: config.metadata,
  })

  // Log to policy history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("policy_history").insert({
    event_type: "policy_created",
    policy_version: config.version,
    new_state: {
      version: config.version,
      objective_weights: config.objectiveWeights,
      status: config.status,
    },
    triggered_by: (config.metadata?.triggered_by as string) ?? "manual",
    reason: (config.metadata?.reason as string) ?? "Auto-generated",
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapRowToConfig(row: any): GlobalPolicyConfig {
  const hc = row.hard_constraints ?? {}
  const sc = row.soft_constraints ?? {}
  const eb = row.exploration_bounds ?? {}

  return {
    version: row.version,
    status: row.status,
    objectiveWeights: {
      ctr: row.objective_weights?.ctr ?? DEFAULT_OBJECTIVE_WEIGHTS.ctr,
      conversion: row.objective_weights?.conversion ?? DEFAULT_OBJECTIVE_WEIGHTS.conversion,
      retention: row.objective_weights?.retention ?? DEFAULT_OBJECTIVE_WEIGHTS.retention,
      diversity: row.objective_weights?.diversity ?? DEFAULT_OBJECTIVE_WEIGHTS.diversity,
      stability: row.objective_weights?.stability ?? DEFAULT_OBJECTIVE_WEIGHTS.stability,
    },
    hardConstraints: {
      maxLatencyMs: hc.max_latency_ms ?? DEFAULT_HARD_CONSTRAINTS.maxLatencyMs,
      minQualityScore: hc.min_quality_score ?? DEFAULT_HARD_CONSTRAINTS.minQualityScore,
      rollbackSafety: hc.rollback_safety ?? DEFAULT_HARD_CONSTRAINTS.rollbackSafety,
    },
    softConstraints: {
      minDiversityThreshold: sc.min_diversity_threshold ?? DEFAULT_SOFT_CONSTRAINTS.minDiversityThreshold,
      maxExplorationCapPct: sc.max_exploration_cap_pct ?? DEFAULT_SOFT_CONSTRAINTS.maxExplorationCapPct,
      fairnessMinExposurePct: sc.fairness_min_exposure_pct ?? DEFAULT_SOFT_CONSTRAINTS.fairnessMinExposurePct,
    },
    segmentAdjustments: row.segment_adjustments ?? {},
    approvedStrategies: row.approved_strategies ?? [],
    explorationBounds: {
      minPct: eb.min_pct ?? 5,
      maxPct: eb.max_pct ?? 15,
    },
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    metadata: row.metadata ?? {},
  }
}
