// =============================================
// Outcome Attribution Reducer (Pure Function)
// Handles: OUTCOME_ATTRIBUTED, CAUSAL_ANALYSIS_COMPLETED, REVIEW_CREATED
// Output: attribution chains and outcome scores
// =============================================

import type { ProjectionEvent, ProjectionReducer } from "../projection-registry"

export interface AttributionChain {
  causeId: string
  effectId: string
  strength: number
  confidence: number
  evidence: string[]
}

export interface OutcomeRecord {
  outcomeId: string
  score: number
  attributedFactors: Record<string, number>
  chains: AttributionChain[]
  timestamp: string
}

export interface OutcomeAttributionProjection {
  outcomes: Record<string, OutcomeRecord>
  chains: AttributionChain[]
  aggregateScores: {
    avgOutcomeScore: number
    totalOutcomes: number
    highConfidenceChains: number
  }
  lastUpdated: string | null
}

const INITIAL_STATE: OutcomeAttributionProjection = {
  outcomes: {},
  chains: [],
  aggregateScores: {
    avgOutcomeScore: 0,
    totalOutcomes: 0,
    highConfidenceChains: 0,
  },
  lastUpdated: null,
}

export const outcomeAttributionReducer: ProjectionReducer<OutcomeAttributionProjection> = (
  state: OutcomeAttributionProjection | undefined,
  event: ProjectionEvent
): OutcomeAttributionProjection => {
  const s = state ?? INITIAL_STATE

  switch (event.type) {
    case "OutcomeAttributed": {
      const outcomeId = (event.payload.outcome_id as string) ?? event.aggregateId
      const score = (event.payload.score as number) ?? 0
      const factors = (event.payload.factors as Record<string, number>) ?? {}
      const chains = (event.payload.chains as AttributionChain[]) ?? []

      const outcome: OutcomeRecord = {
        outcomeId,
        score,
        attributedFactors: factors,
        chains,
        timestamp: event.timestamp,
      }

      // Update aggregate scores
      const totalOutcomes = s.aggregateScores.totalOutcomes + 1
      const avgOutcomeScore =
        ((s.aggregateScores.avgOutcomeScore * (totalOutcomes - 1)) + score) / totalOutcomes
      const highConfidenceChains =
        s.aggregateScores.highConfidenceChains +
        chains.filter(c => c.confidence >= 0.8).length

      return {
        ...s,
        outcomes: {
          ...s.outcomes,
          [outcomeId]: outcome,
        },
        chains: [...s.chains, ...chains],
        aggregateScores: {
          avgOutcomeScore,
          totalOutcomes,
          highConfidenceChains,
        },
        lastUpdated: event.timestamp,
      }
    }

    case "CausalAnalysisCompleted": {
      const analysisId = (event.payload.analysis_id as string) ?? event.aggregateId
      const chains = (event.payload.chains as AttributionChain[]) ?? []
      const confidence = (event.payload.confidence as number) ?? 0

      return {
        ...s,
        chains: [...s.chains, ...chains],
        aggregateScores: {
          ...s.aggregateScores,
          highConfidenceChains:
            s.aggregateScores.highConfidenceChains +
            chains.filter(c => c.confidence >= 0.8).length,
        },
        lastUpdated: event.timestamp,
      }
    }

    case "ReviewCreated": {
      // Reviews are potential outcome signals — track for later attribution
      const reviewId = (event.payload.id as string) ?? event.id
      const rating = (event.payload.overall_rating as number) ?? 0

      // Normalize rating to 0-1 score
      const normalizedScore = rating / 5

      const outcome: OutcomeRecord = {
        outcomeId: reviewId,
        score: normalizedScore,
        attributedFactors: {},
        chains: [],
        timestamp: event.timestamp,
      }

      const totalOutcomes = s.aggregateScores.totalOutcomes + 1
      const avgOutcomeScore =
        ((s.aggregateScores.avgOutcomeScore * (totalOutcomes - 1)) + normalizedScore) / totalOutcomes

      return {
        ...s,
        outcomes: {
          ...s.outcomes,
          [reviewId]: outcome,
        },
        aggregateScores: {
          ...s.aggregateScores,
          avgOutcomeScore,
          totalOutcomes,
        },
        lastUpdated: event.timestamp,
      }
    }

    default:
      return s
  }
}
