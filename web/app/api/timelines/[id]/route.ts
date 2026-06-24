// =============================================
// GET /api/timelines/[id]
// Returns full timeline detail with events and reviews
// =============================================

import { NextResponse } from "next/server"
import { queryTimelineGroup } from "@/lib/supabase/queries/timeline-queries"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const timeline = await queryTimelineGroup(id)

    if (!timeline) {
      return NextResponse.json(
        { success: false, error: "Timeline not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: timeline,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}