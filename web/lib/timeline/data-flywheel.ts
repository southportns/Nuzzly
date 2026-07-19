// =============================================
// Phase 3.95: Data Flywheel Engine
// Timeline First Architecture — Continuous feedback loop for evidence quality
// =============================================
// Flywheel cycle:
//   Recommendation → Outcome Tracking → Attribution → Benchmark Update
//   → Effectiveness Recalculation → Strategy Evaluation → Future Optimization Inputs

import { createClient } from "@/lib/supabase/server"
import { computeAttribution, estimateConfidence, estimateSuccessProbability, saveAttribution, type AttributionInput, type ContributionBreakdown } from "@/lib/timeline/outcome-attribution"
import { saveLongitudinalRecord, classifyOutcome, type LongitudinalInput } from "@/lib/timeline/longitudinal-tracking"
import { updateBenchmark, computeBenchmarkStats, type BenchmarkUpdate } from "@/lib/timeline/health-benchmarks"
import { saveEffectivenessScore, computeEffectivenessScore, deriveQualityScore, deriveAccuracyScore, deriveConsistencyScore, deriveSafetyScore } from "@/lib/timeline/effectiveness-scoring"
import { generateExplanation, saveExplainabilityRecord } from "@/lib/timeline/explainability-engine"
import { computeCohortMetrics, compareWithBaseline, saveCohortIntelligence } from "@/lib/timeline/cohort-intelligence"
import { recordOutcomeEvent } from "@/lib/timeline/outcome-observability"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FlywheelIteration {
  id: string
  iterationNumber: number
  recommendationsProcessed: number
  outcomesAnalyzed: number
  attributionsComputed: number
  benchmarksUpdated: number
  effectivenessRecalculated: number
  strategyEvaluations: number
  evidenceQualityScore: number | null
  dataCompleteness: number | null
  startedAt: string
  completedAt: string | null
  status: "running" | "completed" | "failed"
  errorMessage: string | null
}

export interface FlywheelInput {
  // Recommendations to process
  recommendations: Array<{
    recommendationId: string
    petId: string
    productId: string
    strategyId?: string
    policyVersion?: string
    segmentKey?: string
  }>
  // Outcome data per recommendation
  outcomes: Record<string, {
    healthScoreDelta: number
    symptomImprovement: Record<string, unknown>
    ownerAdherence: number
    timelineSignalStrength: number
    strategyPerformance: number
    banditConfidence: number
    segmentAlignment: number
    timelineEventCount: number
    dataFreshnessDays: number
    outcomeClarity: number
    predictionAccuracy: number
    attributionConfidence: number
    outcomeStability: number
    horizonAgreement: number
    adverseEventRate: number
    rollbackRate: number
    minQualityMet: boolean
  }>
  // Benchmark data
  benchmarkUpdates: BenchmarkUpdate[]
  // Cohort data
  cohortData: Array<{
    cohortKey: string
    cohortDefinition: Record<string, unknown>
    healthScores: number[]
    improvementRates: number[]
    effectivenessScores: number[]
    productScores: Record<string, number>
  }>
  baselineMetrics: {
    avgHealthScore: number
    improvementRate: number
    effectivenessScore: number
  }
}

// ─── Flywheel Execution ─────────────────────────────────────────────────────

export async function runFlywheelCycle(input: FlywheelInput): Promise<{
  iteration: FlywheelIteration | null
  attributions: number
  benchmarksUpdated: number
  effectivenessRecalculated: number
  cohortsUpdated: number
}> {
  const supabase = await createClient()
  const startedAt = new Date().toISOString()

  // 1. Create iteration record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: iterationData, error: iterError } = await (supabase as any)
    .schema("pflid")
    .from("flywheel_iterations")
    .insert({
      iteration_number: await getNextIterationNumber(),
      recommendations_processed: input.recommendations.length,
      status: "running",
    })
    .select()
    .single()

  if (iterError || !iterationData) {
    return { iteration: null, attributions: 0, benchmarksUpdated: 0, effectivenessRecalculated: 0, cohortsUpdated: 0 }
  }

  const iterationNumber = iterationData.iteration_number as number
  let attributions = 0
  let benchmarksUpdated = 0
  let effectivenessRecalculated = 0
  let cohortsUpdated = 0
  let errorMessage: string | null = null

  try {
    // 2. Process each recommendation: attribution + longitudinal + explainability
    for (const rec of input.recommendations) {
      const outcome = input.outcomes[rec.recommendationId]
      if (!outcome) continue

      // 2a. Compute attribution
      const contribution = computeAttribution({
        timelineSignalStrength: outcome.timelineSignalStrength,
        strategyPerformance: outcome.strategyPerformance,
        banditConfidence: outcome.banditConfidence,
        segmentAlignment: outcome.segmentAlignment,
      })

      const confidence = estimateConfidence({
        timelineEventCount: outcome.timelineEventCount,
        dataFreshnessDays: outcome.dataFreshnessDays,
        outcomeClarity: outcome.outcomeClarity,
      })

      const successProb = estimateSuccessProbability({
        healthScoreDelta: outcome.healthScoreDelta,
        symptomImprovementRatio: Object.keys(outcome.symptomImprovement).length > 0 ? 0.7 : 0.3,
        ownerAdherence: outcome.ownerAdherence,
      })

      const outcomeSuccess = outcome.healthScoreDelta > 0

      const attrInput: AttributionInput & {
        contribution: ContributionBreakdown
        outcomeConfidence: number
        successProbability: number
        outcomeSuccess: boolean
      } = {
        recommendationId: rec.recommendationId,
        petId: rec.petId,
        productId: rec.productId,
        outcomeWindowDays: 30,
        healthScoreDelta: outcome.healthScoreDelta,
        symptomImprovement: outcome.symptomImprovement,
        ownerAdherence: outcome.ownerAdherence,
        strategyId: rec.strategyId,
        policyVersion: rec.policyVersion,
        segmentKey: rec.segmentKey,
        contribution,
        outcomeConfidence: confidence,
        successProbability: successProb,
        outcomeSuccess,
      }

      await saveAttribution(attrInput)
      attributions++

      // 2b. Save longitudinal records for all horizons
      for (const horizon of [7, 30, 90, 180] as const) {
        const deltaFactor = outcome.healthScoreDelta * (horizon / 180)
        await saveLongitudinalRecord({
          petId: rec.petId,
          productId: rec.productId,
          horizonDays: horizon,
          healthScore: 0.5 + deltaFactor,
          healthScoreBaseline: 0.5,
          symptomRecurrence: outcome.adverseEventRate > 0.1 ? 1 : 0,
          dietStability: outcome.outcomeStability > 0.5,
          ownerAdherence: outcome.ownerAdherence,
        })
      }

      // 2c. Generate explainability record
      const explanation = generateExplanation({
        recommendationId: rec.recommendationId,
        petId: rec.petId,
        productId: rec.productId,
        timelineData: {
          sentiment_score: outcome.timelineSignalStrength,
          symptom_frequency: outcome.adverseEventRate,
          health_score: 0.5 + outcome.healthScoreDelta,
        },
        decisionTrace: {
          strategy: rec.strategyId ?? "default",
          policy: rec.policyVersion ?? "none",
        },
        strategySelection: rec.strategyId ?? "default",
        outcomeHistory: outcomeSuccess
          ? [{ outcome: "success", confidence: successProb }]
          : [{ outcome: "failure", confidence: 1 - successProb }],
      })

      await saveExplainabilityRecord({
        recommendationId: rec.recommendationId,
        petId: rec.petId,
        productId: rec.productId,
        explanationSummary: explanation.explanationSummary,
        evidenceList: explanation.evidenceList,
        timelineSignals: explanation.timelineSignals,
        similarCases: explanation.similarCases,
        confidenceLevel: explanation.confidenceLevel,
        confidenceScore: explanation.confidenceScore,
        strategyId: rec.strategyId,
        policyVersion: rec.policyVersion,
      })
    }

    // 3. Update benchmarks
    for (const benchUpdate of input.benchmarkUpdates) {
      await updateBenchmark(benchUpdate)
      benchmarksUpdated++
    }

    // 4. Recalculate effectiveness scores
    for (const rec of input.recommendations) {
      const outcome = input.outcomes[rec.recommendationId]
      if (!outcome) continue

      const qualityScore = deriveQualityScore({
        outcomeSuccessRate: outcome.healthScoreDelta > 0 ? 1 : 0,
        timelineSignalQuality: outcome.timelineSignalStrength,
        sampleSize: outcome.timelineEventCount,
      })

      const accuracyScore = deriveAccuracyScore({
        predictionAccuracy: outcome.predictionAccuracy,
        attributionConfidence: outcome.attributionConfidence,
      })

      const consistencyScore = deriveConsistencyScore({
        outcomeStability: outcome.outcomeStability,
        horizonAgreement: outcome.horizonAgreement,
      })

      const safetyScore = deriveSafetyScore({
        adverseEventRate: outcome.adverseEventRate,
        rollbackRate: outcome.rollbackRate,
        minQualityMet: outcome.minQualityMet,
      })

      await saveEffectivenessScore({
        entityType: "product",
        entityId: rec.productId,
        qualityScore,
        accuracyScore,
        consistencyScore,
        safetyScore,
        sampleCount: outcome.timelineEventCount,
        outcomeSuccessRate: outcome.healthScoreDelta > 0 ? 1 : 0,
        avgConfidence: outcome.attributionConfidence,
      })

      effectivenessRecalculated++
    }

    // 5. Update cohort intelligence
    for (const cohort of input.cohortData) {
      const metrics = computeCohortMetrics(cohort)
      const baselineComparison = compareWithBaseline(metrics, input.baselineMetrics)

      await saveCohortIntelligence({
        cohortKey: cohort.cohortKey,
        cohortDefinition: cohort.cohortDefinition,
        metrics,
        baselineComparison,
      })

      cohortsUpdated++
    }

    // 6. Compute evidence quality score
    const evidenceQualityScore = computeEvidenceQualityScore({
      attributions,
      benchmarksUpdated,
      effectivenessRecalculated,
      totalRecommendations: input.recommendations.length,
    })

    const dataCompleteness = input.recommendations.length > 0
      ? attributions / input.recommendations.length
      : 0

    // 7. Mark iteration as completed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .schema("pflid")
      .from("flywheel_iterations")
      .update({
        outcomes_analyzed: input.recommendations.length,
        attributions_computed: attributions,
        benchmarks_updated: benchmarksUpdated,
        effectiveness_recalculated: effectivenessRecalculated,
        strategy_evaluations: effectivenessRecalculated,
        evidence_quality_score: evidenceQualityScore,
        data_completeness: dataCompleteness,
        completed_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", iterationData.id)

    recordOutcomeEvent({
      type: "FLYWHEEL_COMPLETED",
      entityId: `iteration-${iterationNumber}`,
      segment: "global",
      sampledValue: evidenceQualityScore,
      requestId: `flywheel-${Date.now()}`,
      metadata: {
        iteration_number: iterationNumber,
        attributions,
        benchmarks_updated: benchmarksUpdated,
        effectiveness_recalculated: effectivenessRecalculated,
        cohorts_updated: cohortsUpdated,
      },
    })

    const iteration = await getFlywheelIteration(iterationData.id as string)

    return { iteration, attributions, benchmarksUpdated, effectivenessRecalculated, cohortsUpdated }
  } catch (err) {
    errorMessage = (err as Error).message

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .schema("pflid")
      .from("flywheel_iterations")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", iterationData.id)

    const iteration = await getFlywheelIteration(iterationData.id as string)

    return { iteration, attributions, benchmarksUpdated, effectivenessRecalculated, cohortsUpdated }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getNextIterationNumber(): Promise<number> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("flywheel_iterations")
    .select("iteration_number")
    .order("iteration_number", { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return 1
  return (data[0].iteration_number as number) + 1
}

async function getFlywheelIteration(id: string): Promise<FlywheelIteration | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("pflid")
    .from("flywheel_iterations")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  return {
    id: data.id as string,
    iterationNumber: data.iteration_number as number,
    recommendationsProcessed: data.recommendations_processed as number,
    outcomesAnalyzed: data.outcomes_analyzed as number,
    attributionsComputed: data.attributions_computed as number,
    benchmarksUpdated: data.benchmarks_updated as number,
    effectivenessRecalculated: data.effectiveness_recalculated as number,
    strategyEvaluations: data.strategy_evaluations as number,
    evidenceQualityScore: data.evidence_quality_score as number | null,
    dataCompleteness: data.data_completeness as number | null,
    startedAt: data.started_at as string,
    completedAt: data.completed_at as string | null,
    status: data.status as "running" | "completed" | "failed",
    errorMessage: data.error_message as string | null,
  }
}

function computeEvidenceQualityScore(params: {
  attributions: number
  benchmarksUpdated: number
  effectivenessRecalculated: number
  totalRecommendations: number
}): number {
  const { attributions, benchmarksUpdated, effectivenessRecalculated, totalRecommendations } = params

  if (totalRecommendations === 0) return 0

  const attributionRate = attributions / totalRecommendations
  const benchmarkFactor = Math.min(1, benchmarksUpdated / 5)
  const effectivenessFactor = Math.min(1, effectivenessRecalculated / totalRecommendations)

  return round2(0.4 * attributionRate + 0.3 * benchmarkFactor + 0.3 * effectivenessFactor)
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
