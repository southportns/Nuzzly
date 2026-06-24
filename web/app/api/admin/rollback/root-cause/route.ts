// POST /api/admin/rollback/root-cause
// Analyze root cause of a rollback event

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { analyzeRollbackRootCause } from "@/lib/timeline/rollback-root-cause"

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error as Response

  try {
    const body = await request.json()
    const { rollbackEventId, timeRangeHours } = body as {
      rollbackEventId?: string
      timeRangeHours?: number
    }

    const result = await analyzeRollbackRootCause({ rollbackEventId, timeRangeHours })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
