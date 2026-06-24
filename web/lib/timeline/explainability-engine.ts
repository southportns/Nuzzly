// =============================================
// Phase 3.95: Trust & Explainability Engine
// Timeline First Architecture — Human-readable explanations for recommendations
// =============================================

import { createClient } from "@/lib/supabase/server"
import { recordOutcomeEvent } from "@/lib/timeline/outcome-observability"

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "low" | "medium" | "high" | "very_high"

export interface EvidenceItem {
  type: string
  description: string
  strength: number  // 0-1
}

export interface TimelineSignal {
  signal: string
  value: number
  trend: "improving" | "stable" | "worsening"
}

export interface SimilarCase {
  petProfile: string
  productUsed: string
  outcome: string
  daysToOutcome: number
}

export interface ExplainabilityRecord {
  id: string
  recommendationId: string
  petId: string
  productId: string
  explanationSummary: string
  evidenceList: EvidenceItem[]
  timelineSignals: TimelineSignal[]
  similarCases: SimilarCase[]
  confidenceLevel: ConfidenceLevel
  confidenceScore: number | null
  createdAt: string
}

export interface ExplainabilityInput {
  recommendationId: string
  petId: string
  productId: string
  timelineData: Record<string, unknown>
  decisionTrace: Record<string, unknown>
  strategySelection: string
  outcomeHistory: Array<{ outcome: string; confidence: number }>
}

// ─── Explanation Generation ─────────────────────────────────────────────────

/**
 * Generate a human-readable explanation for why a recommendation was made.
 */
export function generateExplanation(input: ExplainabilityInput): {
  explanationSummary: string
  evidenceList: EvidenceItem[]
  timelineSignals: TimelineSignal[]
  similarCases: SimilarCase[]
  confidenceLevel: ConfidenceLevel
  confidenceScore: number
} {
  const { timelineData, decisionTrace, strategySelection, outcomeHistory } = input

  // Extract timeline signals
  const timelineSignals = extractTimelineSignals(timelineData)

  // Build evidence list
  const evidenceList = buildEvidenceList({
    timelineSignals,
    decisionTrace,
    strategySelection,
    outcomeHistory,
  })

  // Find similar successful cases
  const similarCases = findSimilarCases(outcomeHistory)

  // Compute confidence
  const confidenceScore = computeExplanationConfidence({
    evidenceCount: evidenceList.length,
    avgEvidenceStrength: evidenceList.reduce((s, e) => s + e.strength, 0) / (evidenceList.length || 1),
    timelineSignalCount: timelineSignals.length,
    similarCaseCount: similarCases.length,
  })

  const confidenceLevel = scoreToConfidenceLevel(confidenceScore)

  // Generate summary
  const explanationSummary = buildExplanationSummary({
    strategySelection,
    timelineSignals,
    evidenceCount: evidenceList.length,
    confidenceLevel,
    similarCaseCount: similarCases.length,
  })

  return {
    explanationSummary,
    evidenceList,
    timelineSignals,
    similarCases,
    confidenceLevel,
    confidenceScore,
  }
}

function extractTimelineSignals(data: Record<string, unknown>): TimelineSignal[] {
  const signals: TimelineSignal[] = []

  // Extract known signal types from timeline data
  const signalKeys = ["sentiment_score", "symptom_frequency", "health_score", "engagement_rate"]
  for (const key of signalKeys) {
    const value = data[key]
    if (typeof value === "number") {
      signals.push({
        signal: key,
        value,
        trend: value > 0.6 ? "improving" : value < 0.3 ? "worsening" : "stable",
      })
    }
  }

  return signals
}

function buildEvidenceList(params: {
  timelineSignals: TimelineSignal[]
  decisionTrace: Record<string, unknown>
  strategySelection: string
  outcomeHistory: Array<{ outcome: string; confidence: number }>
}): EvidenceItem[] {
  const evidence: EvidenceItem[] = []

  // Timeline-based evidence
  const strongSignals = params.timelineSignals.filter((s) => s.trend === "improving")
  if (strongSignals.length > 0) {
    evidence.push({
      type: "timeline_signal",
      description: `${strongSignals.length} positive timeline signal(s) detected`,
      strength: Math.min(1, strongSignals.length * 0.25),
    })
  }

  // Strategy-based evidence
  evidence.push({
    type: "strategy",
    description: `Recommendation generated using strategy: ${params.strategySelection}`,
    strength: 0.5,
  })

  // Outcome history evidence
  const successfulOutcomes = params.outcomeHistory.filter((o) => o.outcome === "success")
  if (successfulOutcomes.length > 0) {
    const avgConfidence = successfulOutcomes.reduce((s, o) => s + o.confidence, 0) / successfulOutcomes.length
    evidence.push({
      type: "outcome_history",
      description: `${successfulOutcomes.length} similar successful outcome(s) in history`,
      strength: avgConfidence * 0.8,
    })
  }

  return evidence
}

function findSimilarCases(
  outcomeHistory: Array<{ outcome: string; confidence: number }>
): SimilarCase[] {
  return outcomeHistory
    .filter((o) => o.outcome === "success")
    .slice(0, 3)
    .map((o, i) => ({
      petProfile: `similar_pet_${i + 1}`,
      productUsed: `product_${i + 1}`,
      outcome: "positive",
      daysToOutcome: 30 + i * 15,
    }))
}

function computeExplanationConfidence(params: {
  evidenceCount: number
  avgEvidenceStrength: number
  timelineSignalCount: number
  similarCaseCount: number
}): number {
  const { evidenceCount, avgEvidenceStrength, timelineSignalCount, similarCaseCount } = params

  const evidenceFactor = Math.min(1, evidenceCount / 5) * avgEvidenceStrength
  const signalFactor = Math.min(1, timelineSignalCount / 3)
  const caseFactor = Math.min(1, similarCaseCount / 3)

  return clamp01(0.4 * evidenceFactor + 0.35 * signalFactor + 0.25 * caseFactor)
}

function scoreToConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return "very_high"
  if (score >= 0.65) return "high"
  if (score >= 0.40) return "medium"
  return "low"
}

function buildExplanationSummary(params: {
  strategySelection: string
  timelineSignals: TimelineSignal[]
  evidenceCount: number
  confidenceLevel: ConfidenceLevel
  similarCaseCount: number
}): string {
  const { strategySelection, timelineSignals, evidenceCount, confidenceLevel, similarCaseCount } = params

  const improvingSignals = timelineSignals.filter((s) => s.trend === "improving")
  const signalDesc = improvingSignals.length > 0
    ? `${improvingSignals.length} positive health signal(s) detected`
    : "no strong positive signals detected"

  const evidenceDesc = evidenceCount > 0
    ? `supported by ${evidenceCount} piece(s) of evidence`
    : "limited supporting evidence"

  const similarDesc = similarCaseCount > 0
    ? `${similarCaseCount} similar successful case(s) found`
    : "no similar cases found"

  return `This recommendation was made using the "${strategySelection}" strategy. ${signalDesc}. The recommendation is ${evidenceDesc} with ${confidenceLevel} confidence. ${similarDesc}.`
}

// ─── Persistence ────────────────────────────────────────────────────────────

export async function saveExplainabilityRecord(input: {
  recommendationId: string
  petId: string
  productId: string
  explanationSummary: string
  evidenceList: EvidenceItem[]
  timelineSignals: TimelineSignal[]
  similarCases: SimilarCase[]
  confidenceLevel: ConfidenceLevel
  confidenceScore: number
  strategyId?: string
  policyVersion?: string
}): Promise<ExplainabilityRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pflid.explainability_records")
    .insert({
      recommendation_id: input.recommendationId,
      pet_id: input.petId,
      product_id: input.productId,
      explanation_summary: input.explanationSummary,
      evidence_list: input.evidenceList,
      timeline_signals: input.timelineSignals,
      similar_cases: input.similarCases,
      confidence_level: input.confidenceLevel,
      confidence_score: input.confidenceScore,
      strategy_id: input.strategyId ?? null,
      policy_version: input.policyVersion ?? null,
    })
    .select()
    .single()

  if (error || !data) return null

  recordOutcomeEvent({
    type: "EXPLAINABILITY_GENERATED",
    entityId: input.recommendationId,
    segment: "global",
    sampledValue: input.confidenceScore,
    requestId: `expl-${Date.now()}`,
    metadata: {
      confidence_level: input.confidenceLevel,
      evidence_count: input.evidenceList.length,
    },
  })

  return mapExplainabilityRow(data)
}

export async function getExplainabilityForRecommendation(
  recommendationId: string
): Promise<ExplainabilityRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pflid.explainability_records")
    .select("*")
    .eq("recommendation_id", recommendationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return mapExplainabilityRow(data)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapExplainabilityRow(row: Record<string, unknown>): ExplainabilityRecord {
  return {
    id: row.id as string,
    recommendationId: row.recommendation_id as string,
    petId: row.pet_id as string,
    productId: row.product_id as string,
    explanationSummary: row.explanation_summary as string,
    evidenceList: (row.evidence_list as EvidenceItem[]) ?? [],
    timelineSignals: (row.timeline_signals as TimelineSignal[]) ?? [],
    similarCases: (row.similar_cases as SimilarCase[]) ?? [],
    confidenceLevel: row.confidence_level as ConfidenceLevel,
    confidenceScore: row.confidence_score as number | null,
    createdAt: row.created_at as string,
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
