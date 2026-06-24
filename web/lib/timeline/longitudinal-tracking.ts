// =============================================
// Phase 3.95: Longitudinal Outcome Tracking System
// Timeline First Architecture — Track outcomes over time
// =============================================

import { createClient } from "@/lib/supabase/server"
import { recordOutcomeEvent } from "@/lib/timeline/outcome-observability"

// ─── Types ──────────────────────────────────────────────────────────────────

export const HORIZON_DAYS = [7, 30, 90, 180] as const
export type HorizonDays = (typeof HORIZON_DAYS)[number]
export type OutcomeClass = "improved" | "stable" | "worsened" | "unknown"

export interface LongitudinalRecord {
  id: string
  petId: string
  productId: string
  horizonDays: HorizonDays
  healthScore: number | null
  healthScoreBaseline: number | null
  healthScoreDelta: number | null
  symptomCount: number
  symptomRecurrence: number
  dietStability: boolean | null
  ownerAdherence: number | null
  outcomeClass: OutcomeClass
  measuredAt: string
  createdAt: string
}

export interface LongitudinalInput {
  petId: string
  productId: string
  horizonDays: HorizonDays
  healthScore?: number
  healthScoreBaseline?: number
  symptomCount?: number
  symptomRecurrence?: number
  dietStability?: boolean
  ownerAdherence?: number
}

// ─── Classification ─────────────────────────────────────────────────────────

export function classifyOutcome(params: {
  healthScoreDelta: number | null
  symptomRecurrence: number
  dietStability: boolean | null
}): OutcomeClass {
  const { healthScoreDelta, symptomRecurrence, dietStability } = params

  if (healthScoreDelta === null) return "unknown"

  if (healthScoreDelta > 0.1 && symptomRecurrence === 0) return "improved"
  if (healthScoreDelta < -0.1 || symptomRecurrence >= 3) return "worsened"
  if (dietStability === true) return "stable"

  return "stable"
}

// ─── Persistence ────────────────────────────────────────────────────────────

export async function saveLongitudinalRecord(input: LongitudinalInput): Promise<LongitudinalRecord | null> {
  const supabase = await createClient()

  const healthScoreDelta = input.healthScore !== undefined && input.healthScoreBaseline !== undefined
    ? input.healthScore - input.healthScoreBaseline
    : null

  const outcomeClass = classifyOutcome({
    healthScoreDelta,
    symptomRecurrence: input.symptomRecurrence ?? 0,
    dietStability: input.dietStability ?? null,
  })

  const { data, error } = await supabase
    .from("pflid.longitudinal_outcomes")
    .insert({
      pet_id: input.petId,
      product_id: input.productId,
      horizon_days: input.horizonDays,
      health_score: input.healthScore ?? null,
      health_score_baseline: input.healthScoreBaseline ?? null,
      health_score_delta: healthScoreDelta,
      symptom_count: input.symptomCount ?? 0,
      symptom_recurrence: input.symptomRecurrence ?? 0,
      diet_stability: input.dietStability ?? null,
      owner_adherence: input.ownerAdherence ?? null,
      outcome_class: outcomeClass,
    })
    .select()
    .single()

  if (error || !data) return null

  recordOutcomeEvent({
    type: "LONGITUDINAL_RECORDED",
    entityId: input.petId,
    segment: "global",
    sampledValue: healthScoreDelta ?? 0,
    requestId: `long-${Date.now()}`,
    metadata: {
      product_id: input.productId,
      horizon_days: input.horizonDays,
      outcome_class: outcomeClass,
    },
  })

  return mapLongitudinalRow(data)
}

export async function getLongitudinalRecords(params: {
  petId?: string
  productId?: string
  horizonDays?: HorizonDays
  outcomeClass?: OutcomeClass
  limit?: number
}): Promise<LongitudinalRecord[]> {
  const supabase = await createClient()

  let query = supabase
    .from("pflid.longitudinal_outcomes")
    .select("*")
    .order("measured_at", { ascending: false })

  if (params.petId) query = query.eq("pet_id", params.petId)
  if (params.productId) query = query.eq("product_id", params.productId)
  if (params.horizonDays) query = query.eq("horizon_days", params.horizonDays)
  if (params.outcomeClass) query = query.eq("outcome_class", params.outcomeClass)

  const { data, error } = await query.limit(params.limit ?? 100)

  if (error || !data) return []
  return data.map(mapLongitudinalRow)
}

export async function getLongitudinalStats(params: {
  productId?: string
  horizonDays?: HorizonDays
}): Promise<{
  totalRecords: number
  improvedRate: number
  stableRate: number
  worsenedRate: number
  avgHealthScoreDelta: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from("pflid.longitudinal_outcomes")
    .select("outcome_class, health_score_delta")

  if (params.productId) query = query.eq("product_id", params.productId)
  if (params.horizonDays) query = query.eq("horizon_days", params.horizonDays)

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    return { totalRecords: 0, improvedRate: 0, stableRate: 0, worsenedRate: 0, avgHealthScoreDelta: 0 }
  }

  const total = data.length
  const improved = data.filter((d) => d.outcome_class === "improved").length
  const stable = data.filter((d) => d.outcome_class === "stable").length
  const worsened = data.filter((d) => d.outcome_class === "worsened").length
  const avgDelta = data.reduce((s, d) => s + (d.health_score_delta ?? 0), 0) / total

  return {
    totalRecords: total,
    improvedRate: round4(improved / total),
    stableRate: round4(stable / total),
    worsenedRate: round4(worsened / total),
    avgHealthScoreDelta: round4(avgDelta),
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapLongitudinalRow(row: Record<string, unknown>): LongitudinalRecord {
  return {
    id: row.id as string,
    petId: row.pet_id as string,
    productId: row.product_id as string,
    horizonDays: row.horizon_days as HorizonDays,
    healthScore: row.health_score as number | null,
    healthScoreBaseline: row.health_score_baseline as number | null,
    healthScoreDelta: row.health_score_delta as number | null,
    symptomCount: row.symptom_count as number,
    symptomRecurrence: row.symptom_recurrence as number,
    dietStability: row.diet_stability as boolean | null,
    ownerAdherence: row.owner_adherence as number | null,
    outcomeClass: row.outcome_class as OutcomeClass,
    measuredAt: row.measured_at as string,
    createdAt: row.created_at as string,
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000
}
