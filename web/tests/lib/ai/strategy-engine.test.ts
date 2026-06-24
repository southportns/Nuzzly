// =============================================
// Strategy Engine Tests
// =============================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies before importing
vi.mock('@/lib/ai/strategy-learning/strategy-scorer', () => ({
  strategyScorer: {
    getWeightedScores: vi.fn().mockResolvedValue({
      data_driven: 1.0,
      memory_driven: 1.0,
      anomaly_focused: 1.0,
      trend_analysis: 1.0,
      quick_response: 1.0,
      deep_analysis: 1.0
    })
  }
}))

// Import after mocking
import { StrategyEngine } from '@/lib/ai/strategy-engine'
import type { StrategyContext } from '@/lib/ai/strategy-engine'

describe('StrategyEngine', () => {
  let engine: StrategyEngine

  beforeEach(() => {
    engine = new StrategyEngine()
  })

  describe('evaluate', () => {
    it('should select quick_response for healthy pet with simple query', async () => {
      const context: StrategyContext = {
        pet_id: 'test-pet',
        health_score: {
          health_score: 85,
          sub_scores: { digestion: 90, appetite: 85, activity: 80, weight_stability: 85 },
          trend: 'stable',
          data_quality: 'good',
          calculated_at: new Date().toISOString()
        },
        health_state: {
          current_score: 85,
          baseline_score: 83,
          trend_velocity: 0.2,
          state: 'stable',
          volatility: 'low',
          confidence: 0.8,
          calculated_at: new Date().toISOString()
        },
        memories: [],
        compressed_memories: [],
        anomalies: [],
        metrics: Array.from({ length: 20 }, (_, i) => ({ date: `2026-05-${i + 1}` })),
        request_type: 'chat'
      }

      const decision = await engine.evaluate(context)
      expect(decision.selected_strategy).toBeDefined()
      expect(decision.execution_path).toBeDefined()
      expect(decision.explanation).toBeDefined()
    })

    it('should select anomaly_focused when multiple anomalies present', async () => {
      const context: StrategyContext = {
        pet_id: 'test-pet',
        health_score: {
          health_score: 45,
          sub_scores: { digestion: 30, appetite: 40, activity: 50, weight_stability: 60 },
          trend: 'declining',
          data_quality: 'good',
          calculated_at: new Date().toISOString()
        },
        health_state: {
          current_score: 45,
          baseline_score: 65,
          trend_velocity: -2.5,
          state: 'declining',
          volatility: 'high',
          confidence: 0.7,
          calculated_at: new Date().toISOString()
        },
        memories: [],
        compressed_memories: [],
        anomalies: [
          { type: 'stool_issue', severity: 'high' },
          { type: 'appetite_issue', severity: 'medium' },
          { type: 'weight_loss', severity: 'high' }
        ],
        metrics: Array.from({ length: 20 }, (_, i) => ({ date: `2026-05-${i + 1}` })),
        request_type: 'analyze'
      }

      const decision = await engine.evaluate(context)
      expect(decision.selected_strategy).toBeDefined()
      expect(decision.execution_path).toBe('analyze')
    })

    it('should return valid explanation structure', async () => {
      const context: StrategyContext = {
        pet_id: 'test-pet',
        health_score: null,
        health_state: null,
        memories: [],
        compressed_memories: [],
        anomalies: [],
        metrics: [],
        request_type: 'chat'
      }

      const decision = await engine.evaluate(context)
      expect(decision.explanation).toHaveProperty('why_this_strategy')
      expect(decision.explanation).toHaveProperty('why_not_alternatives')
      expect(decision.explanation).toHaveProperty('key_factors')
      expect(decision.explanation).toHaveProperty('risk_assessment')
      expect(decision.explanation).toHaveProperty('confidence_breakdown')
    })

    it('should include alternatives in decision', async () => {
      const context: StrategyContext = {
        pet_id: 'test-pet',
        health_score: {
          health_score: 70,
          sub_scores: { digestion: 70, appetite: 70, activity: 70, weight_stability: 70 },
          trend: 'stable',
          data_quality: 'good',
          calculated_at: new Date().toISOString()
        },
        health_state: {
          current_score: 70,
          baseline_score: 70,
          trend_velocity: 0,
          state: 'stable',
          volatility: 'low',
          confidence: 0.8,
          calculated_at: new Date().toISOString()
        },
        memories: [],
        compressed_memories: [],
        anomalies: [],
        metrics: Array.from({ length: 10 }, (_, i) => ({ date: `2026-05-${i + 1}` })),
        request_type: 'report'
      }

      const decision = await engine.evaluate(context)
      expect(decision.alternatives).toBeDefined()
      expect(Array.isArray(decision.alternatives)).toBe(true)
    })

    it('should include context snapshot in decision', async () => {
      const context: StrategyContext = {
        pet_id: 'test-pet',
        health_score: {
          health_score: 75,
          sub_scores: { digestion: 75, appetite: 75, activity: 75, weight_stability: 75 },
          trend: 'stable',
          data_quality: 'good',
          calculated_at: new Date().toISOString()
        },
        health_state: null,
        memories: [],
        compressed_memories: [],
        anomalies: [],
        metrics: [],
        request_type: 'summary'
      }

      const decision = await engine.evaluate(context)
      expect(decision.context_snapshot).toBeDefined()
      expect(decision.context_snapshot).toHaveProperty('health_score')
      expect(decision.context_snapshot).toHaveProperty('learned_weights')
    })
  })
})
