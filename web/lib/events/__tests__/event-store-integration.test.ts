// =============================================
// Phase 1.2.1: Integration Tests
// Test Event Store + Job Runtime end-to-end
// =============================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

import { EventStore, type DomainEvent, EventBus } from "@/lib/events/event-bus"
import { JobRuntime, type JobRecord } from "@/lib/jobs/runtime"
import { createAdminClient } from "@/lib/supabase/admin"

const admin = createAdminClient()

// Increase timeout for integration tests
vi.setConfig({ testTimeout: 30_000 })

describe("Phase 1.2.1: Event Store + Job Runtime", () => {
  let testCorrelationId: string
  let eventBus: EventBus

  beforeEach(() => {
    testCorrelationId = crypto.randomUUID()
    eventBus = new EventBus()
  })

  afterEach(async () => {
    // Clean up test data
    await admin.from("event_store").delete().eq("aggregate_type", "TestReview")
    await admin.from("event_store").delete().eq("aggregate_type", "Test")
    await admin.from("event_store").delete().eq("aggregate_type", "IntegrationTest")
    await admin.from("pending_computation_jobs").delete().eq("job_type", "test_job")
    await admin.from("pending_computation_jobs").delete().eq("job_type", "failing_job")
    await admin.from("pending_computation_jobs").delete().eq("job_type", "always_failing_job")
    await admin.from("pending_computation_jobs").delete().eq("job_type", "handle_IntegrationTestEvent")
    await admin.from("pending_computation_jobs").delete().eq("job_type", "handle_TestAsyncEvent")
  })

  describe("Event Store", () => {
    it("should append event and return event_id", async () => {
      const eventStore = new EventStore()

      const eventId = await eventStore.append({
        event_type: "ReviewCreated",
        aggregate_id: "11111111-1111-1111-1111-111111111111",
        aggregate_type: "TestReview",
        payload: { productId: "22222222-2222-2222-2222-222222222222", rating: 5 },
        metadata: {
          correlation_id: testCorrelationId,
          causation_id: null,
          decision_id: null,
          user_id: "33333333-3333-3333-3333-333333333333",
          request_id: "44444444-4444-4444-4444-444444444444",
          timestamp: new Date().toISOString(),
          version: 1,
        },
      })

      expect(eventId).toBeDefined()
      expect(typeof eventId).toBe("string")
      expect(eventId.length).toBe(36)
    })

    it("should auto-increment stream_version for same aggregate", async () => {
      const eventStore = new EventStore()
      const aggregateId = "55555555-5555-5555-5555-555555555555"

      const id1 = await eventStore.append({
        event_type: "ReviewCreated",
        aggregate_id: aggregateId,
        aggregate_type: "TestReview",
        payload: { version: 1 },
        metadata: {
          correlation_id: testCorrelationId,
          causation_id: null,
          decision_id: null,
          user_id: null,
          request_id: "req-1",
          timestamp: new Date().toISOString(),
          version: 1,
        },
      })

      const id2 = await eventStore.append({
        event_type: "ReviewUpdated",
        aggregate_id: aggregateId,
        aggregate_type: "TestReview",
        payload: { version: 2 },
        metadata: {
          correlation_id: testCorrelationId,
          causation_id: id1,
          decision_id: null,
          user_id: null,
          request_id: "req-2",
          timestamp: new Date().toISOString(),
          version: 2,
        },
      })

      const events = await eventStore.queryByCorrelation(testCorrelationId)
      expect(events).toHaveLength(2)
      expect(events[0].event_id).toBe(id1)
      expect(events[1].event_id).toBe(id2)
    })

    it("should query events by correlation_id", async () => {
      const eventStore = new EventStore()

      await eventStore.append({
        event_type: "ReviewCreated",
        aggregate_id: "66666666-6666-6666-6666-666666666666",
        aggregate_type: "TestReview",
        payload: {},
        metadata: {
          correlation_id: testCorrelationId,
          causation_id: null,
          decision_id: null,
          user_id: null,
          request_id: "req-1",
          timestamp: new Date().toISOString(),
          version: 1,
        },
      })

      const events = await eventStore.queryByCorrelation(testCorrelationId)
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events[0].metadata.correlation_id).toBe(testCorrelationId)
    })
  })

  describe("Event Bus", () => {
    it("should publish event and execute sync handler", async () => {
      let handlerCalled = false
      let receivedEvent: DomainEvent | null = null

      eventBus.register({
        eventType: "ReviewCreated",
        mode: "sync",
        handler: async (event: DomainEvent) => {
          handlerCalled = true
          receivedEvent = event
        },
      })

      const eventId = await eventBus.publish({
        event_type: "ReviewCreated",
        aggregate_id: "77777777-7777-7777-7777-777777777777",
        aggregate_type: "TestReview",
        payload: { rating: 5 },
        metadata: {
          correlation_id: testCorrelationId,
          causation_id: null,
          decision_id: null,
          user_id: "88888888-8888-8888-8888-888888888888",
          request_id: "req-1",
          timestamp: new Date().toISOString(),
          version: 1,
        },
      })

      expect(handlerCalled).toBe(true)
      expect(receivedEvent).not.toBeNull()
      expect(receivedEvent?.event_id).toBe(eventId)
      expect(receivedEvent?.event_type).toBe("ReviewCreated")
    })

    it("should enqueue async handler as job", async () => {
      eventBus.register({
        eventType: "TestAsyncEvent",
        mode: "async",
        handler: async () => {},
      })

      const eventId = await eventBus.publish({
        event_type: "TestAsyncEvent",
        aggregate_id: "99999999-9999-9999-9999-999999999999",
        aggregate_type: "Test",
        payload: {},
        metadata: {
          correlation_id: testCorrelationId,
          causation_id: null,
          decision_id: null,
          user_id: null,
          request_id: "req-1",
          timestamp: new Date().toISOString(),
          version: 1,
        },
      })

      // Verify job was enqueued
      const { data: jobs } = await admin
        .from("pending_computation_jobs")
        .select("*")
        .eq("event_id", eventId)

      expect(jobs).not.toBeNull()
      expect(jobs!.length).toBeGreaterThanOrEqual(1)
      expect(jobs![0].job_type).toBe("handle_TestAsyncEvent")
    })
  })

  describe("Job Runtime", () => {
    it("should process pending jobs", async () => {
      let handlerCalled = false
      const jobRuntime = new JobRuntime()

      jobRuntime.register({
        jobType: "test_job",
        handler: async (job: JobRecord) => {
          handlerCalled = true
          expect(job.jobType).toBe("test_job")
          expect(job.payload.testValue).toBe(42)
        },
        concurrency: 1,
        retryPolicy: { maxRetries: 3, backoffMs: 100, backoffMultiplier: 2 },
        timeoutMs: 5000,
      })

      // Enqueue test job
      await admin.rpc("job_enqueue", {
        p_job_type: "test_job",
        p_target_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        p_payload: { testValue: 42 },
        p_correlation_id: testCorrelationId,
        p_priority: 5,
        p_max_retries: 3,
      })

      // Process jobs
      const result = await jobRuntime.start(5000)

      expect(handlerCalled).toBe(true)
      expect(result.processed).toBeGreaterThanOrEqual(1)
      expect(result.completed).toBeGreaterThanOrEqual(1)
    })

    it("should retry failed jobs with backoff", async () => {
      let attemptCount = 0
      const jobRuntime = new JobRuntime()

      jobRuntime.register({
        jobType: "failing_job",
        handler: async () => {
          attemptCount++
          if (attemptCount < 2) {
            throw new Error("Simulated failure")
          }
        },
        concurrency: 1,
        retryPolicy: { maxRetries: 3, backoffMs: 100, backoffMultiplier: 2 },
        timeoutMs: 5000,
      })

      // Enqueue failing job
      await admin.rpc("job_enqueue", {
        p_job_type: "failing_job",
        p_target_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        p_payload: {},
        p_correlation_id: testCorrelationId,
        p_priority: 5,
        p_max_retries: 3,
      })

      // First run: should fail and retry
      const result1 = await jobRuntime.start(5000)
      expect(result1.failed).toBeGreaterThanOrEqual(1)
      expect(result1.retried).toBeGreaterThanOrEqual(1)

      // Wait for backoff
      await new Promise(resolve => setTimeout(resolve, 200))

      // Second run: should succeed
      const result2 = await jobRuntime.start(5000)
      expect(result2.completed).toBeGreaterThanOrEqual(1)
      expect(attemptCount).toBe(2)
    })

    it("should move job to dead letter after max retries", async () => {
      const jobRuntime = new JobRuntime()

      jobRuntime.register({
        jobType: "always_failing_job",
        handler: async () => {
          throw new Error("Always fails")
        },
        concurrency: 1,
        retryPolicy: { maxRetries: 2, backoffMs: 50, backoffMultiplier: 2 },
        timeoutMs: 5000,
      })

      // Enqueue job with max_retries = 2
      await admin.rpc("job_enqueue", {
        p_job_type: "always_failing_job",
        p_target_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        p_payload: {},
        p_correlation_id: testCorrelationId,
        p_priority: 5,
        p_max_retries: 2,
      })

      // Run multiple times to exhaust retries
      for (let i = 0; i < 3; i++) {
        await jobRuntime.start(5000)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Verify job is in dead letter state
      const { data: jobs } = await admin
        .from("pending_computation_jobs")
        .select("*")
        .eq("job_type", "always_failing_job")

      expect(jobs).not.toBeNull()
      expect(jobs!.length).toBe(1)
      expect(jobs![0].status).toBe("failed")
      expect(jobs![0].dead_letter_reason).toBeDefined()
    })
  })

  describe("Full Integration: Event → Job → Handler", () => {
    it("should process complete flow from event to job execution", async () => {
      let syncHandlerCalled = false
      let asyncHandlerCalled = false
      const jobRuntime = new JobRuntime()

      // Register sync handler
      eventBus.register({
        eventType: "IntegrationTestEvent",
        mode: "sync",
        handler: async () => {
          syncHandlerCalled = true
        },
      })

      // Register async handler (as job)
      jobRuntime.register({
        jobType: "handle_IntegrationTestEvent",
        handler: async (job: JobRecord) => {
          asyncHandlerCalled = true
          expect(job.payload.testData).toBe("integration_test")
        },
        concurrency: 1,
        retryPolicy: { maxRetries: 3, backoffMs: 100, backoffMultiplier: 2 },
        timeoutMs: 5000,
      })

      // Publish event
      const eventId = await eventBus.publish({
        event_type: "IntegrationTestEvent",
        aggregate_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        aggregate_type: "IntegrationTest",
        payload: { testData: "integration_test" },
        metadata: {
          correlation_id: testCorrelationId,
          causation_id: null,
          decision_id: null,
          user_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
          request_id: "req-integration",
          timestamp: new Date().toISOString(),
          version: 1,
        },
      })

      // Verify sync handler was called
      expect(syncHandlerCalled).toBe(true)

      // Verify job was enqueued
      const { data: jobs } = await admin
        .from("pending_computation_jobs")
        .select("*")
        .eq("event_id", eventId)

      expect(jobs).not.toBeNull()
      expect(jobs!.length).toBeGreaterThanOrEqual(1)

      // Process jobs
      const result = await jobRuntime.start(5000)

      // Verify async handler was called
      expect(asyncHandlerCalled).toBe(true)
      expect(result.completed).toBeGreaterThanOrEqual(1)

      // Verify event was stored
      const eventStore = new EventStore()
      const events = await eventStore.queryByCorrelation(testCorrelationId)
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events[0].event_id).toBe(eventId)
    })
  })
})
