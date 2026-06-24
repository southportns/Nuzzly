// =============================================
// POST /api/recommend/outcome
// Outcome Recommendation Engine — Timeline First Architecture
// Input: pet profile (breed, age, sterilized, sensitive_gut, symptoms)
// Output: ranked products with outcome predictions
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { recommendFoodByOutcome, matchOutcomeForPet } from "@/lib/timeline/outcome-recommendation"
import { buildTimelineContextFromDB } from "@/lib/timeline/context-builder"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { petId, breed, age, sterilized, sensitive_gut, symptoms, limit } = body

    // Mode 1: Pet-based recommendation (uses pet profile from DB)
    if (petId) {
      const result = await recommendFoodByOutcome(petId, limit ?? 5)
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Pet not found or no recommendations available" },
          { status: 404 }
        )
      }

      // Enrich top recommendation with timeline context
      if (result.recommendations.length > 0) {
        const topProduct = result.recommendations[0]
        const context = await buildTimelineContextFromDB(topProduct.product_id, petId)
        if (context) {
          result.recommendations[0] = {
            ...topProduct,
            timeline_context: {
              trust_score: context.trust_score,
              stability_rate: context.outcome_summary.stability_rate,
              symptom_progression: context.symptom_progression.slice(0, 3),
            },
          }
        }
      }

      return NextResponse.json({ success: true, data: result })
    }

    // Mode 2: Profile-based recommendation (no pet_id required)
    if (breed && age !== undefined) {
      const recommendations = await matchOutcomeForPet(
        {
          breed,
          age,
          sterilized: sterilized ?? false,
          sensitive_gut: sensitive_gut ?? false,
          symptoms,
        },
        limit ?? 10
      )

      return NextResponse.json({
        success: true,
        data: {
          input: { breed, age, sterilized, sensitive_gut, symptoms },
          recommendations,
          scoring_method: "outcome_recommendation",
          generated_at: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json(
      { success: false, error: "Missing required fields: petId or (breed + age)" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[outcome-recommend] error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("product_id")

  if (!productId) {
    return NextResponse.json(
      { success: false, error: "Missing product_id" },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.get_outcome_intel", {
    p_product_id: productId,
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
