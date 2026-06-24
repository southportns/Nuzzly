// =============================================
// POST /api/admin/rollout/rollback
// Instant Rollback — Admin API
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { executeRollback, type RollbackType } from "@/lib/timeline/rollback-system"

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
    const { reason, type }: { reason: string; type: RollbackType } = body || {}

    if (!reason) {
      return NextResponse.json({ success: false, error: "Reason is required" }, { status: 400 })
    }

    const result = await executeRollback(reason, type || "full")

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
