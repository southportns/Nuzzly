// =============================================
// GET /api/admin/rollout/status
// Rollout Status — Admin API
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getShadowMetrics } from "@/lib/timeline/shadow-observability"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const supabase = await createClient()

  const [rolloutStatus, flags, eventLog] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("get_rollout_status"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("feature_flags").select("flag_key,flag_value,updated_at").order("flag_key"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("rollout_event_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const metrics = getShadowMetrics()

  return NextResponse.json({
    success: true,
    data: {
      rollout: rolloutStatus.data,
      flags: flags.data,
      metrics,
      recent_events: eventLog.data,
    },
  })
}
