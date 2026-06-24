// =============================================
// GET /api/admin/shadow-metrics
// Shadow Mode Observability — Real-time metrics dashboard
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getShadowMetrics } from "@/lib/timeline/shadow-observability"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const metrics = getShadowMetrics()

  return NextResponse.json({ success: true, data: metrics })
}
