// POST /api/admin/bandit/update
// Phase 3.8: Trigger nearline loop (aggregation + safety + adaptive weights)
// Body: { windowHours?, segment?, runSafety?, runOptimizer?, autoRollback? }

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { runNearlineLoop, runOfflineLoop } from "@/lib/timeline/learning-loop"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.isAdmin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const {
      windowHours = 24,
      segment = "global",
      runSafety = true,
      runOptimizer = true,
      autoRollback = false,
      includeOffline = false,
      offlineWindowHours = 168,
    } = body as {
      windowHours?: number
      segment?: "global" | "new_user" | "returning_user" | "high_intent" | "low_intent"
      runSafety?: boolean
      runOptimizer?: boolean
      autoRollback?: boolean
      includeOffline?: boolean
      offlineWindowHours?: number
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicitany
    const { data: job } = await (supabase as any)
      .from("bandit_jobs")
      .insert({
        job_type: "update",
        status: "running",
        input_payload: body,
        created_by: auth.user?.id ?? null,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    const t0 = Date.now()
    const nearline = await runNearlineLoop({
      windowHours,
      segment,
      runSafety,
      runOptimizer,
      autoRollback,
    })

    let offline: Awaited<ReturnType<typeof runOfflineLoop>> | null = null
    if (includeOffline) {
      offline = await runOfflineLoop({
        windowHours: offlineWindowHours,
        segment,
      })
    }

    const summary = {
      nearline,
      offline,
      durationMs: Date.now() - t0,
    }

    if (job) {
      // eslint-disable-next-line @typescript-eslint/no-explicitany
      await (supabase as any)
        .from("bandit_jobs")
        .update({
          status: "completed",
          result_payload: {
            safety_triggered: nearline.safetyTriggered,
            optimizer_applied: nearline.optimizerApplied,
            optimizer_rejected: nearline.optimizerRejected,
            arm_count: nearline.armMetrics.length,
            offline_included: !!offline,
          },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - t0,
        })
        .eq("id", job.id)
    }

    return NextResponse.json({ success: true, data: summary, jobId: job?.id })
  } catch (error) {
    console.error("[bandit/update] error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
