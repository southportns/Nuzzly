// POST /api/admin/outcomes/attribution
// Computes and retrieves outcome attribution for a recommendation

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { computeAttribution, estimateConfidence, estimateSuccessProbability, saveAttribution, getAttributionForRecommendation, getAttributionStats, type AttributionInput, type OutcomeWindowDays } from "@/lib/timeline/outcome-attribution"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) }
  }
  return { user }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { action, ...params } = body

    if (action === "compute") {
      // Compute attribution without saving
      const { timelineSignalStrength, strategyPerformance, banditConfidence, segmentAlignment } = params
      const contribution = computeAttribution({
        timelineSignalStrength,
        strategyPerformance,
        banditConfidence,
        segmentAlignment,
      })
      return NextResponse.json({ success: true, data: { contribution } })
    }

    if (action === "save") {
      const {
        recommendationId, petId, productId, outcomeWindowDays,
        healthScoreDelta, symptomImprovement, ownerAdherence,
        strategyId, policyVersion, segmentKey,
        timelineSignalStrength, strategyPerformance, banditConfidence, segmentAlignment,
        timelineEventCount, dataFreshnessDays, outcomeClarity,
        predictionAccuracy,
      } = params

      const contribution = computeAttribution({
        timelineSignalStrength,
        strategyPerformance,
        banditConfidence,
        segmentAlignment,
      })

      const outcomeConfidence = estimateConfidence({
        timelineEventCount,
        dataFreshnessDays,
        outcomeClarity,
      })

      const successProbability = estimateSuccessProbability({
        healthScoreDelta,
        symptomImprovementRatio: Object.keys(symptomImprovement ?? {}).length > 0 ? 0.7 : 0.3,
        ownerAdherence,
      })

      const outcomeSuccess = healthScoreDelta > 0

      const result = await saveAttribution({
        recommendationId, petId, productId,
        outcomeWindowDays: outcomeWindowDays as OutcomeWindowDays,
        healthScoreDelta,
        symptomImprovement,
        ownerAdherence,
        strategyId,
        policyVersion,
        segmentKey,
        contribution,
        outcomeConfidence,
        successProbability,
        outcomeSuccess,
      })

      return NextResponse.json({ success: true, data: result })
    }

    // Default: get attribution for recommendation
    const { recommendationId } = params
    if (recommendationId) {
      const attributions = await getAttributionForRecommendation(recommendationId)
      return NextResponse.json({ success: true, data: { attributions } })
    }

    return NextResponse.json({ success: false, error: "Missing action or recommendationId" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
