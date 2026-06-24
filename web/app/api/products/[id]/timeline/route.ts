// =============================================
// GET /api/products/[id]/timeline
// Returns product-level timeline statistics
// =============================================

import { NextResponse } from "next/server"
import { queryProductTimelineStats, queryProductTimelines } from "@/lib/supabase/queries/timeline-queries"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const url = new URL(_request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

    const [stats, timelines] = await Promise.all([
      queryProductTimelineStats(id),
      queryProductTimelines(id, limit, offset),
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats,
        timelines: timelines.timelines,
        total: timelines.total,
        limit,
        offset,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}