// GET /api/admin/global-policy/status
// Returns the current active global policy config and metrics

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getActivePolicy, listPolicyConfigs } from "@/lib/timeline/global-policy-orchestrator"
import { getGlobalPolicyMetrics } from "@/lib/timeline/global-policy-observability"
import { getUnresolvedViolations } from "@/lib/timeline/global-constraints"

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

export async function GET() {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const [activePolicy, metrics, unresolvedViolations, recentConfigs] = await Promise.all([
      getActivePolicy(),
      getGlobalPolicyMetrics(),
      getUnresolvedViolations(10),
      listPolicyConfigs({ limit: 5 }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        activePolicy: activePolicy ?? null,
        metrics: {
          policyComputedCount: metrics.policyComputedCount,
          policyActivatedCount: metrics.policyActivatedCount,
          simulationCount: metrics.simulationCount,
          constraintViolationCount: metrics.constraintViolationCount,
          lastPolicyVersion: metrics.lastPolicyVersion,
          lastObjectiveWeights: metrics.lastObjectiveWeights,
          lastSimulationUplift: metrics.lastSimulationUplift,
          segmentPolicyDistribution: metrics.segmentPolicyDistribution,
          strategySynthesisEvents: metrics.strategySynthesisEvents,
          paretoFrontierMetrics: metrics.paretoFrontierMetrics,
        },
        unresolvedViolations,
        recentConfigs: recentConfigs.map((c) => ({
          version: c.version,
          status: c.status,
          createdAt: c.createdAt,
          activatedAt: c.activatedAt,
        })),
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
