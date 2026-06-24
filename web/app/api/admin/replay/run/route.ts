// POST /api/admin/replay/run
// Execute a decision replay for a given request_id

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { executeReplay } from "@/lib/timeline/decision-replay"

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error as Response

  try {
    const body = await request.json()
    const { requestId, mode } = body as { requestId: string; mode?: "full" | "timeline_only" | "review_only" | "hybrid" }

    if (!requestId) {
      return NextResponse.json({ success: false, error: "requestId is required" }, { status: 400 })
    }

    const result = await executeReplay({ requestId, mode })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
