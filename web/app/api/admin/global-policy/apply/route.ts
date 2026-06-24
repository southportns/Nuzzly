// POST /api/admin/global-policy/apply
// Activates a draft global policy config

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { activatePolicy } from "@/lib/timeline/global-policy-orchestrator"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
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
    const { version, reason } = body as { version: string; reason?: string }

    if (!version) {
      return NextResponse.json({ success: false, error: "Missing version" }, { status: 400 })
    }

    const result = await activatePolicy(version, reason)

    if (!result) {
      return NextResponse.json(
        { success: false, error: `Policy version ${version} not found or not in draft status` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        version: result.version,
        status: result.status,
        activatedAt: result.activatedAt,
        objectiveWeights: result.objectiveWeights,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
