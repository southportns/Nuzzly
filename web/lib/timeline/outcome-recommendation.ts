// =============================================
// Outcome Recommendation Engine — TypeScript Service Layer
// Timeline First Architecture: Outcome-based Food Recommendation
// Source of Truth: pflid.timeline_metrics_daily
// =============================================

import { createClient } from "@/lib/supabase/server"

export interface OutcomeRecommendationInput {
  breed: string
  age: number
  sterilized: boolean
  sensitive_gut: boolean
  symptoms?: string[]
}

export interface OutcomeRecommendationOutput {
  product_id: string
  product_name: string
  brand: string
  stability_rate: number
  soft_stool_risk: number
  black_chin_risk: number
  vomiting_risk: number
  repurchase_rate: number
  confidence: number
  matched_timelines: number
  decay_curve: {
    month_1: number
    month_3: number
    month_6: number
  }
  longitudinal_score: number
  timeline_context?: {
    trust_score: number
    stability_rate: number
    symptom_progression: {
      symptom: string
      first_seen_day: number
      last_seen_day: number
      frequency: number
      trend: "improving" | "stable" | "worsening"
    }[]
  }
}

export interface OutcomeRecommendationResult {
  pet_id: string
  pet_profile: {
    breed: string
    age: number
    sterilized: boolean
    sensitive_gut: boolean
  }
  recommendations: OutcomeRecommendationOutput[]
  scoring_method: "outcome_recommendation"
  generated_at: string
}

export interface OutcomeIntel {
  product_id: string
  stability_rate: number
  soft_stool_risk: number
  black_chin_risk: number
  vomiting_risk: number
  repurchase_rate: number
  trust_weighted_score: number
  longitudinal_score: Record<string, unknown>
  timeline_count: number
  stat_date: string
}

// Recommend food by outcome (pet-based)
export async function recommendFoodByOutcome(
  petId: string,
  limit = 5
): Promise<OutcomeRecommendationResult | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.recommend_food_by_outcome", {
    p_pet_id: petId,
    p_limit: limit,
  })
  if (error || !data) return null
  return data as OutcomeRecommendationResult
}

// Match outcome for pet (profile-based, no pet_id required)
export async function matchOutcomeForPet(
  input: OutcomeRecommendationInput,
  limit = 10
): Promise<OutcomeRecommendationOutput[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.match_outcome_for_pet", {
    p_breed: input.breed,
    p_age: input.age,
    p_sterilized: input.sterilized,
    p_sensitive_gut: input.sensitive_gut,
    p_symptoms: input.symptoms ?? null,
    p_limit: limit,
  })
  if (error || !data) return []
  return data as OutcomeRecommendationOutput[]
}

// Get outcome intel for a single product
export async function getOutcomeIntel(
  productId: string
): Promise<OutcomeIntel | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.get_outcome_intel", {
    p_product_id: productId,
  })
  if (error || !data) return null
  return data as OutcomeIntel
}

// Batch get outcome intel for multiple products
export async function batchGetOutcomeIntel(
  productIds: string[]
): Promise<Map<string, OutcomeIntel>> {
  const intel = new Map<string, OutcomeIntel>()
  for (const id of productIds) {
    const result = await getOutcomeIntel(id)
    if (result) intel.set(id, result)
  }
  return intel
}
