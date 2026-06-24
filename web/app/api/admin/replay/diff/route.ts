// POST /api/admin/replay/diff
// Compute score and ranking diff between Timeline and Review

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { computeDiff } from "@/lib/timeline/score-diff"

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error as Response

  try {
    const body = await request.json()
    const { requestId, timeRangeStart, timeRangeEnd, topK } = body as {
      requestId?: string
      timeRangeStart?: string
      timeRangeEnd?: string
      topK?: number
    }

    if (!requestId && (!timeRangeStart || !timeRangeEnd)) {
      return NextResponse.json(
        { success: false, error: "Either requestId or timeRangeStart+timeRangeEnd is required" },
        { status: 400 }
      )
    }

    const result = await computeDiff({ requestId, timeRangeStart, timeRangeEnd, topK })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
