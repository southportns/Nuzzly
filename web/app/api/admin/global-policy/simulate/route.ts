// POST /api/admin/global-policy/simulate
// Runs an offline what-if simulation of a global policy change

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runSimulation } from "@/lib/timeline/policy-simulator"

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
    const { policyVersion, inlineConfig, windowHours, segments } = body as {
      policyVersion?: string
      inlineConfig?: Record<string, unknown>
      windowHours?: number
      segments?: string[]
    }

    const result = await runSimulation({
      policyVersion,
      inlineConfig: inlineConfig as any,
      windowHours,
      segments: segments as any,
    })

    return NextResponse.json({
      success: true,
      data: {
        simulationId: result.simulationId,
        policyVersion: result.policyVersion,
        recommendation: result.recommendation,
        systemUplift: result.systemUplift,
        segmentResults: result.segmentResults,
        constraintViolations: result.constraintViolations,
        status: result.status,
        errorMessage: result.errorMessage,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
