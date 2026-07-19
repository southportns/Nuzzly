// =============================================
// Phase 3.95: Cohort Intelligence Layer
// Timeline First Architecture — Cohort-level outcome analysis
// =============================================

import { createClient } from "@/lib/supabase/server"
import { recordOutcomeEvent } from "@/lib/timeline/outcome-observability"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CohortIntelligence {
  id: string
  cohortKey: string
  cohortDefinition: Record<string, unknown>
  memberCount: number
  avgHealthScore: number | null
  avgImprovementRate: number | null
  avgEffectivenessScore: number | null
  topProducts: Array<{ productId: string; score: number }>
  baselineComparison: Record<string, unknown>
  version: number
  computedAt: string
}

export interface CohortMetrics {
  cohortKey: string
  memberCount: number
  avgHealthScore: number
  improvementRate: number
  effectivenessScore: number
  topProducts: Array<{ productId: string; score: number }>
}

// ─── Cohort Computation ─────────────────────────────────────────────────────

/**
 * Compute cohort-level metrics from longitudinal and effectiveness data.
 */
export function computeCohortMetrics(params: {
  cohortKey: string
  cohortDefinition: Record<string, unknown>
  healthScores: number[]
  improvementRates: number[]
  effectivenessScores: number[]
  productScores: Record<string, number>
}): CohortMetrics {
  const { healthScores, improvementRates, effectivenessScores, productScores } = params

  const avgHealthScore = healthScores.length > 0
    ? healthScores.reduce((s, v) => s + v, 0) / healthScores.length
    : 0

  const improvementRate = improvementRates.length > 0
    ? improvementRates.reduce((s, v) => s + v, 0) / improvementRates.length
    : 0

  const effectivenessScore = effectivenessScores.length > 0
    ? effectivenessScores.reduce((s, v) => s + v, 0) / effectivenessScores.length
    : 0

  // Top products by score
  const topProducts = Object.entries(productScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([productId, score]) => ({ productId, score }))

  return {
    cohortKey: params.cohortKey,
    memberCount: healthScores.length,
    avgHealthScore: round2(avgHealthScore),
    improvementRate: round4(improvementRate),
    effectivenessScore: round2(effectivenessScore),
    topProducts,
  }
}

/**
 * Compare cohort metrics against system-wide baseline.
 */
export function compareWithBaseline(
  cohort: CohortMetrics,
  baseline: {
    avgHealthScore: number
    improvementRate: number
    effectivenessScore: number
  }
): Record<string, unknown> {
  return {
    health_score_delta: round2(cohort.avgHealthScore - baseline.avgHealthScore),
    improvement_rate_delta: round4(cohort.improvementRate - baseline.improvementRate),
    effectiveness_score_delta: round2(cohort.effectivenessScore - baseline.effectivenessScore),
    health_score_ratio: baseline.avgHealthScore > 0
      ? round2(cohort.avgHealthScore / baseline.avgHealthScore)
      : null,
    improvement_rate_ratio: baseline.improvementRate > 0
      ? round2(cohort.improvementRate / baseline.improvementRate)
      : null,
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

export async function saveCohortIntelligence(input: {
  cohortKey: string
  cohortDefinition: Record<string, unknown>
  metrics: CohortMetrics
  baselineComparison: Record<string, unknown>
}): Promise<CohortIntelligence | null> {
  const supabase = await createClient()

  // Get next version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .schema("pflid")
    .from("cohort_intelligence")
    .select("version")
    .eq("cohort_key", input.cohortKey)
    .order("version", { ascending: false })
    .limit(1)

  const nextVersion = (existing?.[0]?.version ?? 0) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("cohort_intelligence")
    .insert({
      cohort_key: input.cohortKey,
      cohort_definition: input.cohortDefinition,
      member_count: input.metrics.memberCount,
      avg_health_score: input.metrics.avgHealthScore,
      avg_improvement_rate: input.metrics.improvementRate,
      avg_effectiveness_score: input.metrics.effectivenessScore,
      top_products: input.metrics.topProducts,
      baseline_comparison: input.baselineComparison,
      version: nextVersion,
    })
    .select()
    .single()

  if (error || !data) return null

  recordOutcomeEvent({
    type: "COHORT_INTELLIGENCE_UPDATED",
    entityId: input.cohortKey,
    segment: input.cohortKey,
    sampledValue: input.metrics.improvementRate,
    requestId: `cohort-${Date.now()}`,
    metadata: {
      member_count: input.metrics.memberCount,
      version: nextVersion,
    },
  })

  return mapCohortRow(data)
}

export async function getCohortIntelligence(params?: {
  cohortKey?: string
}): Promise<CohortIntelligence[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .schema("pflid")
    .from("cohort_intelligence")
    .select("*")
    .order("cohort_key")

  if (params?.cohortKey) query = query.eq("cohort_key", params.cohortKey)

  const { data, error } = await query

  if (error || !data) return []
  return data.map(mapCohortRow)
}

export async function compareCohorts(cohortKeys: string[]): Promise<{
  cohorts: CohortIntelligence[]
  comparison: Record<string, Record<string, unknown>>
} | null> {
  const cohorts = await getCohortIntelligence()
  const filtered = cohortKeys.length > 0
    ? cohorts.filter((c) => cohortKeys.includes(c.cohortKey))
    : cohorts

  if (filtered.length === 0) return null

  // Compute pairwise comparison
  const comparison: Record<string, Record<string, unknown>> = {}
  for (const cohort of filtered) {
    comparison[cohort.cohortKey] = {
      member_count: cohort.memberCount,
      avg_health_score: cohort.avgHealthScore,
      avg_improvement_rate: cohort.avgImprovementRate,
      avg_effectiveness_score: cohort.avgEffectivenessScore,
      baseline_comparison: cohort.baselineComparison,
    }
  }

  return { cohorts: filtered, comparison }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapCohortRow(row: Record<string, unknown>): CohortIntelligence {
  return {
    id: row.id as string,
    cohortKey: row.cohort_key as string,
    cohortDefinition: (row.cohort_definition as Record<string, unknown>) ?? {},
    memberCount: row.member_count as number,
    avgHealthScore: row.avg_health_score as number | null,
    avgImprovementRate: row.avg_improvement_rate as number | null,
    avgEffectivenessScore: row.avg_effectiveness_score as number | null,
    topProducts: (row.top_products as Array<{ productId: string; score: number }>) ?? [],
    baselineComparison: (row.baseline_comparison as Record<string, unknown>) ?? {},
    version: row.version as number,
    computedAt: row.computed_at as string,
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000
}
