// =============================================
// Decision Explainer Tests
// =============================================

import { describe, it, expect } from 'vitest'
import {
  generateExplanationReport,
  generateShortExplanation,
  generateJsonExplanation
} from '@/lib/ai/decision-explainer'
import type { StrategyDecision } from '@/lib/ai/strategy-engine'

const mockDecision: StrategyDecision = {
  selected_strategy: 'anomaly_focused',
  execution_path: 'analyze',
  alternatives: [
    {
      strategy: 'data_driven',
      score: 0.6,
      matched_conditions: 2,
      total_conditions: 4,
      confidence: 0.5
    },
    {
      strategy: 'deep_analysis',
      score: 0.5,
      matched_conditions: 2,
      total_conditions: 4,
      confidence: 0.4
    }
  ],
  explanation: {
    why_this_strategy: '选择"异常聚焦"策略',
    why_not_alternatives: ['"数据驱动"得分较低'],
    key_factors: ['检测到3个异常', '健康评分偏低'],
    risk_assessment: '中等风险',
    confidence_breakdown: {
      strategy_confidence: 0.8,
      data_quality: 0.7,
      memory_quality: 0.6,
      context_completeness: 0.9
    }
  },
  context_snapshot: {
    health_score: 45,
    health_state: 'declining',
    anomaly_count: 3,
    memory_count: 2,
    compressed_clusters: 1
  },
  timestamp: '2026-06-01T00:00:00Z'
}

describe('Decision Explainer', () => {
  describe('generateExplanationReport', () => {
    it('should generate complete explanation report', () => {
      const report = generateExplanationReport(mockDecision)

      expect(report.summary).toBeDefined()
      expect(report.strategy_explanation).toBeDefined()
      expect(report.execution_plan).toBeDefined()
      expect(report.risk_assessment).toBeDefined()
      expect(report.confidence_statement).toBeDefined()
      expect(report.alternatives_summary).toBeDefined()
      expect(report.full_explanation).toBeDefined()
    })

    it('should include strategy name in summary', () => {
      const report = generateExplanationReport(mockDecision)
      expect(report.summary).toContain('异常聚焦')
    })

    it('should include execution path in summary', () => {
      const report = generateExplanationReport(mockDecision)
      expect(report.summary).toContain('深度分析')
    })

    it('should include confidence in summary', () => {
      const report = generateExplanationReport(mockDecision)
      expect(report.summary).toContain('%')
    })

    it('should include key factors', () => {
      const report = generateExplanationReport(mockDecision)
      expect(report.strategy_explanation).toContain('检测到3个异常')
    })

    it('should include alternatives', () => {
      const report = generateExplanationReport(mockDecision)
      expect(report.alternatives_summary).toContain('数据驱动')
    })
  })

  describe('generateShortExplanation', () => {
    it('should generate short explanation', () => {
      const short = generateShortExplanation(mockDecision)
      expect(short).toContain('异常聚焦')
      expect(short).toContain('深度分析')
      expect(short).toContain('80%')
    })
  })

  describe('generateJsonExplanation', () => {
    it('should generate JSON explanation', () => {
      const json = generateJsonExplanation(mockDecision)

      expect(json.strategy.type).toBe('anomaly_focused')
      expect(json.strategy.name).toBe('异常聚焦')
      expect(json.execution.path).toBe('analyze')
      expect(json.execution.path_name).toBe('深度分析')
      expect(json.explanation).toBeDefined()
      expect(json.alternatives).toHaveLength(2)
      expect(json.context).toBeDefined()
      expect(json.timestamp).toBeDefined()
    })

    it('should include alternatives with scores', () => {
      const json = generateJsonExplanation(mockDecision)

      expect(json.alternatives[0].type).toBe('data_driven')
      expect(json.alternatives[0].score).toBe(0.6)
      expect(json.alternatives[1].type).toBe('deep_analysis')
      expect(json.alternatives[1].score).toBe(0.5)
    })
  })
})
