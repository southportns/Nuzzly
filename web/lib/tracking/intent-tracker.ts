// =============================================
// Purchase Intent Tracking
// =============================================
// Tracks user interactions with products for conversion funnel analysis

import { createClient } from "@/lib/supabase/client"

export type IntentEventType =
  | "product_view"
  | "product_click"
  | "product_bookmark"
  | "product_unbookmark"
  | "product_review"
  | "product_followup"
  | "recommendation_accept"
  | "recommendation_reject"
  | "recommendation_click"

export async function trackIntentEvent(params: {
  userId: string
  eventType: IntentEventType
  productId?: string
  petId?: string
  recommendationId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = createClient()
    await supabase.from("intent_events").insert({
      profile_id: params.userId,
      event_type: params.eventType,
      product_id: params.productId ?? null,
      pet_id: params.petId ?? null,
      recommendation_id: params.recommendationId ?? null,
      metadata: params.metadata ?? {},
    })
  } catch {
    // Silently fail - tracking should not block user experience
  }
}

export function useIntentTracker(userId: string | undefined) {
  const track = async (
    eventType: IntentEventType,
    extra?: {
      productId?: string
      petId?: string
      recommendationId?: string
      metadata?: Record<string, unknown>
    }
  ) => {
    if (!userId) return
    await trackIntentEvent({
      userId,
      eventType,
      ...extra,
    })
  }

  return { track }
}
