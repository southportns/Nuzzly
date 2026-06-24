// =============================================
// POST /api/admin/rollout/adjust
// Adjust Rollout Percentage — Admin API
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rolloutController } from "@/lib/timeline/rollout-controller"

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

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { percentage, reason }: { percentage: number; reason: string } = body || {}

    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return NextResponse.json({ success: false, error: "Percentage must be 0-100" }, { status: 400 })
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_rollout_percentage", {
      p_percentage: percentage,
      p_reason: reason || `Manual adjustment to ${percentage}%`,
    })

    if (error) {
      throw new Error(`Failed to adjust rollout: ${error.message}`)
    }

    // Clear controller cache
    rolloutController.clearCache()

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
