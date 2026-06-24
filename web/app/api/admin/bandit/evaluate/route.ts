// POST /api/admin/bandit/evaluate
// Phase 3.8: Run counterfactual evaluation across all candidate arms
// Body: { baselineArm?, candidateArms?, windowHours?, segment?, bootstrapIterations? }

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { evaluateCounterfactuals, compareArms } from "@/lib/timeline/counterfactual-eval"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.isAdmin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { baselineArm, candidateArms, windowHours, segment, bootstrapIterations, mode, armA, armB } = body as {
      baselineArm?: string
      candidateArms?: string[]
      windowHours?: number
      segment?: "global" | "new_user" | "returning_user" | "high_intent" | "low_intent"
      bootstrapIterations?: number
      mode?: "full" | "head_to_head"
      armA?: string
      armB?: string
    }

    // Persist job record
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: job } = await (supabase as any)
      .from("bandit_jobs")
      .insert({
        job_type: mode === "head_to_head" ? "counterfactual" : "evaluate",
        status: "running",
        input_payload: body,
        created_by: auth.user?.id ?? null,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (mode === "head_to_head" && armA && armB) {
      const result = await compareArms({ armA, armB, windowHours, segment })
      if (job) {
        // eslint-disable-next-line @typescript-eslint/no-explicitany
        await (supabase as any)
          .from("bandit_jobs")
          .update({
            status: "completed",
            result_payload: result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id)
      }
      return NextResponse.json({ success: true, data: result, jobId: job?.id })
    }

    const result = await evaluateCounterfactuals({
      baselineArm,
      candidateArms,
      windowHours,
      segment,
      bootstrapIterations,
    })

    if (job) {
      // eslint-disable-next-line @typescript-eslint/no-explicitany
      await (supabase as any)
        .from("bandit_jobs")
        .update({
          status: "completed",
          result_payload: {
            bestArm: result.bestArm,
            bestLift: result.bestLift,
            estimateCount: result.estimates.length,
          },
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(job.started_at ?? Date.now()).getTime(),
        })
        .eq("id", job.id)
    }

    return NextResponse.json({ success: true, data: result, jobId: job?.id })
  } catch (error) {
    console.error("[bandit/evaluate] error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
