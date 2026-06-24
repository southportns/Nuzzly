// =============================================
// Review Server Actions (P2)
// Phase 1.2.2: Migrate review-wizard direct DB writes to Write Gateway
// =============================================

"use server"

import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"
import { createAdminClient } from "@/lib/supabase/admin"
import { uploadVoucher } from "@/lib/supabase/storage"
import type { Database } from "@/lib/database.types"

type UsageDuration = Database["public"]["Enums"]["usage_duration_t"]

export async function submitReviewAction(record: {
  product_id: string
  pet_id: string
  profile_id: string
  usage_duration: UsageDuration
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
}, userId: string) {
  // 1. Submit through Write Gateway (audit trail + event sourcing)
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
    return { success: false, reviewId: null, error: result.reason ?? "提交失败" }
  }

  // 2. Immediately insert via admin client to get the generated review id
  //    (Write Gateway is async; we need the id NOW for storage + timeline trigger)
  const admin = createAdminClient()
  const { data: inserted, error: insertError } = await admin
    .from("product_reviews")
    .insert({
      product_id: record.product_id,
      pet_id: record.pet_id,
      profile_id: record.profile_id,
      usage_duration: record.usage_duration,
      usage_duration_custom_days: record.usage_duration_custom_days ?? null,
      palatability_rating: record.palatability_rating ?? null,
      stool_rating: record.stool_rating ?? null,
      coat_rating: record.coat_rating ?? null,
      energy_rating: record.energy_rating ?? null,
      overall_rating: record.overall_rating ?? null,
      black_chin_rating: record.black_chin_rating ?? null,
      vomit_rating: record.vomit_rating ?? null,
      tear_stain_rating: record.tear_stain_rating ?? null,
      shedding_rating: record.shedding_rating ?? null,
      would_repurchase: record.would_repurchase ?? null,
      review_text: record.review_text ?? null,
      pros: record.pros ?? null,
      cons: record.cons ?? null,
      transition_period_days: record.transition_period_days ?? null,
      verified_purchase: record.verified_purchase ?? false,
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    return { success: false, reviewId: null, error: insertError?.message ?? "插入失败" }
  }

  return { success: true, reviewId: inserted.id, error: null }
}

export async function submitReviewVoucherAction(
  reviewId: string,
  file: File,
  userId: string,
) {
  // 1. Upload to storage
  const uploadResult = await uploadVoucher(file, reviewId)
  if (!uploadResult.url) {
    return { success: false, error: uploadResult.error ?? "上传失败" }
  }

  // 2. Submit through Write Gateway
  const fileType = file.type.startsWith("video") ? "video" : "image"
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_REVIEW_VOUCHER",
    actor: userId,
    payload: { review_id: reviewId, file_url: uploadResult.url, file_type: fileType },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_REVIEW_VOUCHER", {
      review_id: reviewId,
      file_url: uploadResult.url,
    }),
    source: "api",
  })

  // 3. Immediately insert via admin client
  const admin = createAdminClient()
  const { error } = await admin
    .from("review_vouchers")
    .insert({
      review_id: reviewId,
      file_url: uploadResult.url,
      file_type: fileType,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// ── Bookmark Server Actions ──

export async function createBookmarkAction(profileId: string, productId: string, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_BOOKMARK",
    actor: userId,
    payload: { profile_id: profileId, product_id: productId },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_BOOKMARK", {
      profile_id: profileId,
      product_id: productId,
    }),
    source: "api",
  })

  if (result.status === "rejected") {
    return { error: new Error(result.reason) }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("product_bookmarks")
    .insert({ profile_id: profileId, product_id: productId })

  return { error }
}

export async function deleteBookmarkAction(profileId: string, productId: string, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "DELETE_BOOKMARK",
    actor: userId,
    payload: { profile_id: profileId, product_id: productId },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("DELETE_BOOKMARK", {
      profile_id: profileId,
      product_id: productId,
    }),
    source: "api",
  })

  if (result.status === "rejected") {
    return { error: new Error(result.reason) }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("product_bookmarks")
    .delete()
    .eq("profile_id", profileId)
    .eq("product_id", productId)

  return { error }
}
