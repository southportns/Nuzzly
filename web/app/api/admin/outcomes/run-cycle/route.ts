// POST /api/admin/outcomes/run-cycle
// ETL-build FlywheelInput from production tables and trigger a flywheel cycle

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildFlywheelInput } from "@/lib/timeline/flywheel-input-builder"
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
  const isCron = new URL(request.url).searchParams.get("trigger") === "cron"
  const logPrefix = isCron ? "[flywheel cron]" : "[/api/admin/outcomes/run-cycle]"

  // 鉴权: cron 触发校验 CRON_SECRET, 否则走 admin 鉴权
  if (isCron) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
  } else {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error
  }

  try {
    const input = await buildFlywheelInput()

    if (input.recommendations.length === 0) {
      console.log(`${logPrefix} No recommendations found in the last 30 days, skipping`)
      return NextResponse.json({
        success: true,
        data: {
          skipped: true,
          reason: "No recommendations found in the last 30 days",
          recommendationsProcessed: 0,
        },
      })
    }

    const result = await runFlywheelCycle(input)

    console.log(
      `${logPrefix} iteration=${result.iteration?.iterationNumber ?? "-"} ` +
      `attributions=${result.attributions} benchmarks=${result.benchmarksUpdated} ` +
      `effectiveness=${result.effectivenessRecalculated} cohorts=${result.cohortsUpdated}`
    )

    return NextResponse.json({
      success: true,
      data: {
        skipped: false,
        iteration: result.iteration,
        recommendationsProcessed: input.recommendations.length,
        attributions: result.attributions,
        benchmarksUpdated: result.benchmarksUpdated,
        effectivenessRecalculated: result.effectivenessRecalculated,
        cohortsUpdated: result.cohortsUpdated,
      },
    })
  } catch (error) {
    console.error(`${logPrefix} Failed:`, (error as Error).message)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
