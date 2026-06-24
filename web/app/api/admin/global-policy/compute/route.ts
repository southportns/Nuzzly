// POST /api/admin/global-policy/compute
// Triggers a global policy computation cycle

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { computeGlobalPolicy } from "@/lib/timeline/global-policy-orchestrator"

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
    const body = await request.json().catch(() => ({}))
    const { triggeredBy, reason } = body as { triggeredBy?: "manual" | "auto"; reason?: string }

    const result = await computeGlobalPolicy({
      triggeredBy: triggeredBy ?? "manual",
      reason: reason ?? "Manual compute via admin API",
    })

    return NextResponse.json({
      success: true,
      data: {
        version: result.config.version,
        status: result.config.status,
        objectiveWeights: result.config.objectiveWeights,
        synthesisCandidates: result.synthesisCandidates.length,
        pruneCandidates: result.pruneCandidates.length,
        constraintCheckPassed: result.constraintCheckPassed,
        reason: result.reason,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
