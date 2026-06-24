// =============================================
// Phase 3.9: Cross-Segment Policy System
// Timeline First Architecture — Segmentation-aware policy selection
// =============================================
// Each segment can have different bandit weights, reward priorities,
// and exploration constraints. The global orchestrator queries this
// module to get per-segment adjustments before passing them to the
// bandit layer (Phase 3.8).

import { createClient } from "@/lib/supabase/server"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"
import type { ObjectiveWeights } from "@/lib/timeline/multi-objective"
import { DEFAULT_OBJECTIVE_WEIGHTS } from "@/lib/timeline/multi-objective"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SegmentPolicy {
  segmentKey: SegmentKey
  description: string | null
  armWeightOverrides: Record<string, number>
  rewardPriority: Record<string, number>
  explorationCapPct: number
  minQualityScore: number
  isActive: boolean
}

export interface SegmentPolicyAdjustment {
  segmentKey: SegmentKey
  armWeightMultiplier: Record<string, number>
  rewardWeightMultiplier: Record<string, number>
  explorationCapPct: number
  objectiveWeights: ObjectiveWeights
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/**
 * Fetch all active segment policies.
 */
export async function listSegmentPolicies(): Promise<SegmentPolicy[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("segment_policies")
    .select("*")
    .eq("is_active", true)
    .order("segment_key")

  if (error || !data) return []

  return data.map((row: any) => ({
    segmentKey: row.segment_key as SegmentKey,
    description: row.description,
    armWeightOverrides: row.arm_weight_overrides ?? {},
    rewardPriority: row.reward_priority ?? {},
    explorationCapPct: Number(row.exploration_cap_pct) ?? 15,
    minQualityScore: Number(row.min_quality_score) ?? 0.2,
    isActive: row.is_active,
  }))
}

/**
 * Get policy for a specific segment.
 */
export async function getSegmentPolicy(segmentKey: SegmentKey): Promise<SegmentPolicy | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("segment_policies")
    .select("*")
    .eq("segment_key", segmentKey)
    .single()

  if (!data) return null

  return {
    segmentKey: data.segment_key as SegmentKey,
    description: data.description,
    armWeightOverrides: data.arm_weight_overrides ?? {},
    rewardPriority: data.reward_priority ?? {},
    explorationCapPct: Number(data.exploration_cap_pct) ?? 15,
    minQualityScore: Number(data.min_quality_score) ?? 0.2,
    isActive: data.is_active,
  }
}

// ─── Policy Adjustment Computation ──────────────────────────────────────────

/**
 * Compute the full segment policy adjustment for a given segment.
 * Combines:
 *   - Global objective weights (from multi-objective engine)
 *   - Segment-specific reward priority overrides
 *   - Segment-specific arm weight overrides
 *   - Segment-specific exploration caps
 */
export async function computeSegmentAdjustment(
  segmentKey: SegmentKey,
  globalWeights: ObjectiveWeights
): Promise<SegmentPolicyAdjustment> {
  const policy = await getSegmentPolicy(segmentKey)

  if (!policy) {
    // Fallback: no segment-specific adjustments
    return {
      segmentKey,
      armWeightMultiplier: {},
      rewardWeightMultiplier: {},
      explorationCapPct: 15,
      objectiveWeights: globalWeights,
    }
  }

  // Apply reward priority overrides to global weights
  const adjustedWeights = { ...globalWeights }
  for (const [key, multiplier] of Object.entries(policy.rewardPriority)) {
    if (key in adjustedWeights) {
      adjustedWeights[key as keyof ObjectiveWeights] *= multiplier
    }
  }

  // Re-normalize weights
  const total = Object.values(adjustedWeights).reduce((s, w) => s + w, 0)
  if (total > 0) {
    for (const key of Object.keys(adjustedWeights) as (keyof ObjectiveWeights)[]) {
      adjustedWeights[key] /= total
    }
  }

  return {
    segmentKey,
    armWeightMultiplier: policy.armWeightOverrides,
    rewardWeightMultiplier: policy.rewardPriority,
    explorationCapPct: policy.explorationCapPct,
    objectiveWeights: adjustedWeights,
  }
}

/**
 * Compute adjustments for ALL active segments at once.
 * Used by the global policy orchestrator during compute cycles.
 */
export async function computeAllSegmentAdjustments(
  globalWeights: ObjectiveWeights
): Promise<Record<SegmentKey, SegmentPolicyAdjustment>> {
  const policies = await listSegmentPolicies()
  const result: Record<SegmentKey, SegmentPolicyAdjustment> = {} as any

  for (const policy of policies) {
    result[policy.segmentKey] = await computeSegmentAdjustment(policy.segmentKey, globalWeights)
  }

  // Ensure global segment always exists
  if (!result.global) {
    result.global = {
      segmentKey: "global",
      armWeightMultiplier: {},
      rewardWeightMultiplier: {},
      explorationCapPct: 15,
      objectiveWeights: globalWeights,
    }
  }

  return result
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * Update a segment policy.
 */
export async function updateSegmentPolicy(input: {
  segmentKey: SegmentKey
  armWeightOverrides?: Record<string, number>
  rewardPriority?: Record<string, number>
  explorationCapPct?: number
  minQualityScore?: number
  description?: string
}): Promise<SegmentPolicy | null> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.armWeightOverrides !== undefined) patch.arm_weight_overrides = input.armWeightOverrides
  if (input.rewardPriority !== undefined) patch.reward_priority = input.rewardPriority
  if (input.explorationCapPct !== undefined) patch.exploration_cap_pct = input.explorationCapPct
  if (input.minQualityScore !== undefined) patch.min_quality_score = input.minQualityScore
  if (input.description !== undefined) patch.description = input.description

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("segment_policies")
    .update(patch)
    .eq("segment_key", input.segmentKey)
    .select("*")
    .single()

  if (error || !data) return null

  return {
    segmentKey: data.segment_key as SegmentKey,
    description: data.description,
    armWeightOverrides: data.arm_weight_overrides ?? {},
    rewardPriority: data.reward_priority ?? {},
    explorationCapPct: Number(data.exploration_cap_pct) ?? 15,
    minQualityScore: Number(data.min_quality_score) ?? 0.2,
    isActive: data.is_active,
  }
}
