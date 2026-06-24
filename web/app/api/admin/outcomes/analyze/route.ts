// POST /api/admin/outcomes/analyze
// Triggers a data flywheel analysis cycle

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runFlywheelCycle } from "@/lib/timeline/data-flywheel"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) }
  }
  return { user }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { recommendations, outcomes, benchmarkUpdates, cohortData, baselineMetrics } = body

    if (!recommendations || !Array.isArray(recommendations)) {
      return NextResponse.json({ success: false, error: "Missing recommendations array" }, { status: 400 })
    }

    const result = await runFlywheelCycle({
      recommendations,
      outcomes: outcomes ?? {},
      benchmarkUpdates: benchmarkUpdates ?? [],
      cohortData: cohortData ?? [],
      baselineMetrics: baselineMetrics ?? { avgHealthScore: 0.5, improvementRate: 0.3, effectivenessScore: 50 },
    })

    return NextResponse.json({
      success: true,
      data: {
        iteration: result.iteration,
        attributions: result.attributions,
        benchmarksUpdated: result.benchmarksUpdated,
        effectivenessRecalculated: result.effectivenessRecalculated,
        cohortsUpdated: result.cohortsUpdated,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
