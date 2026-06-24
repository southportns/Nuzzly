// =============================================
// Phase 1.2.1: Job Handler Registry
// Registers all job handlers that replace database triggers
// =============================================

import { JobRuntime, type JobRecord } from "@/lib/jobs/runtime"
import { createAdminClient } from "@/lib/supabase/admin"
import { projectionEngine } from "@/lib/projections/projection-engine"

const jobRuntime = new JobRuntime()

// ── Helper: get admin client ──
const admin = createAdminClient()

// ── Handler 1: create_pet_event_from_review ──
// Replaces: after_review_create_event trigger
// Purpose: Create a pet_event record when a review is inserted
jobRuntime.register({
  jobType: "create_pet_event_from_review",
  handler: async (job: JobRecord) => {
    const { productId, authorId, reviewText, usageDuration, overallRating, stoolRating, wouldRepurchase } = job.payload

    // Get pet info from review author
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", authorId)
      .single()

    if (!profile) return

    // Get pet associated with this profile
    const { data: pet } = await admin
      .from("pets")
      .select("id")
      .eq("profile_id", profile.id)
      .limit(1)
      .single()

    if (!pet) return

    // Create pet event
    const { error } = await admin.from("pet_events").insert({
      pet_id: pet.id,
      profile_id: profile.id,
      event_type: "review_submitted",
      event_time: new Date().toISOString(),
      product_id: productId,
      source_type: "review",
      notes: JSON.stringify({
        usage_duration: usageDuration,
        overall_rating: overallRating,
        stool_rating: stoolRating,
        would_repurchase: wouldRepurchase,
      }),
    })

    if (error) {
      console.error("[create_pet_event_from_review] Failed to insert pet event:", error.message)
    }
  },
  concurrency: 5,
  retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
  timeoutMs: 30_000,
})

// ── Handler 2: create_followup_schedules ──
// Replaces: after_review_insert trigger
// Purpose: Create followup schedule entries (7d, 14d, 30d, 60d, 90d, 180d)
jobRuntime.register({
  jobType: "create_followup_schedules",
  handler: async (job: JobRecord) => {
    const { reviewId, profileId } = job.payload

    const now = new Date()
    const days = [7, 14, 30, 60, 90, 180]

    const schedules = days.map(day => ({
      review_id: reviewId,
      profile_id: profileId,
      followup_day: day,
      scheduled_date: new Date(now.getTime() + day * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }))

    const { error } = await admin.from("review_followup_schedules").insert(schedules)

    if (error) {
      console.error("[create_followup_schedules] Failed to insert schedules:", error.message)
    }
  },
  concurrency: 5,
  retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
  timeoutMs: 15_000,
})

// ── Handler 3: enqueue_reputation_job ──
// Replaces: after_review_insert_reputation trigger
// Purpose: Enqueue reputation recomputation job
jobRuntime.register({
  jobType: "enqueue_reputation_job",
  handler: async (job: JobRecord) => {
    const { authorId } = job.payload

    // Enqueue a nested job for reputation computation
    await admin.rpc("job_enqueue", {
      p_job_type: "recompute_reputation",
      p_target_profile_id: authorId,
      p_priority: 3,
      p_max_retries: 3,
    })
  },
  concurrency: 2,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

// ── Handler 4: enqueue_metrics_refresh_job ──
// Replaces: after_followup_entry_insert trigger
// Purpose: Refresh product metrics after a followup entry is recorded
jobRuntime.register({
  jobType: "enqueue_metrics_refresh_job",
  handler: async (job: JobRecord) => {
    const { scheduleId } = job.payload

    // Get product_id from the schedule
    const { data: schedule } = await admin
      .from("review_followup_schedules")
      .select("review_id")
      .eq("id", scheduleId)
      .single()

    if (!schedule) return

    const { data: review } = await admin
      .from("product_reviews")
      .select("product_id")
      .eq("id", schedule.review_id)
      .single()

    if (!review) return

    // Enqueue metrics refresh job
    await admin.rpc("job_enqueue", {
      p_job_type: "refresh_product_metrics",
      p_target_id: review.product_id,
      p_priority: 3,
      p_max_retries: 3,
    })
  },
  concurrency: 2,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

// ── Handler 5: recalc_timeline_trust ──
// Replaces: after_timeline_event_insert + tle_after_insert/update triggers
// Purpose: Recalculate timeline trust score for a timeline group
jobRuntime.register({
  jobType: "recalc_timeline_trust",
  handler: async (job: JobRecord) => {
    const { timelineGroupId } = job.payload

    // Call the existing trust recalculation function
    await admin.rpc("pflid.recalc_timeline_group_trust", {
      p_timeline_group_id: timelineGroupId,
    })
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
  timeoutMs: 120_000,
})

// ── Handler 6: generate_timeline_metrics ──
// Replaces: after_timeline_group_insert trigger
// Purpose: Generate timeline metrics for a product
jobRuntime.register({
  jobType: "generate_timeline_metrics",
  handler: async (job: JobRecord) => {
    const { productId } = job.payload

    // Call the existing metrics generation function
    await admin.rpc("pflid.generate_timeline_metrics", {
      p_product_id: productId,
      p_date: new Date().toISOString().split("T")[0],
    })
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
  timeoutMs: 120_000,
})

// ── Handler 7: trigger_score_comparison ──
// Replaces: after_timeline_metrics_insert trigger
// Purpose: Trigger score comparison analysis
jobRuntime.register({
  jobType: "trigger_score_comparison",
  handler: async (job: JobRecord) => {
    const { productId } = job.payload

    // Call the existing score comparison function
    await admin.rpc("pflid.trigger_score_comparison", {
      p_product_id: productId,
    })
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
  timeoutMs: 120_000,
})

// ── Legacy Handlers (existing job types) ──

jobRuntime.register({
  jobType: "recompute_reputation",
  handler: async (job: JobRecord) => {
    const { targetProfileId } = job.payload
    await admin.rpc("pflid.recompute_reputation", {
      p_profile_id: targetProfileId,
    })
  },
  concurrency: 2,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

jobRuntime.register({
  jobType: "refresh_product_metrics",
  handler: async (job: JobRecord) => {
    const { targetId } = job.payload
    await admin.rpc("refresh_product_metrics", {
      target_date: new Date().toISOString().split("T")[0],
    })
  },
  concurrency: 2,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

jobRuntime.register({
  jobType: "recalc_timeline_trust",
  handler: async (job: JobRecord) => {
    const { targetId } = job.payload
    await admin.rpc("pflid.recalc_timeline_group_trust", {
      p_timeline_group_id: targetId,
    })
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
  timeoutMs: 120_000,
})

// ── Handler: Projection Update ──
// Replaces: implicit trigger-based state updates
// Purpose: Process events through projection engine to update derived state
jobRuntime.register({
  jobType: "PROJECTION_UPDATE",
  handler: async (job: JobRecord) => {
    const { eventType, eventId } = job.payload

    if (!eventType || !eventId) {
      console.warn("[ProjectionJob] Missing eventType or eventId in payload")
      return
    }

    // Load the event from Event Store
    const { data: eventData, error } = await (admin as any)
      .from("event_store")
      .select("*")
      .eq("event_id", eventId)
      .single()

    if (error || !eventData) {
      console.error(`[ProjectionJob] Failed to load event ${eventId}: ${error?.message}`)
      return
    }

    // Convert to ProjectionEvent format
    const metadata = ((eventData as Record<string, unknown>).metadata ?? {}) as Record<string, unknown>
    const projectionEvent = {
      id: eventId,
      type: eventType,
      aggregateId: (eventData as Record<string, unknown>).aggregate_id as string,
      timestamp: (metadata.timestamp as string) ?? new Date().toISOString(),
      payload: ((eventData as Record<string, unknown>).payload ?? {}) as Record<string, unknown>,
      correlationId: (metadata.correlation_id as string) ?? undefined,
      causationId: (metadata.causation_id as string) ?? undefined,
    }

    // Process through projection engine
    const results = await projectionEngine.processEvent(projectionEvent)

    if (results.length > 0) {
      console.log(`[ProjectionJob] Processed event ${eventId} through ${results.length} projection(s)`)
    }
  },
  concurrency: 3,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 30_000,
})

export { jobRuntime }
