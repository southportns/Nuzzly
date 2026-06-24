// =============================================
// POST /api/reviews/:id/process-timeline
// Triggered after a review is submitted:
//   1. Build timeline group (auto-aggregate)
//   2. Extract timeline events via AI
//   3. Upsert events
//   4. Recalculate trust score
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractTimeline } from "@/lib/ai/timeline-extractor"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reviewId } = await params

  try {
    const supabase = await createClient()

    // Fetch review data
    const { data: review, error: fetchErr } = await supabase
      .from("product_reviews")
      .select("id, product_id, profile_id, review_text, created_at")
      .eq("id", reviewId)
      .single()

    if (fetchErr || !review) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 })
    }

    // Step 1: Build timeline group (auto-aggregate by author+product)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: groupResult, error: groupErr } = await (supabase.rpc as any)("build_timeline_group", {
      p_review_id: review.id,
      p_author_id: review.profile_id,
      p_product_id: review.product_id,
      p_review_date: review.created_at,
      p_review_text: review.review_text ?? "",
    })

    if (groupErr) {
      console.error("[timeline] build_timeline_group error:", groupErr)
      return NextResponse.json({ success: false, error: groupErr.message }, { status: 500 })
    }

    const timelineGroupId = groupResult?.timeline_group_id as string | undefined
    if (!timelineGroupId) {
      return NextResponse.json({ success: false, error: "No timeline group created" }, { status: 500 })
    }

    // Step 2: AI timeline extraction (only if review text exists)
    let eventsCount = 0
    if (review.review_text) {
      const extraction = await extractTimeline({
        review_text: review.review_text,
        review_date: review.created_at,
      })

      if (extraction.events.length > 0) {
        // Step 3: Upsert events
        const eventsJson = extraction.events.map((e) => ({
          event_day: e.day,
          event_type: e.event_type,
          status: e.status,
          symptom: e.symptom,
          symptom_severity: e.severity,
          sentiment: e.sentiment,
          sentiment_score: e.sentiment_score,
          confidence: e.confidence,
          extracted_text: e.extracted_text,
          extraction_model: extraction.model,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: upserted, error: upsertErr } = await (supabase.rpc as any)("upsert_timeline_events", {
          p_timeline_group_id: timelineGroupId,
          p_review_id: null,
          p_source_review_id: review.id,
          p_events: eventsJson,
        })

        if (upsertErr) {
          console.error("[timeline] upsert_events error:", upsertErr)
        } else {
          eventsCount = (upserted as number) ?? 0
        }
      }
    }

    // Step 4: Recalculate trust score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)("calculate_timeline_trust_score", {
      p_timeline_group_id: timelineGroupId,
    })

    return NextResponse.json({
      success: true,
      data: {
        timelineGroupId,
        action: groupResult?.action,
        reviewOrder: groupResult?.review_order,
        eventsExtracted: eventsCount,
      },
    })
  } catch (error) {
    console.error("[timeline] process error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
