// =============================================
// Review client-side mutations
// Phase 1.2.2 (P1): Migrated to Write Gateway
// =============================================

import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"
import { createClient as createServerClient } from "@/lib/supabase/server"

// ── Review Queries ──

export async function queryReviews(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(display_name), pets(name, breed, stomach_health)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
  return { data, error }
}

export async function queryUserReviews(profileId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
  return { data, error }
}

export async function createProductReviewClient(record: {
  product_id: string
  pet_id: string
  profile_id: string
  usage_duration: string
  usage_duration_custom_days?: number | null
  palatability_rating?: number | null
  stool_rating?: number | null
  coat_rating?: number | null
  energy_rating?: number | null
  overall_rating?: number | null
  black_chin_rating?: number | null
  vomit_rating?: number | null
  tear_stain_rating?: number | null
  shedding_rating?: number | null
  would_repurchase?: boolean | null
  review_text?: string | null
  pros?: string | null
  cons?: string | null
  transition_period_days?: number | null
  verified_purchase?: boolean
  has_voucher?: boolean
}, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_REVIEW",
    actor: userId,
    payload: record as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_REVIEW", {
      product_id: record.product_id,
      pet_id: record.pet_id,
      profile_id: record.profile_id,
    }),
    source: "api",
  })

  if (result.status === "rejected") {
    return { data: null, error: new Error(result.reason) }
  }
  // Write Gateway does not echo back the inserted row; caller must
  // trigger a refresh / refetch to obtain the generated id.
  return { data: null, error: null }
}

export async function createReviewVoucherClient(record: {
  review_id: string
  file_url: string
  file_type: string
}, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_REVIEW_VOUCHER",
    actor: userId,
    payload: record as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_REVIEW_VOUCHER", {
      review_id: record.review_id,
      file_url: record.file_url,
    }),
    source: "api",
  })

  return { error: result.status === "rejected" ? new Error(result.reason) : null }
}
