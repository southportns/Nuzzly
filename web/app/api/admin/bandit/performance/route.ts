// GET /api/admin/bandit/performance
// Phase 3.8: Get bandit performance metrics (live + persisted)
// Query: ?includeHistory=true&windowHours=24

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { getBanditMetrics } from "@/lib/timeline/bandit-observability"
import { listActiveArms, getBanditState } from "@/lib/timeline/bandit-policy"
import { isBanditPaused, getLastSafetyTrigger, loadSafetyThresholds } from "@/lib/timeline/exploration-safety"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.isAdmin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const includeHistory = url.searchParams.get("includeHistory") === "true"
    const windowHours = parseInt(url.searchParams.get("windowHours") ?? "24")

    // Live in-memory metrics
    const liveMetrics = getBanditMetrics()

    // Per-arm posterior state
    const arms = await listActiveArms()
    const armIds = arms.map((a) => a.arm_id)
    const state = await getBanditState(armIds, "global")

    // Persisted history (optional, for charts)
    let history: unknown = null
    if (includeHistory) {
      const supabase = await createClient()
      const cutoff = new Date(Date.now() - windowHours * 3600_000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicitany
      const { data } = await (supabase as any)
        .from("strategy_performance_history")
        .select("arm_id, mean_reward, ctr, conversion_rate, sample_size, recorded_at, window_start, window_end")
        .gte("recorded_at", cutoff)
        .order("recorded_at", { ascending: true })
        .limit(500)
      history = data ?? []
    }

    // Safety status
    const safety = {
      paused: isBanditPaused(),
      last_trigger: getLastSafetyTrigger(),
      thresholds: await loadSafetyThresholds(),
    }

    // Recent safety log events
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicitany
    const { data: safetyLog } = await (supabase as any)
      .from("exploration_safety_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    // Recent weight adjustments
    // eslint-disable-next-line @typescript-eslint/no-explicitany
    const { data: weightHistory } = await (supabase as any)
      .from("adaptive_weight_snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    // Recent counterfactual estimates (top 5 by absolute lift)
    // eslint-disable-next-line @typescript-eslint/no-explicitany
    const { data: cfEstimates } = await (supabase as any)
      .from("counterfactual_estimates")
      .select("*")
      .order("computed_at", { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      data: {
        live_metrics: liveMetrics,
        arms: arms.map((a) => {
          const s = state.find((x) => x.arm_id === a.arm_id)
          return {
            ...a,
            posterior: s
              ? {
                  alpha: s.alpha,
                  beta: s.beta,
                  mean_reward: s.mean_reward,
                  total_pulls: s.total_pulls,
                }
              : null,
          }
        }),
        safety: {
          ...safety,
          recent_events: safetyLog ?? [],
        },
        weight_adjustments: weightHistory ?? [],
        counterfactual_estimates: cfEstimates ?? [],
        performance_history: history,
      },
    })
  } catch (error) {
    console.error("[bandit/performance] error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
