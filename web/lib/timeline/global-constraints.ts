// =============================================
// Phase 3.9: Global Constraint Manager
// Timeline First Architecture — System-wide constraint enforcement
// =============================================
// Defines and enforces hard/soft constraints BEFORE any bandit or
// strategy execution. Hard constraints are absolute (violation = reject).
// Soft constraints are advisory (violation = warn + log).

import { createClient } from "@/lib/supabase/server"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"

// ─── Types ──────────────────────────────────────────────────────────────────

export type ViolationType =
  | "latency_budget"
  | "rollback_safety"
  | "min_quality"
  | "diversity_threshold"
  | "fairness"
  | "exploration_cap"

export type ViolationSeverity = "warning" | "error" | "critical"

export interface HardConstraints {
  maxLatencyMs: number
  minQualityScore: number
  rollbackSafety: boolean
}

export interface SoftConstraints {
  minDiversityThreshold: number
  maxExplorationCapPct: number
  fairnessMinExposurePct: number
}

export interface ConstraintCheckResult {
  passed: boolean
  violations: ConstraintViolation[]
}

export interface ConstraintViolation {
  type: ViolationType
  severity: ViolationSeverity
  constraintName: string
  actualValue: number | null
  thresholdValue: number | null
  affectedSegment: SegmentKey | null
  affectedArm: string | null
  context: Record<string, unknown>
}

export const DEFAULT_HARD_CONSTRAINTS: HardConstraints = {
  maxLatencyMs: 200,
  minQualityScore: 0.3,
  rollbackSafety: true,
}

export const DEFAULT_SOFT_CONSTRAINTS: SoftConstraints = {
  minDiversityThreshold: 0.1,
  maxExplorationCapPct: 15,
  fairnessMinExposurePct: 2,
}

// ─── Constraint Loading ─────────────────────────────────────────────────────

/**
 * Load hard constraints from the active global policy config.
 */
export async function loadHardConstraints(): Promise<HardConstraints> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("global_policy_config")
    .select("hard_constraints")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .single()

  if (!data?.hard_constraints) return { ...DEFAULT_HARD_CONSTRAINTS }

  const c = data.hard_constraints
  return {
    maxLatencyMs: c.max_latency_ms ?? DEFAULT_HARD_CONSTRAINTS.maxLatencyMs,
    minQualityScore: c.min_quality_score ?? DEFAULT_HARD_CONSTRAINTS.minQualityScore,
    rollbackSafety: c.rollback_safety ?? DEFAULT_HARD_CONSTRAINTS.rollbackSafety,
  }
}

/**
 * Load soft constraints from the active global policy config.
 */
export async function loadSoftConstraints(): Promise<SoftConstraints> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("global_policy_config")
    .select("soft_constraints")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .single()

  if (!data?.soft_constraints) return { ...DEFAULT_SOFT_CONSTRAINTS }

  const c = data.soft_constraints
  return {
    minDiversityThreshold: c.min_diversity_threshold ?? DEFAULT_SOFT_CONSTRAINTS.minDiversityThreshold,
    maxExplorationCapPct: c.max_exploration_cap_pct ?? DEFAULT_SOFT_CONSTRAINTS.maxExplorationCapPct,
    fairnessMinExposurePct: c.fairness_min_exposure_pct ?? DEFAULT_SOFT_CONSTRAINTS.fairnessMinExposurePct,
  }
}

// ─── Constraint Checking ────────────────────────────────────────────────────

/**
 * Check latency constraint.
 */
export function checkLatency(latencyMs: number, hard: HardConstraints): ConstraintViolation | null {
  if (latencyMs > hard.maxLatencyMs) {
    return {
      type: "latency_budget",
      severity: "error",
      constraintName: "max_latency_ms",
      actualValue: latencyMs,
      thresholdValue: hard.maxLatencyMs,
      affectedSegment: null,
      affectedArm: null,
      context: { latency_ms: latencyMs },
    }
  }
  return null
}

/**
 * Check rollback safety constraint.
 */
export function checkRollbackSafety(
  isRollbackActive: boolean,
  hard: HardConstraints
): ConstraintViolation | null {
  if (hard.rollbackSafety && isRollbackActive) {
    return {
      type: "rollback_safety",
      severity: "critical",
      constraintName: "rollback_safety",
      actualValue: 1,
      thresholdValue: 0,
      affectedSegment: null,
      affectedArm: null,
      context: { rollback_active: true },
    }
  }
  return null
}

/**
 * Check minimum quality score constraint.
 */
export function checkMinQuality(
  qualityScore: number,
  hard: HardConstraints,
  segment?: SegmentKey,
  armId?: string
): ConstraintViolation | null {
  if (qualityScore < hard.minQualityScore) {
    return {
      type: "min_quality",
      severity: "error",
      constraintName: "min_quality_score",
      actualValue: qualityScore,
      thresholdValue: hard.minQualityScore,
      affectedSegment: segment ?? null,
      affectedArm: armId ?? null,
      context: { quality_score: qualityScore },
    }
  }
  return null
}

/**
 * Check diversity threshold constraint.
 */
export function checkDiversity(
  diversityIndex: number,
  soft: SoftConstraints
): ConstraintViolation | null {
  if (diversityIndex < soft.minDiversityThreshold) {
    return {
      type: "diversity_threshold",
      severity: "warning",
      constraintName: "min_diversity_threshold",
      actualValue: diversityIndex,
      thresholdValue: soft.minDiversityThreshold,
      affectedSegment: null,
      affectedArm: null,
      context: { diversity_index: diversityIndex },
    }
  }
  return null
}

/**
 * Check fairness constraint — ensure all segments get minimum exposure.
 */
export function checkFairness(
  segmentExposures: Record<string, number>,
  soft: SoftConstraints
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []
  const totalExposure = Object.values(segmentExposures).reduce((s, v) => s + v, 0)

  if (totalExposure === 0) return violations

  for (const [segment, exposure] of Object.entries(segmentExposures)) {
    const pct = (exposure / totalExposure) * 100
    if (pct < soft.fairnessMinExposurePct) {
      violations.push({
        type: "fairness",
        severity: "warning",
        constraintName: "fairness_min_exposure_pct",
        actualValue: pct,
        thresholdValue: soft.fairnessMinExposurePct,
        affectedSegment: segment as SegmentKey,
        affectedArm: null,
        context: { segment, exposure, total_exposure: totalExposure },
      })
    }
  }

  return violations
}

/**
 * Check exploration cap constraint.
 */
export function checkExplorationCap(
  explorationPct: number,
  soft: SoftConstraints,
  segment?: SegmentKey
): ConstraintViolation | null {
  if (explorationPct > soft.maxExplorationCapPct) {
    return {
      type: "exploration_cap",
      severity: "warning",
      constraintName: "max_exploration_cap_pct",
      actualValue: explorationPct,
      thresholdValue: soft.maxExplorationCapPct,
      affectedSegment: segment ?? null,
      affectedArm: null,
      context: { exploration_pct: explorationPct },
    }
  }
  return null
}

// ─── Pre-Execution Gate ─────────────────────────────────────────────────────

/**
 * Run ALL constraint checks before allowing a bandit/strategy execution.
 * Returns passed=true only if NO hard constraint violations exist.
 * Soft violations are logged but don't block execution.
 */
export async function preExecutionGate(input: {
  latencyMs?: number
  isRollbackActive?: boolean
  qualityScore?: number
  diversityIndex?: number
  segmentExposures?: Record<string, number>
  explorationPct?: number
  segment?: SegmentKey
  armId?: string
}): Promise<ConstraintCheckResult> {
  const [hard, soft] = await Promise.all([loadHardConstraints(), loadSoftConstraints()])

  const violations: ConstraintViolation[] = []

  // Hard constraints
  if (input.latencyMs !== undefined) {
    const v = checkLatency(input.latencyMs, hard)
    if (v) violations.push(v)
  }
  if (input.isRollbackActive !== undefined) {
    const v = checkRollbackSafety(input.isRollbackActive, hard)
    if (v) violations.push(v)
  }
  if (input.qualityScore !== undefined) {
    const v = checkMinQuality(input.qualityScore, hard, input.segment, input.armId)
    if (v) violations.push(v)
  }

  // Soft constraints
  if (input.diversityIndex !== undefined) {
    const v = checkDiversity(input.diversityIndex, soft)
    if (v) violations.push(v)
  }
  if (input.segmentExposures !== undefined) {
    violations.push(...checkFairness(input.segmentExposures, soft))
  }
  if (input.explorationPct !== undefined) {
    const v = checkExplorationCap(input.explorationPct, soft, input.segment)
    if (v) violations.push(v)
  }

  const hasHardViolation = violations.some((v) => v.severity === "error" || v.severity === "critical")

  // Log violations (best-effort, non-blocking)
  for (const v of violations) {
    void logViolation(v).catch(() => {})
  }

  return { passed: !hasHardViolation, violations }
}

// ─── Violation Logging ──────────────────────────────────────────────────────

async function logViolation(v: ConstraintViolation): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("constraint_violation_log").insert({
    violation_type: v.type,
    severity: v.severity,
    constraint_name: v.constraintName,
    actual_value: v.actualValue,
    threshold_value: v.thresholdValue,
    affected_segment: v.affectedSegment,
    affected_arm: v.affectedArm,
    context: v.context,
  })
}

/**
 * Get unresolved violations.
 */
export async function getUnresolvedViolations(limit = 50): Promise<ConstraintViolation[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("constraint_violation_log")
    .select("*")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!data) return []

  return data.map((row: any) => ({
    type: row.violation_type as ViolationType,
    severity: row.severity as ViolationSeverity,
    constraintName: row.constraint_name,
    actualValue: row.actual_value,
    thresholdValue: row.threshold_value,
    affectedSegment: row.affected_segment as SegmentKey | null,
    affectedArm: row.affected_arm,
    context: row.context ?? {},
  }))
}
