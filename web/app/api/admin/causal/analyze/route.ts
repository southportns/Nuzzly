// POST /api/admin/causal/analyze
// Perform causal analysis on A/B test results

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { performCausalAnalysis } from "@/lib/timeline/causal-analysis"

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error as Response

  try {
    const body = await request.json()
    const { timeRangeStart, timeRangeEnd, groupBy, metric } = body as {
      timeRangeStart: string
      timeRangeEnd: string
      groupBy?: "ab_bucket" | "rollout_percentage" | "decision_path"
      metric?: "score_delta" | "latency" | "fallback_rate"
    }

    if (!timeRangeStart || !timeRangeEnd) {
      return NextResponse.json(
        { success: false, error: "timeRangeStart and timeRangeEnd are required" },
        { status: 400 }
      )
    }

    const result = await performCausalAnalysis({ timeRangeStart, timeRangeEnd, groupBy, metric })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
