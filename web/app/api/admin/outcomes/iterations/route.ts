// GET /api/admin/outcomes/iterations
// Returns recent flywheel_iterations records for trend visualization.

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) }
  }
  return { user }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const rawLimit = Number.parseInt(searchParams.get("limit") ?? "30", 10)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 30

    const admin = createAdminClient()

    const { data, error } = await admin
      .schema("pflid")
      .from("flywheel_iterations")
      .select(
        "iteration_number, status, started_at, completed_at, recommendations_processed, outcomes_analyzed, attributions_computed, benchmarks_updated, effectiveness_recalculated, strategy_evaluations, evidence_quality_score, data_completeness, error_message"
      )
      .order("iteration_number", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const iterations = (data ?? []).map((row) => {
      const startedAt = row.started_at ? new Date(row.started_at) : null
      const completedAt = row.completed_at ? new Date(row.completed_at) : null
      const durationMs =
        startedAt && completedAt ? completedAt.getTime() - startedAt.getTime() : null

      return {
        iteration_number: row.iteration_number,
        status: row.status as "running" | "completed" | "failed",
        started_at: row.started_at,
        completed_at: row.completed_at,
        duration_ms: durationMs,
        metrics: {
          recommendations_processed: row.recommendations_processed ?? 0,
          outcomes_analyzed: row.outcomes_analyzed ?? 0,
          attributions_computed: row.attributions_computed ?? 0,
          benchmarks_updated: row.benchmarks_updated ?? 0,
          effectiveness_recalculated: row.effectiveness_recalculated ?? 0,
          strategy_evaluations: row.strategy_evaluations ?? 0,
        },
        quality_scores: {
          evidence_quality_score: row.evidence_quality_score,
          data_completeness: row.data_completeness,
        },
        errors: row.error_message ?? null,
      }
    })

    return NextResponse.json({ success: true, data: { iterations } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
