// =============================================
// Longitudinal Score Engine — TypeScript Service Layer
// Replaces: score_product_for_pet() (Review-based weighted scoring)
// Source of Truth: pflid.timeline_metrics_daily
// =============================================

import { createClient } from "@/lib/supabase/server"

export interface LongitudinalScore {
  product_id: string
  overall_score: number
  stability_score: number
  repurchase_score: number
  risk_score: number
  timeline_count: number
  decay_curve: {
    month_1: number
    month_3: number
    month_6: number
  }
  trust_weighted_score: number
  calculated_at: string
}

export interface ScoredProductForPet {
  product_id: string
  pet_id: string
  score: number
  dimensions: {
    longitudinal_overall: number
    stability_score: number
    repurchase_score: number
    risk_score: number
    breed_match: number
    symptom_penalty: number
    day30_stability: number
    day90_soft_stool_rate: number
    day180_repurchase_rate: number
  }
  risk_count: number
  breed: string
  stomach_health: string
  scoring_method: "timeline_longitudinal"
}

// Calculate longitudinal score for a product
export async function calculateLongitudinalScore(
  productId: string
): Promise<LongitudinalScore | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.calculate_longitudinal_score", {
    p_product_id: productId,
  })
  if (error || !data) return null
  return data as LongitudinalScore
}

// Score a product for a specific pet (Timeline-based)
export async function scoreProductForPetTimeline(
  productId: string,
  petId: string
): Promise<ScoredProductForPet | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.score_product_for_pet_timeline", {
    p_product_id: productId,
    p_pet_id: petId,
  })
  if (error || !data) return null
  return data as ScoredProductForPet
}

// Batch score products for a pet
export async function batchScoreProductsForPet(
  productIds: string[],
  petId: string
): Promise<ScoredProductForPet[]> {
  const results: ScoredProductForPet[] = []
  for (const id of productIds) {
    const score = await scoreProductForPetTimeline(id, petId)
    if (score) results.push(score)
  }
  return results.sort((a, b) => b.score - a.score)
}

// Get longitudinal scores for multiple products
export async function getLongitudinalScores(
  productIds: string[]
): Promise<Map<string, LongitudinalScore>> {
  const scores = new Map<string, LongitudinalScore>()
  for (const id of productIds) {
    const score = await calculateLongitudinalScore(id)
    if (score) scores.set(id, score)
  }
  return scores
}
