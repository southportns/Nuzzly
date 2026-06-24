// =============================================
// POST /api/recommend/shadow
// Shadow Mode Recommendation — Dual Scoring (Review + Timeline)
// Runs both scoring systems, compares, and uses Timeline if available
// =============================================

import { NextResponse } from "next/server"
import { runAgentPipelineWithShadow } from "@/lib/timeline/agent-migration"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { petId, userId, sessionId, query, filters } = body

    if (!petId) {
      return NextResponse.json(
        { success: false, error: "Missing petId" },
        { status: 400 }
      )
    }

    const result = await runAgentPipelineWithShadow({
      petId,
      userId,
      sessionId,
      query,
      filters,
    })

    // Strip internal shadow fields — only return standard recommendation shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { _enriched, ...safeResult } = result as any

    return NextResponse.json({ success: true, data: safeResult })
  } catch (error) {
    console.error("[shadow-recommend] error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
