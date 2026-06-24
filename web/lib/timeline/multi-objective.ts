// =============================================
// Phase 3.9: Multi-Objective Optimization Engine
// Timeline First Architecture — Pareto-based multi-objective scoring
// =============================================
// Replaces single-reward assumption with a weighted multi-objective system.
// Objectives: CTR, Conversion, Retention, Diversity, Stability.
// Supports dynamic objective prioritization and Pareto frontier computation.

import { createClient } from "@/lib/supabase/server"

// ─── Types ──────────────────────────────────────────────────────────────────

export type ObjectiveKey = "ctr" | "conversion" | "retention" | "diversity" | "stability"

export interface ObjectiveWeights {
  ctr: number
  conversion: number
  retention: number
  diversity: number
  stability: number
}

export interface ObjectiveScore {
  objective: ObjectiveKey
  rawValue: number
  normalizedValue: number
  weight: number
  weightedScore: number
}

export interface MultiObjectiveResult {
  compositeScore: number
  objectives: ObjectiveScore[]
  paretoRank: number | null
  isParetoOptimal: boolean
}

export interface ParetoPoint {
  armId: string
  scores: Record<ObjectiveKey, number>
  isParetoOptimal: boolean
  rank: number
}

export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  ctr: 0.30,
  conversion: 0.25,
  retention: 0.20,
  diversity: 0.15,
  stability: 0.10,
}

const ALL_OBJECTIVES: ObjectiveKey[] = ["ctr", "conversion", "retention", "diversity", "stability"]

// ─── Normalization ──────────────────────────────────────────────────────────

/**
 * Min-max normalize a value given known bounds.
 * Falls back to identity if bounds are invalid.
 */
export function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return clamp01((value - min) / (max - min))
}

/**
 * Normalize all objectives to [0, 1] using historical percentiles.
 * In production, min/max come from rolling window statistics.
 */
export function normalizeObjectives(
  raw: Record<ObjectiveKey, number>,
  bounds: Record<ObjectiveKey, { min: number; max: number }>
): Record<ObjectiveKey, number> {
  const result = {} as Record<ObjectiveKey, number>
  for (const key of ALL_OBJECTIVES) {
    const b = bounds[key] ?? { min: 0, max: 1 }
    result[key] = normalizeValue(raw[key] ?? 0, b.min, b.max)
  }
  return result
}

// ─── Weighted Composite Score ───────────────────────────────────────────────

/**
 * Compute a weighted composite score from normalized objectives.
 * Weights are automatically normalized to sum to 1.0.
 */
export function computeCompositeScore(
  normalized: Record<ObjectiveKey, number>,
  weights: ObjectiveWeights
): number {
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0)
  if (totalWeight === 0) return 0

  let composite = 0
  for (const key of ALL_OBJECTIVES) {
    const w = (weights[key] ?? 0) / totalWeight
    composite += w * (normalized[key] ?? 0)
  }
  return clamp01(composite)
}

// ─── Pareto Frontier ────────────────────────────────────────────────────────

/**
 * Determine Pareto dominance: a dominates b if a is >= b in ALL objectives
 * and strictly > in at least one.
 */
function dominates(
  a: Record<ObjectiveKey, number>,
  b: Record<ObjectiveKey, number>
): boolean {
  let strictlyBetter = false
  for (const key of ALL_OBJECTIVES) {
    if ((a[key] ?? 0) < (b[key] ?? 0)) return false
    if ((a[key] ?? 0) > (b[key] ?? 0)) strictlyBetter = true
  }
  return strictlyBetter
}

/**
 * Compute Pareto frontier for a set of candidates.
 * Returns each point with its Pareto rank (0 = frontier).
 */
export function computeParetoFrontier(
  candidates: Array<{ armId: string; scores: Record<ObjectiveKey, number> }>
): ParetoPoint[] {
  const results: ParetoPoint[] = []

  // Assign Pareto rank using non-dominated sorting
  const remaining = candidates.map((c) => ({ ...c, rank: 0 }))
  let currentRank = 0

  while (remaining.length > 0) {
    const frontier: typeof remaining = []
    const dominated: typeof remaining = []

    for (const candidate of remaining) {
      let isDominated = false
      for (const other of remaining) {
        if (other === candidate) continue
        if (dominates(other.scores, candidate.scores)) {
          isDominated = true
          break
        }
      }
      if (isDominated) {
        dominated.push(candidate)
      } else {
        candidate.rank = currentRank
        frontier.push(candidate)
      }
    }

    for (const f of frontier) {
      results.push({
        armId: f.armId,
        scores: f.scores,
        isParetoOptimal: f.rank === 0,
        rank: f.rank,
      })
    }

    // Move dominated to next rank iteration
    remaining.length = 0
    remaining.push(...dominated)
    currentRank++
  }

  return results
}

// ─── Dynamic Objective Prioritization ───────────────────────────────────────

/**
 * Adjust objective weights based on system state.
 * - High rollback count → increase stability weight
 * - Low diversity → increase diversity weight
 * - Low conversion → increase conversion weight
 */
export function adjustWeightsForContext(
  base: ObjectiveWeights,
  context: {
    rollbackCount?: number
    diversityIndex?: number
    conversionRate?: number
    retentionRate?: number
  }
): ObjectiveWeights {
  const adjusted = { ...base }

  // Rollback history → boost stability
  if ((context.rollbackCount ?? 0) > 2) {
    adjusted.stability = Math.min(0.4, adjusted.stability + 0.15)
  }

  // Low diversity → boost diversity
  if ((context.diversityIndex ?? 1) < 0.3) {
    adjusted.diversity = Math.min(0.4, adjusted.diversity + 0.1)
  }

  // Low conversion → boost conversion
  if ((context.conversionRate ?? 1) < 0.05) {
    adjusted.conversion = Math.min(0.4, adjusted.conversion + 0.1)
  }

  // Low retention → boost retention
  if ((context.retentionRate ?? 1) < 0.3) {
    adjusted.retention = Math.min(0.4, adjusted.retention + 0.1)
  }

  // Re-normalize to sum to 1.0
  return normalizeWeights(adjusted)
}

/**
 * Normalize weights so they sum to 1.0.
 */
export function normalizeWeights(weights: ObjectiveWeights): ObjectiveWeights {
  const total = Object.values(weights).reduce((s, w) => s + w, 0)
  if (total === 0) return { ...DEFAULT_OBJECTIVE_WEIGHTS }
  const result = {} as ObjectiveWeights
  for (const key of ALL_OBJECTIVES) {
    result[key] = (weights[key] ?? 0) / total
  }
  return result
}

// ─── Full Multi-Objective Evaluation ────────────────────────────────────────

/**
 * Evaluate a single arm across all objectives.
 */
export function evaluateMultiObjective(input: {
  armId: string
  rawScores: Record<ObjectiveKey, number>
  bounds: Record<ObjectiveKey, { min: number; max: number }>
  weights: ObjectiveWeights
  paretoResults?: ParetoPoint[]
}): MultiObjectiveResult {
  const normalized = normalizeObjectives(input.rawScores, input.bounds)
  const composite = computeCompositeScore(normalized, input.weights)

  const objectives: ObjectiveScore[] = ALL_OBJECTIVES.map((key) => ({
    objective: key,
    rawValue: input.rawScores[key] ?? 0,
    normalizedValue: normalized[key],
    weight: input.weights[key] ?? 0,
    weightedScore: normalized[key] * (input.weights[key] ?? 0),
  }))

  const pareto = input.paretoResults?.find((p) => p.armId === input.armId)

  return {
    compositeScore: composite,
    objectives,
    paretoRank: pareto?.rank ?? null,
    isParetoOptimal: pareto?.isParetoOptimal ?? false,
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

/**
 * Save objective weights to the active global policy config.
 */
export async function saveObjectiveWeights(weights: ObjectiveWeights, policyVersion: string): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("global_policy_config")
    .update({ objective_weights: weights })
    .eq("version", policyVersion)
    .eq("status", "draft")
}

/**
 * Load objective weights from the active global policy config.
 */
export async function loadObjectiveWeights(): Promise<ObjectiveWeights> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("global_policy_config")
    .select("objective_weights")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .single()

  if (!data?.objective_weights) return { ...DEFAULT_OBJECTIVE_WEIGHTS }

  const w = data.objective_weights
  return {
    ctr: w.ctr ?? DEFAULT_OBJECTIVE_WEIGHTS.ctr,
    conversion: w.conversion ?? DEFAULT_OBJECTIVE_WEIGHTS.conversion,
    retention: w.retention ?? DEFAULT_OBJECTIVE_WEIGHTS.retention,
    diversity: w.diversity ?? DEFAULT_OBJECTIVE_WEIGHTS.diversity,
    stability: w.stability ?? DEFAULT_OBJECTIVE_WEIGHTS.stability,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(1, v))
}
