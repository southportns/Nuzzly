// =============================================
// Agent Migration — Shadow Mode Wrapper
// Phase 3.5: Gradual cutover from Review Score to Timeline Score
// =============================================
// Old: review_score → recommendation
// New: timeline_score → recommendation (with fallback)
//
// Progressive switch:
//   if (timelineScoreAvailable) { useTimelineScore() }
//   else { fallbackToReviewScore() }

import { runAgentPipeline, type PipelineResult } from "@/lib/ai/agents"
import { calculateLongitudinalScore, scoreProductForPetTimeline } from "@/lib/timeline/longitudinal-score"
import { getLatestTimelineMetrics } from "@/lib/timeline/metrics-engine"
import { calculateScoreComparison } from "@/lib/timeline/shadow-scoring"
import { recordShadowEvent } from "@/lib/timeline/shadow-observability"
import { rolloutController, type RolloutDecision } from "@/lib/timeline/rollout-controller"
import { logDecision } from "@/lib/timeline/decision-trace"
import { randomUUID } from "crypto"

export interface ShadowRecommendationResult extends PipelineResult {
  shadow_mode: {
    enabled: boolean
    review_score: number | null
    timeline_score: number | null
    score_delta: number | null
    used_timeline: boolean
    fallback_reason: string | null
    rollout_engine: "review" | "timeline" | "blend"
    rollout_ab_group: "control" | "treatment" | null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _enriched?: any
}

export interface TimelineEnhancedRecommendation {
  product: {
    id: string
    name: string
    brand: string
    price_max: number | null
  }
  score: number
  timeline_score: number
  review_score: number
  stability_rate: number
  soft_stool_risk: number
  black_chin_risk: number
  repurchase_rate: number
  confidence: number
  dimensions: Record<string, number>
  explanation: string
}

// Shadow-mode wrapper: runs both scoring systems, compares, uses timeline if available
export async function runAgentPipelineWithShadow(input: {
  petId: string
  userId?: string
  sessionId?: string
  query?: string
  filters?: { category?: string; maxPrice?: number }
}): Promise<ShadowRecommendationResult> {
  const requestId = randomUUID()
  const t0 = performance.now()

  // Step 1: Get rollout decision FIRST (before any computation)
  const decision = await rolloutController.decideEngine({
    userId: input.userId,
    sessionId: input.sessionId,
    requestId,
  })

  // Fix #3: Pre-Execution Short-Circuit — skip Timeline entirely on rollback
  if (rolloutController.shouldShortCircuit()) {
    const reviewResult = await runAgentPipeline(input)
    const latencyMs = performance.now() - t0

    // Log decision trace
    logDecision({
      requestId,
      userId: input.userId,
      decisionPath: decision.decisionPath,
      hashBucket: decision.hashBucket,
      hashSource: decision.hashSource,
      rolloutPercent: decision.debug.rolloutPercentage,
      abGroup: decision.abGroup,
      latencyMs: Math.round(latencyMs),
      scoringPathSteps: ["short_circuit", "review_only"],
      finalScoreSource: "review",
    })

    return {
      ...reviewResult,
      shadow_mode: {
        enabled: false,
        review_score: reviewResult.recommendations[0]?.score ?? null,
        timeline_score: null,
        score_delta: null,
        used_timeline: false,
        fallback_reason: "Short-circuit: rollback active",
        rollout_engine: "review",
        rollout_ab_group: null,
      },
    }
  }

  // Step 2: Run original pipeline (Review-based)
  const reviewResult = await runAgentPipeline(input)

  // Step 3: Enrich with Timeline scores (Shadow Mode)
  const enriched = await enrichWithTimelineScores(reviewResult, input.petId, decision, requestId, t0, input.userId)

  return enriched
}

// Enrich existing recommendation result with Timeline scores
async function enrichWithTimelineScores(
  reviewResult: PipelineResult,
  _petId: string,
  decision: RolloutDecision,
  requestId: string,
  t0: number,
  userId?: string
): Promise<ShadowRecommendationResult> {
  const enrichedRecommendations: TimelineEnhancedRecommendation[] = []

  // Parallel fetch: all products get their timeline data concurrently
  const enrichPromises = reviewResult.recommendations.map(async (rec) => {
    const productId = rec.product.id
    const t0 = performance.now()

    const [longitudinalScore, timelineMetrics, scoreComparison] = await Promise.allSettled([
      calculateLongitudinalScore(productId),
      getLatestTimelineMetrics(productId),
      calculateScoreComparison(productId),
    ])

    const longitudinalResult = longitudinalScore.status === "fulfilled" ? longitudinalScore.value : null
    const metricsResult = timelineMetrics.status === "fulfilled" ? timelineMetrics.value : null
    const comparisonResult = scoreComparison.status === "fulfilled" ? scoreComparison.value : null

    const timelineScore = longitudinalResult?.overall_score ?? 0
    const reviewScore = rec.score
    const hasTimelineData = metricsResult !== null && metricsResult.timeline_count > 0

    // Use rollout controller to calculate final score
    const finalScore = rolloutController.calculateScore(timelineScore, reviewScore, decision)

    const usedTimeline = decision.engine !== "review" && hasTimelineData && timelineScore > 0
    const fallbackReason = !usedTimeline ? (hasTimelineData ? "Rollout decided review engine" : "No timeline data available") : null

    const latencyMs = performance.now() - t0

    // Record observability metric
    recordShadowEvent({
      usedTimeline,
      timelineScore,
      reviewScore,
      latencyMs,
      fallbackReason,
    })

    return {
      product: rec.product,
      score: finalScore,
      timeline_score: timelineScore,
      review_score: reviewScore,
      stability_rate: metricsResult?.day90_stability_rate ?? 0,
      soft_stool_risk: metricsResult?.soft_stool_rate ?? 0,
      black_chin_risk: metricsResult?.black_chin_rate ?? 0,
      repurchase_rate: metricsResult?.repurchase_rate ?? 0,
      confidence: rec.confidence,
      dimensions: rec.dimensions,
      explanation: buildTimelineExplanation(usedTimeline, timelineScore, reviewScore, comparisonResult),
    } as TimelineEnhancedRecommendation
  })

  const results = await Promise.all(enrichPromises)
  enrichedRecommendations.push(...results)

  // Sort by final score
  enrichedRecommendations.sort((a, b) => b.score - a.score)

  // Calculate shadow mode summary
  const topRec = enrichedRecommendations[0]
  const scoreDelta = topRec
    ? topRec.timeline_score - topRec.review_score
    : null

  const latencyMs = performance.now() - t0

  // Log decision trace
  logDecision({
    requestId,
    userId,
    decisionPath: decision.decisionPath,
    hashBucket: decision.hashBucket,
    hashSource: decision.hashSource,
    rolloutPercent: decision.debug.rolloutPercentage,
    abGroup: decision.abGroup,
    latencyMs: Math.round(latencyMs),
    scoringPathSteps: [
      "review_pipeline",
      "timeline_enrichment",
      decision.engine === "review" ? "review_final" : "blend_final",
    ],
    finalScoreSource: decision.engine,
  })

  return {
    ...reviewResult,
    recommendations: enrichedRecommendations.map((r) => ({
      product: r.product,
      score: r.score,
      dimensions: r.dimensions,
      explanation: r.explanation,
      confidence: r.confidence,
    })),
    shadow_mode: {
      enabled: true,
      review_score: topRec?.review_score ?? null,
      timeline_score: topRec?.timeline_score ?? null,
      score_delta: scoreDelta,
      used_timeline: topRec ? topRec.timeline_score > 0 : false,
      fallback_reason: topRec && topRec.timeline_score === 0 ? "No timeline data available" : null,
      rollout_engine: decision.engine,
      rollout_ab_group: decision.abGroup,
    },
    // Attach enriched data as extended field for frontend consumption
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _enriched: enrichedRecommendations as any,
  }
}

// Build explanation string based on scoring method
function buildTimelineExplanation(
  usedTimeline: boolean,
  timelineScore: number,
  reviewScore: number,
  comparison: Awaited<ReturnType<typeof calculateScoreComparison>>
): string {
  if (!usedTimeline) {
    return `基于评论评分 (${reviewScore.toFixed(0)}分)，暂无 Timeline 数据`
  }

  const delta = timelineScore - reviewScore
  const deltaStr = delta > 0 ? `高于评论评分 ${delta.toFixed(0)} 分` : `低于评论评分 ${Math.abs(delta).toFixed(0)} 分`

  let explanation = `纵向评分 ${timelineScore.toFixed(0)} 分 (${deltaStr})`

  if (comparison && Math.abs(comparison.score_delta) > 15) {
    if (comparison.score_delta < 0) {
      explanation += " | 注意：Timeline 评分显著低于评论评分，可能存在刷评"
    } else {
      explanation += " | 发现：Timeline 显示长期效果优于评论评分"
    }
  }

  return explanation
}

// Direct timeline-based scoring (for future cutover)
export async function scoreProductTimelineOnly(
  productId: string,
  petId: string
): Promise<{
  score: number
  timeline_score: number
  stability_rate: number
  soft_stool_risk: number
  black_chin_risk: number
  repurchase_rate: number
  confidence: number
} | null> {
  const [longitudinalResult, metricsResult, petResult] = await Promise.allSettled([
    calculateLongitudinalScore(productId),
    getLatestTimelineMetrics(productId),
    scoreProductForPetTimeline(productId, petId),
  ])

  const longitudinalScore = longitudinalResult.status === "fulfilled" ? longitudinalResult.value : null
  const timelineMetrics = metricsResult.status === "fulfilled" ? metricsResult.value : null
  const petScore = petResult.status === "fulfilled" ? petResult.value : null

  if (!longitudinalScore || !petScore) return null

  return {
    score: petScore.score,
    timeline_score: longitudinalScore.overall_score,
    stability_rate: timelineMetrics?.day90_stability_rate ?? 0,
    soft_stool_risk: timelineMetrics?.soft_stool_rate ?? 0,
    black_chin_risk: timelineMetrics?.black_chin_rate ?? 0,
    repurchase_rate: timelineMetrics?.repurchase_rate ?? 0,
    confidence: Math.min(0.95, 0.5 + (timelineMetrics?.timeline_count ?? 0) * 0.01),
  }
}
