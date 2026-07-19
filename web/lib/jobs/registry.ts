// =============================================
// Phase 1.2.1: Job Handler Registry
// Registers all job handlers that replace database triggers
// =============================================

import { JobRuntime, type JobRecord } from "@/lib/jobs/runtime"
import { createAdminClient } from "@/lib/supabase/admin"
import { projectionEngine } from "@/lib/projections/projection-engine"
import { buildFlywheelInput } from "@/lib/timeline/flywheel-input-builder"
import { runFlywheelCycle } from "@/lib/timeline/data-flywheel"
import {
  computeOutcomeAttributionJob,
  computeLongitudinalStabilityJob,
  computeDelayedRewardProxyJob,
} from "@/lib/jobs/handlers/flywheel-enrichment"

const jobRuntime = new JobRuntime()

// ── Helper: get admin client ──
const admin = createAdminClient()

// ── Handler 1: create_pet_event_from_review ──
// Replaces: after_review_create_event trigger
// Purpose: Create a pet_event record when a review is inserted
jobRuntime.register({
  jobType: "create_pet_event_from_review",
  handler: async (job: JobRecord) => {
    const { productId, authorId, reviewText, usageDuration, overallRating, stoolRating, wouldRepurchase } = job.payload as Record<string, string | number | boolean>

    // Get pet info from review author
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", authorId as string)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await admin.from("pet_events").insert({
      pet_id: pet.id,
      profile_id: profile.id,
      event_type: "review_submitted" as any,
      event_time: new Date().toISOString(),
      product_id: productId as string,
      source_type: "review" as any,
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
    const { reviewId, profileId } = job.payload as Record<string, string>

    const now = new Date()
    const days = [7, 14, 30, 60, 90, 180]

    const schedules = days.map(day => ({
      review_id: reviewId,
      profile_id: profileId,
      followup_day: day,
      scheduled_date: new Date(now.getTime() + day * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await admin.from("review_followup_schedules").insert(schedules as any)

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
    const { authorId } = job.payload as Record<string, string>

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
    const { scheduleId } = job.payload as Record<string, string>

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
    const { timelineGroupId } = job.payload as Record<string, string>

    // Call the existing trust recalculation function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.rpc as any)("pflid.recalc_timeline_group_trust", {
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
    const { productId } = job.payload as Record<string, string>

    // Call the existing metrics generation function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.rpc as any)("pflid.generate_timeline_metrics", {
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
    const { productId } = job.payload as Record<string, string>

    // Call the existing score comparison function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.rpc as any)("pflid.trigger_score_comparison", {
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
    const { targetProfileId } = job.payload as Record<string, string>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.rpc as any)("pflid.recompute_reputation", {
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
    const { targetId } = job.payload as Record<string, string>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.rpc as any)("pflid.recalc_timeline_group_trust", {
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
    const { eventType, eventId } = job.payload as Record<string, string>

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

// ── Handler: RUN_FLYWHEEL_CYCLE ──
// Purpose: ETL-build FlywheelInput from production tables and run a flywheel cycle
jobRuntime.register({
  jobType: "RUN_FLYWHEEL_CYCLE",
  handler: async (_job: JobRecord) => {
    try {
      const input = await buildFlywheelInput()
      if (input.recommendations.length === 0) {
        console.log("[RUN_FLYWHEEL_CYCLE] No recommendations to process, skipping cycle")
        return
      }
      const result = await runFlywheelCycle(input)
      console.log(
        `[RUN_FLYWHEEL_CYCLE] iteration=${result.iteration?.iterationNumber ?? "-"} ` +
        `attributions=${result.attributions} benchmarks=${result.benchmarksUpdated} ` +
        `effectiveness=${result.effectivenessRecalculated} cohorts=${result.cohortsUpdated}`
      )
      if (result.iteration?.status === "failed") {
        throw new Error(
          `[RUN_FLYWHEEL_CYCLE] iteration ${result.iteration.iterationNumber} failed: ${result.iteration.errorMessage ?? "unknown error"}`
        )
      }
    } catch (err) {
      console.error("[RUN_FLYWHEEL_CYCLE] Flywheel cycle failed:", (err as Error).message)
      throw err
    }
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 2, backoffMs: 10_000, backoffMultiplier: 2 },
  timeoutMs: 300_000,
})

// ── Handler: COMPUTE_OUTCOME_ATTRIBUTION ──
// Purpose: 异步补全飞轮字段 attributionConfidence，并写入 pflid.outcome_attribution
jobRuntime.register({
  jobType: "COMPUTE_OUTCOME_ATTRIBUTION",
  handler: async (job: JobRecord) => {
    const recommendationId = job.payload.recommendationId as string
    if (!recommendationId) {
      console.warn("[COMPUTE_OUTCOME_ATTRIBUTION] Missing recommendationId in payload")
      return
    }
    try {
      await computeOutcomeAttributionJob(recommendationId)
    } catch (err) {
      console.error(
        `[COMPUTE_OUTCOME_ATTRIBUTION] Failed for ${recommendationId}:`,
        (err as Error).message
      )
      throw err
    }
  },
  concurrency: 3,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

// ── Handler: COMPUTE_LONGITUDINAL_STABILITY ──
// Purpose: 异步补全飞轮字段 outcomeStability + horizonAgreement
jobRuntime.register({
  jobType: "COMPUTE_LONGITUDINAL_STABILITY",
  handler: async (job: JobRecord) => {
    const recommendationId = job.payload.recommendationId as string
    if (!recommendationId) {
      console.warn("[COMPUTE_LONGITUDINAL_STABILITY] Missing recommendationId in payload")
      return
    }
    try {
      await computeLongitudinalStabilityJob(recommendationId)
    } catch (err) {
      console.error(
        `[COMPUTE_LONGITUDINAL_STABILITY] Failed for ${recommendationId}:`,
        (err as Error).message
      )
      throw err
    }
  },
  concurrency: 3,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

// ── Handler: COMPUTE_DELAYED_REWARD_PROXY ──
// Purpose: 异步补全飞轮字段 outcomeClarity (基于 delayed_rewards 聚合的 proxyReward)
jobRuntime.register({
  jobType: "COMPUTE_DELAYED_REWARD_PROXY",
  handler: async (job: JobRecord) => {
    const recommendationId = job.payload.recommendationId as string
    if (!recommendationId) {
      console.warn("[COMPUTE_DELAYED_REWARD_PROXY] Missing recommendationId in payload")
      return
    }
    try {
      await computeDelayedRewardProxyJob(recommendationId)
    } catch (err) {
      console.error(
        `[COMPUTE_DELAYED_REWARD_PROXY] Failed for ${recommendationId}:`,
        (err as Error).message
      )
      throw err
    }
  },
  concurrency: 3,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

export { jobRuntime }
