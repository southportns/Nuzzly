// =============================================
// Phase 1.2.1: Job Runtime
// Async job processor with retry, backoff, and dead letter queue
// =============================================

import { createAdminClient } from "@/lib/supabase/admin"

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead_letter"

export interface JobRecord {
  id: string
  jobType: string
  aggregateId: string | null
  payload: Record<string, unknown>
  metadata: {
    correlation_id: string | null
    causation_id: string | null
    decision_id: string | null
    event_id: string | null
    user_id: string | null
    request_id: string
  }
  status: JobStatus
  priority: number
  retryCount: number
  maxRetries: number
  error: string | null
  createdAt: string
  scheduledAt: string | null
}

export interface JobDefinition {
  jobType: string
  handler: (job: JobRecord) => Promise<void>
  concurrency: number
  retryPolicy: {
    maxRetries: number
    backoffMs: number
    backoffMultiplier: number
  }
  timeoutMs: number
}

export interface JobProcessResult {
  processed: number
  completed: number
  failed: number
  retried: number
  deadLettered: number
  errors: string[]
}

// ─── Job Runtime ────────────────────────────────────────────────────────────

export class JobRuntime {
  private registry: Map<string, JobDefinition> = new Map()
  private running = false
  private admin = createAdminClient()

  register(def: JobDefinition): void {
    this.registry.set(def.jobType, def)
  }

  async start(maxDurationMs: number = 25_000): Promise<JobProcessResult> {
    this.running = true
    const startTime = Date.now()
    const result: JobProcessResult = {
      processed: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      deadLettered: 0,
      errors: [],
    }

    while (this.running && (Date.now() - startTime) < maxDurationMs) {
      const batchResult = await this.processNextBatch()
      result.processed += batchResult.processed
      result.completed += batchResult.completed
      result.failed += batchResult.failed
      result.retried += batchResult.retried
      result.deadLettered += batchResult.deadLettered
      result.errors.push(...batchResult.errors)

      if (batchResult.processed === 0) {
        // No more jobs, wait briefly before checking again
        await this.sleep(100)
      }
    }

    this.running = false
    return result
  }

  async stop(): Promise<void> {
    this.running = false
  }

  private async processNextBatch(): Promise<Omit<JobProcessResult, "processed"> & { processed: number }> {
    const result = { processed: 0, completed: 0, failed: 0, retried: 0, deadLettered: 0, errors: [] as string[] }

    // 1. Fetch pending jobs
    const jobs = await this.fetchPendingJobs(10)
    if (jobs.length === 0) return result

    // 2. Group by job type
    const byType = new Map<string, JobRecord[]>()
    for (const job of jobs) {
      const list = byType.get(job.jobType) ?? []
      list.push(job)
      byType.set(job.jobType, list)
    }

    // 3. Process each type with concurrency limit
    const promises: Promise<void>[] = []
    for (const [jobType, jobList] of byType) {
      const def = this.registry.get(jobType)
      if (!def) {
        const msg = `[JobRuntime] No handler for job type: ${jobType}`
        console.error(msg)
        result.errors.push(msg)
        await this.markDeadLetter(jobList[0].id, `No handler registered for ${jobType}`)
        result.deadLettered++
        result.processed++
        continue
      }

      const concurrency = Math.min(jobList.length, def.concurrency)
      for (let i = 0; i < concurrency; i++) {
        const job = jobList[i]
        promises.push(this.executeJob(job, def, result))
      }
    }

    await Promise.allSettled(promises)
    return result
  }

  private async executeJob(
    job: JobRecord,
    def: JobDefinition,
    result: Omit<JobProcessResult, "processed"> & { processed: number }
  ): Promise<void> {
    const t0 = Date.now()

    try {
      // Mark as processing
      const marked = await this.markProcessing(job.id)
      if (!marked) {
        // Job was already taken by another worker
        return
      }

      // Execute handler with timeout
      await Promise.race([
        def.handler(job),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error(`Job timeout after ${def.timeoutMs}ms`)), def.timeoutMs)
        ),
      ])

      // Mark as completed
      const durationMs = Date.now() - t0
      await this.markCompleted(job.id, durationMs)
      result.completed++
      result.processed++

    } catch (error) {
      const errorMessage = (error as Error).message
      result.failed++
      result.processed++

      // Retry or dead letter
      const backoffMs = def.retryPolicy.backoffMs *
        Math.pow(def.retryPolicy.backoffMultiplier, job.retryCount)

      const retried = await this.scheduleRetry(job.id, errorMessage, backoffMs)
      if (retried) {
        result.retried++
      } else {
        result.deadLettered++
      }
    }
  }

  // ─── DB Operations ─────────────────────────────────────────────────────

  private async fetchPendingJobs(limit: number): Promise<JobRecord[]> {
    const { data, error } = await this.admin.rpc("job_fetch_pending", {
      p_limit: limit,
    })

    if (error) {
      console.error("[JobRuntime] Failed to fetch pending jobs:", error.message)
      return []
    }

    return (data as unknown[]).map(this.toJobRecord)
  }

  private async markProcessing(jobId: string): Promise<boolean> {
    const { data, error } = await this.admin.rpc("job_mark_processing", {
      p_job_id: jobId,
    })

    if (error) {
      console.error("[JobRuntime] Failed to mark job processing:", error.message)
      return false
    }

    return data as boolean
  }

  private async markCompleted(jobId: string, durationMs: number): Promise<boolean> {
    const { data, error } = await this.admin.rpc("job_mark_completed", {
      p_job_id: jobId,
      p_duration_ms: durationMs,
    })

    if (error) {
      console.error("[JobRuntime] Failed to mark job completed:", error.message)
      return false
    }

    return data as boolean
  }

  private async scheduleRetry(jobId: string, errorMessage: string, backoffMs: number): Promise<boolean> {
    const { data, error } = await this.admin.rpc("job_schedule_retry", {
      p_job_id: jobId,
      p_error_message: errorMessage,
      p_backoff_ms: backoffMs,
    })

    if (error) {
      console.error("[JobRuntime] Failed to schedule retry:", error.message)
      return false
    }

    return data as boolean
  }

  private async markDeadLetter(jobId: string, reason: string): Promise<void> {
    const { error } = await this.admin
      .from("pending_computation_jobs")
      .update({
        status: "failed",
        error_message: reason,
        dead_letter_reason: "no_handler",
        processed_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    if (error) {
      console.error("[JobRuntime] Failed to mark dead letter:", error.message)
    }
  }

  private toJobRecord(row: unknown): JobRecord {
    const r = row as Record<string, unknown>
    const metadata = (r.metadata ?? {}) as Record<string, unknown>
    return {
      id: r.id as string,
      jobType: r.job_type as string,
      aggregateId: (r.aggregate_id as string) ?? null,
      payload: (r.payload ?? {}) as Record<string, unknown>,
      metadata: {
        correlation_id: (metadata.correlation_id as string) ?? null,
        causation_id: (metadata.causation_id as string) ?? null,
        decision_id: (metadata.decision_id as string) ?? null,
        event_id: (metadata.event_id as string) ?? null,
        user_id: (metadata.user_id as string) ?? null,
        request_id: (metadata.request_id as string) ?? r.id as string,
      },
      status: r.status as JobStatus,
      priority: (r.priority as number) ?? 5,
      retryCount: (r.retry_count as number) ?? 0,
      maxRetries: (r.max_retries as number) ?? 3,
      error: (r.error_message as string) ?? null,
      createdAt: r.created_at as string,
      scheduledAt: (r.scheduled_at as string) ?? null,
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
