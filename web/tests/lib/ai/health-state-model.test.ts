// =============================================
// Health State Model Tests
// =============================================

import { describe, it, expect } from 'vitest'
import { getStateDescription, formatStateText } from '@/lib/ai/health-state-model'
import type { HealthStateResult } from '@/lib/ai/health-state-model'

describe('Health State Model', () => {
  describe('getStateDescription', () => {
    it('should return improving description', () => {
      const result = getStateDescription('improving')
      expect(result.label).toBe('改善中')
      expect(result.color).toBe('green')
      expect(result.description).toContain('好转')
    })

    it('should return stable description', () => {
      const result = getStateDescription('stable')
      expect(result.label).toBe('稳定')
      expect(result.color).toBe('blue')
      expect(result.description).toContain('稳定')
    })

    it('should return declining description', () => {
      const result = getStateDescription('declining')
      expect(result.label).toBe('下降中')
      expect(result.color).toBe('orange')
      expect(result.description).toContain('下降')
    })

    it('should return volatile description', () => {
      const result = getStateDescription('volatile')
      expect(result.label).toBe('波动')
      expect(result.color).toBe('red')
      expect(result.description).toContain('波动')
    })

    it('should return unknown for invalid state', () => {
      const result = getStateDescription('invalid')
      expect(result.label).toBe('未知')
      expect(result.color).toBe('gray')
    })
  })

  describe('formatStateText', () => {
    it('should format improving state', () => {
      const state: HealthStateResult = {
        current_score: 80,
        baseline_score: 75,
        trend_velocity: 1.5,
        state: 'improving',
        volatility: 'low',
        confidence: 0.85,
        calculated_at: new Date().toISOString()
      }

      const text = formatStateText(state)
      expect(text).toContain('当前分数：80/100')
      expect(text).toContain('基线分数：75/100')
      expect(text).toContain('+1.5/天')
      expect(text).toContain('改善中')
      expect(text).toContain('low')
      expect(text).toContain('85%')
    })

    it('should format declining state', () => {
      const state: HealthStateResult = {
        current_score: 60,
        baseline_score: 70,
        trend_velocity: -2.0,
        state: 'declining',
        volatility: 'high',
        confidence: 0.7,
        calculated_at: new Date().toISOString()
      }

      const text = formatStateText(state)
      expect(text).toContain('当前分数：60/100')
      expect(text).toContain('基线分数：70/100')
      expect(text).toContain('-2/天')
      expect(text).toContain('下降中')
      expect(text).toContain('high')
    })

    it('should format stable state', () => {
      const state: HealthStateResult = {
        current_score: 75,
        baseline_score: 75,
        trend_velocity: 0.1,
        state: 'stable',
        volatility: 'low',
        confidence: 0.9,
        calculated_at: new Date().toISOString()
      }

      const text = formatStateText(state)
      expect(text).toContain('稳定')
      expect(text).toContain('0.1/天')
    })

    it('should format volatile state', () => {
      const state: HealthStateResult = {
        current_score: 65,
        baseline_score: 65,
        trend_velocity: 0,
        state: 'volatile',
        volatility: 'high',
        confidence: 0.5,
        calculated_at: new Date().toISOString()
      }

      const text = formatStateText(state)
      expect(text).toContain('波动')
      expect(text).toContain('high')
    })
  })
})
