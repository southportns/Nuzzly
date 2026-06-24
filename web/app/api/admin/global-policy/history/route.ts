// GET /api/admin/global-policy/history
// Returns policy history and simulation results

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPolicyHistory, listPolicyConfigs } from "@/lib/timeline/global-policy-orchestrator"
import { getSimulationResults } from "@/lib/timeline/policy-simulator"

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

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") ?? "20", 10)
    const type = searchParams.get("type") // "policy" | "simulation" | "all"

    const [policyHistory, policyConfigs, simulations] = await Promise.all([
      getPolicyHistory(limit),
      listPolicyConfigs({ limit }),
      type !== "policy" ? getSimulationResults({ limit }) : [],
    ])

    return NextResponse.json({
      success: true,
      data: {
        policyHistory,
        policyConfigs: policyConfigs.map((c) => ({
          version: c.version,
          status: c.status,
          objectiveWeights: c.objectiveWeights,
          createdAt: c.createdAt,
          activatedAt: c.activatedAt,
        })),
        simulations: type !== "policy"
          ? simulations.map((s) => ({
              simulationId: s.simulationId,
              policyVersion: s.policyVersion,
              recommendation: s.recommendation,
              systemUplift: s.systemUplift,
              status: s.status,
              createdAt: s.createdAt,
            }))
          : [],
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
