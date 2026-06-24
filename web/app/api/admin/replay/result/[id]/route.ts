// GET /api/admin/replay/result/:id
// Fetch a replay job result by ID

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { getReplayResult } from "@/lib/timeline/decision-replay"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error as Response

  try {
    const { id } = await params

    const result = await getReplayResult(id)

    if (!result) {
      return NextResponse.json({ success: false, error: "Replay job not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
