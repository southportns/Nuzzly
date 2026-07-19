// =============================================
// Phase 3.95: Outcome Attribution Engine
// Timeline First Architecture — Determines WHY a recommendation succeeded or failed
// =============================================

import { createClient } from "@/lib/supabase/server"
import { recordOutcomeEvent } from "@/lib/timeline/outcome-observability"

// ─── Types ──────────────────────────────────────────────────────────────────

export const OUTCOME_WINDOWS = [7, 30, 90, 180] as const
export type OutcomeWindowDays = (typeof OUTCOME_WINDOWS)[number]

export interface ContributionBreakdown {
  timeline: number
  strategy: number
  bandit: number
  segment: number
  random: number
}

export interface AttributionResult {
  id: string
  recommendationId: string
  petId: string
  productId: string
  outcomeWindowDays: OutcomeWindowDays
  outcomeSuccess: boolean
  outcomeConfidence: number
  successProbability: number
  contribution: ContributionBreakdown
  healthScoreDelta: number | null
  symptomImprovement: Record<string, unknown>
  ownerAdherence: number | null
  createdAt: string
}

export interface AttributionInput {
  recommendationId: string
  petId: string
  productId: string
  outcomeWindowDays: OutcomeWindowDays
  healthScoreDelta?: number
  symptomImprovement?: Record<string, unknown>
  ownerAdherence?: number
  strategyId?: string
  policyVersion?: string
  segmentKey?: string
}

// ─── Attribution Computation ────────────────────────────────────────────────

/**
 * Compute attribution breakdown for a recommendation outcome.
 * Uses a deterministic, reproducible algorithm based on:
 * - Timeline signal strength (event count, sentiment trend)
 * - Strategy historical performance
 * - Bandit selection confidence
 * - Segment policy alignment
 * - Residual (random factors)
 */
export function computeAttribution(input: {
  timelineSignalStrength: number  // 0-1
  strategyPerformance: number     // 0-1
  banditConfidence: number        // 0-1
  segmentAlignment: number        // 0-1
}): ContributionBreakdown {
  const { timelineSignalStrength, strategyPerformance, banditConfidence, segmentAlignment } = input

  // Weighted contribution (weights reflect relative importance)
  const wTimeline = 0.35
  const wStrategy = 0.30
  const wBandit = 0.15
  const wSegment = 0.10
  const wRandom = 0.10

  const raw = {
    timeline: timelineSignalStrength * wTimeline,
    strategy: strategyPerformance * wStrategy,
    bandit: banditConfidence * wBandit,
    segment: segmentAlignment * wSegment,
    random: wRandom,
  }

  // Normalize to sum to 1.0
  const total = Object.values(raw).reduce((s, v) => s + v, 0)
  if (total === 0) {
    return { timeline: 0, strategy: 0, bandit: 0, segment: 0, random: 1 }
  }

  return {
    timeline: round4(raw.timeline / total),
    strategy: round4(raw.strategy / total),
    bandit: round4(raw.bandit / total),
    segment: round4(raw.segment / total),
    random: round4(raw.random / total),
  }
}

/**
 * Estimate outcome confidence based on data quality and sample size.
 */
export function estimateConfidence(params: {
  timelineEventCount: number
  dataFreshnessDays: number
  outcomeClarity: number  // 0-1, how clear the outcome signal is
}): number {
  const { timelineEventCount, dataFreshnessDays, outcomeClarity } = params

  // Timeline count factor (saturates at 50 events)
  const countFactor = Math.min(1, timelineEventCount / 50)

  // Freshness factor (decays after 30 days)
  const freshnessFactor = Math.max(0, 1 - dataFreshnessDays / 180)

  // Combined confidence
  const confidence = 0.4 * countFactor + 0.3 * freshnessFactor + 0.3 * outcomeClarity

  return round4(clamp01(confidence))
}

/**
 * Estimate success probability based on health score delta and symptom improvement.
 */
export function estimateSuccessProbability(params: {
  healthScoreDelta: number  // -1 to +1
  symptomImprovementRatio: number  // 0-1
  ownerAdherence: number  // 0-1
}): number {
  const { healthScoreDelta, symptomImprovementRatio, ownerAdherence } = params

  // Normalize health score delta to 0-1
  const healthFactor = clamp01((healthScoreDelta + 1) / 2)

  const prob = 0.4 * healthFactor + 0.35 * symptomImprovementRatio + 0.25 * ownerAdherence

  return round4(clamp01(prob))
}

// ─── Persistence ────────────────────────────────────────────────────────────

export async function saveAttribution(input: AttributionInput & {
  contribution: ContributionBreakdown
  outcomeConfidence: number
  successProbability: number
  outcomeSuccess: boolean
}): Promise<AttributionResult | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("outcome_attribution")
    .insert({
      recommendation_id: input.recommendationId,
      pet_id: input.petId,
      product_id: input.productId,
      outcome_window_days: input.outcomeWindowDays,
      outcome_success: input.outcomeSuccess,
      outcome_confidence: input.outcomeConfidence,
      success_probability: input.successProbability,
      contribution_timeline: input.contribution.timeline,
      contribution_strategy: input.contribution.strategy,
      contribution_bandit: input.contribution.bandit,
      contribution_segment: input.contribution.segment,
      contribution_random: input.contribution.random,
      health_score_delta: input.healthScoreDelta ?? null,
      symptom_improvement: input.symptomImprovement ?? {},
      owner_adherence: input.ownerAdherence ?? null,
      strategy_id: input.strategyId ?? null,
      policy_version: input.policyVersion ?? null,
      segment_key: input.segmentKey ?? null,
    })
    .select()
    .single()

  if (error || !data) return null

  recordOutcomeEvent({
    type: "ATTRIBUTION_COMPUTED",
    entityId: input.recommendationId,
    segment: input.segmentKey ?? "global",
    sampledValue: input.successProbability,
    requestId: `attr-${Date.now()}`,
    metadata: {
      outcome_success: input.outcomeSuccess,
      confidence: input.outcomeConfidence,
      contribution: input.contribution,
    },
  })

  return mapAttributionRow(data)
}

export async function getAttributionForRecommendation(
  recommendationId: string
): Promise<AttributionResult[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("outcome_attribution")
    .select("*")
    .eq("recommendation_id", recommendationId)
    .order("outcome_window_days", { ascending: true })

  if (error || !data) return []
  return data.map(mapAttributionRow)
}

export async function getAttributionStats(params: {
  productId?: string
  outcomeWindowDays?: OutcomeWindowDays
  limit?: number
}): Promise<{
  totalAttributions: number
  successRate: number
  avgConfidence: number
  avgContribution: ContributionBreakdown
}> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .schema("pflid")
    .from("outcome_attribution")
    .select("outcome_success, outcome_confidence, contribution_timeline, contribution_strategy, contribution_bandit, contribution_segment, contribution_random")

  if (params.productId) {
    query = query.eq("product_id", params.productId)
  }
  if (params.outcomeWindowDays) {
    query = query.eq("outcome_window_days", params.outcomeWindowDays)
  }

  const { data, error } = await query.limit(params.limit ?? 1000)

  if (error || !data || data.length === 0) {
    return {
      totalAttributions: 0,
      successRate: 0,
      avgConfidence: 0,
      avgContribution: { timeline: 0, strategy: 0, bandit: 0, segment: 0, random: 0 },
    }
  }

  const total = data.length
  const successCount = data.filter((d: { outcome_success: boolean }) => d.outcome_success).length
  const avgConfidence = data.reduce((s: number, d: { outcome_confidence: number | null }) => s + (d.outcome_confidence ?? 0), 0) / total

  return {
    totalAttributions: total,
    successRate: round4(successCount / total),
    avgConfidence: round4(avgConfidence),
    avgContribution: {
      timeline: round4(data.reduce((s: number, d: { contribution_timeline: number | null }) => s + (d.contribution_timeline ?? 0), 0) / total),
      strategy: round4(data.reduce((s: number, d: { contribution_strategy: number | null }) => s + (d.contribution_strategy ?? 0), 0) / total),
      bandit: round4(data.reduce((s: number, d: { contribution_bandit: number | null }) => s + (d.contribution_bandit ?? 0), 0) / total),
      segment: round4(data.reduce((s: number, d: { contribution_segment: number | null }) => s + (d.contribution_segment ?? 0), 0) / total),
      random: round4(data.reduce((s: number, d: { contribution_random: number | null }) => s + (d.contribution_random ?? 0), 0) / total),
    },
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapAttributionRow(row: Record<string, unknown>): AttributionResult {
  return {
    id: row.id as string,
    recommendationId: row.recommendation_id as string,
    petId: row.pet_id as string,
    productId: row.product_id as string,
    outcomeWindowDays: row.outcome_window_days as OutcomeWindowDays,
    outcomeSuccess: row.outcome_success as boolean,
    outcomeConfidence: row.outcome_confidence as number,
    successProbability: row.success_probability as number,
    contribution: {
      timeline: row.contribution_timeline as number,
      strategy: row.contribution_strategy as number,
      bandit: row.contribution_bandit as number,
      segment: row.contribution_segment as number,
      random: row.contribution_random as number,
    },
    healthScoreDelta: row.health_score_delta as number | null,
    symptomImprovement: (row.symptom_improvement as Record<string, unknown>) ?? {},
    ownerAdherence: row.owner_adherence as number | null,
    createdAt: row.created_at as string,
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
