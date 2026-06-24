// GET /api/admin/outcomes/dashboard
// Returns comprehensive dashboard data for the intelligence validation layer

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAttributionStats } from "@/lib/timeline/outcome-attribution"
import { getLongitudinalStats } from "@/lib/timeline/longitudinal-tracking"
import { getBenchmarks } from "@/lib/timeline/health-benchmarks"
import { getEffectivenessScores } from "@/lib/timeline/effectiveness-scoring"
import { getCohortIntelligence } from "@/lib/timeline/cohort-intelligence"
import { getOutcomeMetrics } from "@/lib/timeline/outcome-observability"

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
    const productId = searchParams.get("productId") ?? undefined

    const [
      attributionStats,
      longitudinalStats,
      benchmarks,
      effectivenessScores,
      cohorts,
      metrics,
    ] = await Promise.all([
      getAttributionStats(productId ? { productId } : {}),
      getLongitudinalStats(productId ? { productId } : {}),
      getBenchmarks(),
      getEffectivenessScores({ limit: 20 }),
      getCohortIntelligence(),
      getOutcomeMetrics(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        attribution: {
          totalAttributions: attributionStats.totalAttributions,
          successRate: attributionStats.successRate,
          avgConfidence: attributionStats.avgConfidence,
          avgContribution: attributionStats.avgContribution,
        },
        longitudinal: {
          totalRecords: longitudinalStats.totalRecords,
          improvedRate: longitudinalStats.improvedRate,
          stableRate: longitudinalStats.stableRate,
          worsenedRate: longitudinalStats.worsenedRate,
          avgHealthScoreDelta: longitudinalStats.avgHealthScoreDelta,
        },
        benchmarks: benchmarks.map((b) => ({
          category: b.category,
          sampleSize: b.sampleSize,
          medianImprovement: b.medianImprovement,
          meanImprovement: b.meanImprovement,
          confidenceIntervalLower: b.confidenceIntervalLower,
          confidenceIntervalUpper: b.confidenceIntervalUpper,
          medianDaysToImprovement: b.medianDaysToImprovement,
        })),
        effectiveness: {
          topProducts: effectivenessScores
            .filter((s) => s.entityType === "product")
            .slice(0, 10)
            .map((s) => ({
              entityId: s.entityId,
              effectivenessScore: s.effectivenessScore,
              qualityScore: s.qualityScore,
              accuracyScore: s.accuracyScore,
              consistencyScore: s.consistencyScore,
              safetyScore: s.safetyScore,
              sampleCount: s.sampleCount,
            })),
        },
        cohorts: cohorts.map((c) => ({
          cohortKey: c.cohortKey,
          memberCount: c.memberCount,
          avgHealthScore: c.avgHealthScore,
          avgImprovementRate: c.avgImprovementRate,
          avgEffectivenessScore: c.avgEffectivenessScore,
          baselineComparison: c.baselineComparison,
        })),
        observability: {
          attributionCount: metrics.attributionCount,
          longitudinalCount: metrics.longitudinalCount,
          benchmarkUpdateCount: metrics.benchmarkUpdateCount,
          effectivenessScoreCount: metrics.effectivenessScoreCount,
          explainabilityCount: metrics.explainabilityCount,
          cohortUpdateCount: metrics.cohortUpdateCount,
          flywheelCompletedCount: metrics.flywheelCompletedCount,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
