// GET /api/admin/bandit/strategies
// Phase 3.8: List all strategies in the registry
// Query: ?status=active&armId=blend_70_30&limit=50

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { listStrategies, getStrategySummary } from "@/lib/timeline/strategy-registry"
import { listActiveArms } from "@/lib/timeline/bandit-policy"
import { getBanditState } from "@/lib/timeline/bandit-policy"

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.isAdmin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get("status") as
      | "draft" | "active" | "paused" | "retired" | null
    const armId = url.searchParams.get("armId") ?? undefined
    const limit = parseInt(url.searchParams.get("limit") ?? "100")

    const filter: { status?: "draft" | "active" | "paused" | "retired"; armId?: string; limit?: number } = { limit }
    if (status) filter.status = status
    if (armId) filter.armId = armId

    const [strategies, arms] = await Promise.all([
      listStrategies(filter),
      listActiveArms(),
    ])

    // Pull bandit state for arm-level posterior
    const armIds = arms.map((a) => a.arm_id)
    const banditState = await getBanditState(armIds, "global")
    const stateMap = new Map(banditState.map((s) => [s.arm_id, s]))

    // Pull summaries for each strategy
    const enriched = await Promise.all(
      strategies.map(async (s) => {
        const summary = await getStrategySummary(s.strategy_id, { sinceHours: 168 })
        return {
          ...s,
          performance: summary
            ? {
                total_pulls: summary.totalPulls,
                mean_reward: summary.meanReward,
                ctr: summary.ctr,
                conversion_rate: summary.conversionRate,
                mean_dwell_ms: summary.meanDwellMs,
                skip_rate: summary.skipRate,
                recent_windows: summary.recentWindows,
              }
            : null,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        strategies: enriched,
        arms: arms.map((a) => ({
          ...a,
          posterior: stateMap.has(a.arm_id)
            ? {
                alpha: stateMap.get(a.arm_id)!.alpha,
                beta: stateMap.get(a.arm_id)!.beta,
                mean_reward: stateMap.get(a.arm_id)!.mean_reward,
                total_pulls: stateMap.get(a.arm_id)!.total_pulls,
              }
            : null,
        })),
      },
    })
  } catch (error) {
    console.error("[bandit/strategies] error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
