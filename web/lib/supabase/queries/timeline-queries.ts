// =============================================
// Review Timeline & Trust Engine Queries
// =============================================

import { createClient as createServerClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/database.types"

// Types
export interface TimelineGroup {
  id: string; author_id: string; product_id: string
  first_review_date: string; last_review_date: string
  review_count: number; total_days_span: number
  timeline_score: number; trust_factors: Record<string, unknown>
  has_photos: boolean; has_repurchase: boolean
  has_opinion_change: boolean; is_active: boolean
  metadata: Record<string, unknown>; created_at: string; updated_at: string
}

export interface TimelineEvent {
  id: string; timeline_group_id: string
  review_id: string | null; source_review_id: string | null
  event_day: number
  event_type: "status_update" | "symptom_onset" | "symptom_resolved" | "food_start" | "food_switch" | "food_stop" | "repurchase" | "opinion_change" | "milestone"
  status: "positive" | "neutral" | "negative" | "mixed" | "unknown" | null
  symptom: string | null; symptom_severity: number | null
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null
  sentiment_score: number | null; confidence: number
  extracted_text: string | null; extraction_model: string | null
  metadata: Record<string, unknown>; created_at: string
}

export interface ProductTimelineStats {
  product_id: string; timeline_count: number
  day_30_positive_rate: number; day_90_soft_stool_rate: number
  day_180_repurchase_rate: number; day_365_retention_rate: number
  avg_timeline_trust_score: number; generated_at: string
}

export interface FullTimeline extends TimelineGroup {
  events: TimelineEvent[]
  reviews: { source_review_id: string; review_date: string; review_order: number; review_text: string | null; overall_rating: number | null }[]
}

// Product timeline stats
export async function queryProductTimelineStats(productId: string): Promise<ProductTimelineStats | null> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_product_timeline_stats", { p_product_id: productId })
  if (error || !data) return null
  return data as unknown as ProductTimelineStats
}

// Full timeline detail
export async function queryTimelineGroup(timelineGroupId: string): Promise<FullTimeline | null> {
  const supabase = await createServerClient()

  // Use pflid schema for new tables
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupErr } = await (supabase as any)
    .schema("pflid")
    .from("review_timeline_groups")
    .select("*")
    .eq("id", timelineGroupId)
    .single()

  if (groupErr || !group) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase as any)
    .schema("pflid")
    .from("review_timeline_events")
    .select("*")
    .eq("timeline_group_id", timelineGroupId)
    .order("event_day", { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mapping } = await (supabase as any)
    .schema("pflid")
    .from("review_to_timeline")
    .select("source_review_id, review_date, review_order")
    .eq("timeline_group_id", timelineGroupId)
    .order("review_order", { ascending: true })

  const reviewIds: string[] = (mapping as Array<{ source_review_id: string }> ?? [])
    .map((m) => m.source_review_id)

  let reviewsWithText: FullTimeline["reviews"] = (mapping as Array<{
    source_review_id: string; review_date: string; review_order: number
  }> ?? []).map((m) => ({
    source_review_id: m.source_review_id,
    review_date: m.review_date,
    review_order: m.review_order,
    review_text: null as string | null,
    overall_rating: null as number | null,
  }))

  if (reviewIds.length > 0) {
    const { data: reviewData } = await supabase
      .from("product_reviews")
      .select("id, review_text, overall_rating")
      .in("id", reviewIds)

    if (reviewData) {
      const reviewMap = new Map(reviewData.map((r: { id: string; review_text: string | null; overall_rating: number | null }) => [r.id, r]))
      reviewsWithText = reviewsWithText.map((r) => ({
        ...r,
        review_text: reviewMap.get(r.source_review_id)?.review_text ?? null,
        overall_rating: reviewMap.get(r.source_review_id)?.overall_rating ?? null,
      }))
    }
  }

  return {
    ...group as unknown as TimelineGroup,
    events: (events as unknown as TimelineEvent[]) ?? [],
    reviews: reviewsWithText,
  }
}

// Product timelines list
export async function queryProductTimelines(
  productId: string, limit = 20, offset = 0
): Promise<{ timelines: TimelineGroup[]; total: number }> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, count, error } = await (supabase as any)
    .schema("pflid")
    .from("review_timeline_groups")
    .select("*", { count: "exact" })
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("total_days_span", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return { timelines: [], total: 0 }
  return { timelines: (data as unknown as TimelineGroup[]) ?? [], total: (count as number) ?? 0 }
}

// Author timelines
export async function queryAuthorTimelines(authorId: string, limit = 10): Promise<TimelineGroup[]> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("review_timeline_groups")
    .select("*")
    .eq("author_id", authorId)
    .order("last_review_date", { ascending: false })
    .limit(limit)

  if (error) return []
  return (data as unknown as TimelineGroup[]) ?? []
}

// Timeline events
export async function queryTimelineEvents(timelineGroupId: string): Promise<TimelineEvent[]> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("review_timeline_events")
    .select("*")
    .eq("timeline_group_id", timelineGroupId)
    .order("event_day", { ascending: true })

  if (error) return []
  return (data as unknown as TimelineEvent[]) ?? []
}

// Upsert events from AI extraction
export async function upsertTimelineEvents(
  timelineGroupId: string, reviewId: string, sourceReviewId: string, events: Json[]
): Promise<number> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("upsert_timeline_events", {
    p_timeline_group_id: timelineGroupId,
    p_review_id: reviewId,
    p_source_review_id: sourceReviewId,
    p_events: events,
  })
  if (error) return 0
  return (data as number) ?? 0
}

// Recalculate trust score
export async function recalculateTimelineTrustScore(timelineGroupId: string): Promise<number> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("calculate_timeline_trust_score", {
    p_timeline_group_id: timelineGroupId,
  })
  if (error) return 0
  return (data as number) ?? 0
}

// Backfill existing reviews
export async function backfillTimelineGroups(productId?: string, authorId?: string): Promise<number> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("backfill_timeline_groups", {
    p_product_id: productId ?? null,
    p_author_id: authorId ?? null,
  })
  if (error) return 0
  return (data as number) ?? 0
}