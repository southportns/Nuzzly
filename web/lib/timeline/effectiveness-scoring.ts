// =============================================
// Phase 3.95: Recommendation Effectiveness Scoring
// Timeline First Architecture — Evaluate recommendation quality, accuracy, consistency, safety
// =============================================

import { createClient } from "@/lib/supabase/server"
import { recordOutcomeEvent } from "@/lib/timeline/outcome-observability"

// ─── Types ──────────────────────────────────────────────────────────────────

export type EntityType = "product" | "strategy" | "policy" | "category"

export interface EffectivenessScore {
  id: string
  entityType: EntityType
  entityId: string
  qualityScore: number
  accuracyScore: number
  consistencyScore: number
  safetyScore: number
  effectivenessScore: number
  sampleCount: number
  outcomeSuccessRate: number | null
  avgConfidence: number | null
  version: number
  computedAt: string
}

export interface EffectivenessInput {
  entityType: EntityType
  entityId: string
  qualityScore: number
  accuracyScore: number
  consistencyScore: number
  safetyScore: number
  sampleCount?: number
  outcomeSuccessRate?: number
  avgConfidence?: number
}

// ─── Scoring ────────────────────────────────────────────────────────────────

/**
 * Compute composite effectiveness score (0-100).
 * Weighted combination of quality, accuracy, consistency, and safety.
 */
export function computeEffectivenessScore(input: {
  qualityScore: number
  accuracyScore: number
  consistencyScore: number
  safetyScore: number
}): number {
  const { qualityScore, accuracyScore, consistencyScore, safetyScore } = input

  // Weights: safety is paramount, then accuracy, quality, consistency
  const wSafety = 0.30
  const wAccuracy = 0.30
  const wQuality = 0.25
  const wConsistency = 0.15

  const score =
    wSafety * clamp01(safetyScore) +
    wAccuracy * clamp01(accuracyScore) +
    wQuality * clamp01(qualityScore) +
    wConsistency * clamp01(consistencyScore)

  return round2(score * 100)
}

/**
 * Derive quality score from outcome data.
 * Based on: recommendation-to-outcome conversion rate, timeline signal quality.
 */
export function deriveQualityScore(params: {
  outcomeSuccessRate: number
  timelineSignalQuality: number
  sampleSize: number
}): number {
  const { outcomeSuccessRate, timelineSignalQuality, sampleSize } = params

  // Sample size confidence factor (saturates at 100)
  const sizeFactor = Math.min(1, sampleSize / 100)

  return clamp01(0.5 * outcomeSuccessRate + 0.3 * timelineSignalQuality + 0.2 * sizeFactor)
}

/**
 * Derive accuracy score from attribution data.
 * Based on: how well predicted outcomes matched actual outcomes.
 */
export function deriveAccuracyScore(params: {
  predictionAccuracy: number
  attributionConfidence: number
}): number {
  const { predictionAccuracy, attributionConfidence } = params
  return clamp01(0.6 * predictionAccuracy + 0.4 * attributionConfidence)
}

/**
 * Derive consistency score from longitudinal data.
 * Based on: outcome stability across time horizons.
 */
export function deriveConsistencyScore(params: {
  outcomeStability: number  // variance of outcomes (lower = more consistent)
  horizonAgreement: number  // how consistent outcomes are across 7/30/90/180 day windows
}): number {
  const { outcomeStability, horizonAgreement } = params
  return clamp01(0.5 * (1 - outcomeStability) + 0.5 * horizonAgreement)
}

/**
 * Derive safety score from adverse event data.
 * Based on: absence of negative health outcomes.
 */
export function deriveSafetyScore(params: {
  adverseEventRate: number
  rollbackRate: number
  minQualityMet: boolean
}): number {
  const { adverseEventRate, rollbackRate, minQualityMet } = params

  if (!minQualityMet) return 0

  return clamp01(1 - 0.7 * adverseEventRate - 0.3 * rollbackRate)
}

// ─── Persistence ────────────────────────────────────────────────────────────

export async function saveEffectivenessScore(input: EffectivenessInput): Promise<EffectivenessScore | null> {
  const supabase = await createClient()

  const effectivenessScore = computeEffectivenessScore({
    qualityScore: input.qualityScore,
    accuracyScore: input.accuracyScore,
    consistencyScore: input.consistencyScore,
    safetyScore: input.safetyScore,
  })

  // Get next version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .schema("pflid")
    .from("effectiveness_scores")
    .select("version")
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .order("version", { ascending: false })
    .limit(1)

  const nextVersion = (existing?.[0]?.version ?? 0) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("effectiveness_scores")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      quality_score: round2(input.qualityScore * 100),
      accuracy_score: round2(input.accuracyScore * 100),
      consistency_score: round2(input.consistencyScore * 100),
      safety_score: round2(input.safetyScore * 100),
      effectiveness_score: effectivenessScore,
      sample_count: input.sampleCount ?? 0,
      outcome_success_rate: input.outcomeSuccessRate ?? null,
      avg_confidence: input.avgConfidence ?? null,
      version: nextVersion,
    })
    .select()
    .single()

  if (error || !data) return null

  recordOutcomeEvent({
    type: "EFFECTIVENESS_SCORED",
    entityId: input.entityId,
    segment: "global",
    sampledValue: effectivenessScore / 100,
    requestId: `eff-${Date.now()}`,
    metadata: {
      entity_type: input.entityType,
      effectiveness_score: effectivenessScore,
      version: nextVersion,
    },
  })

  return mapScoreRow(data)
}

export async function getEffectivenessScores(params: {
  entityType?: EntityType
  entityId?: string
  limit?: number
}): Promise<EffectivenessScore[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .schema("pflid")
    .from("effectiveness_scores")
    .select("*")
    .order("effectiveness_score", { ascending: false })

  if (params.entityType) query = query.eq("entity_type", params.entityType)
  if (params.entityId) query = query.eq("entity_id", params.entityId)

  const { data, error } = await query.limit(params.limit ?? 50)

  if (error || !data) return []
  return data.map(mapScoreRow)
}

export async function getTopEffectiveEntities(
  entityType: EntityType,
  limit = 10
): Promise<EffectivenessScore[]> {
  return getEffectivenessScores({ entityType, limit })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapScoreRow(row: Record<string, unknown>): EffectivenessScore {
  return {
    id: row.id as string,
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id as string,
    qualityScore: row.quality_score as number,
    accuracyScore: row.accuracy_score as number,
    consistencyScore: row.consistency_score as number,
    safetyScore: row.safety_score as number,
    effectivenessScore: row.effectiveness_score as number,
    sampleCount: row.sample_count as number,
    outcomeSuccessRate: row.outcome_success_rate as number | null,
    avgConfidence: row.avg_confidence as number | null,
    version: row.version as number,
    computedAt: row.computed_at as string,
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
