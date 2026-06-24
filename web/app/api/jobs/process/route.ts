// =============================================
// Phase 1.2.1: Job Processing Cron Endpoint
// Called by external cron service (e.g., Vercel Cron, GitHub Actions) every 30s
// =============================================

import { NextResponse } from "next/server"
import { jobRuntime } from "@/lib/jobs/registry"

// Prevent concurrent invocations
let isProcessing = false

export async function POST(request: Request) {
  // Simple lock to prevent overlapping cron invocations
  if (isProcessing) {
    return NextResponse.json(
      { status: "skipped", reason: "previous_invocation_still_running" },
      { status: 202 }
    )
  }

  // Verify cron secret (optional but recommended for production)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  isProcessing = true

  try {
    // Process jobs for up to 25 seconds
    const result = await jobRuntime.start(25_000)

    return NextResponse.json({
      status: "ok",
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      retried: result.retried,
      deadLettered: result.deadLettered,
      errors: result.errors.slice(0, 10), // Limit error output
    })
  } catch (error) {
    console.error("[JobCron] Unexpected error:", (error as Error).message)
    return NextResponse.json(
      { error: "internal_error", message: (error as Error).message },
      { status: 500 }
    )
  } finally {
    isProcessing = false
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Job processor is running",
    timestamp: new Date().toISOString(),
  })
}
