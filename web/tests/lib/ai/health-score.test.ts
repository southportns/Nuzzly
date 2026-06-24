// =============================================
// Health Score Tests
// =============================================

import { describe, it, expect } from 'vitest'
import { getScoreLevel, formatScoreText } from '@/lib/ai/health-score'
import type { HealthScoreResult } from '@/lib/ai/health-score'

describe('Health Score', () => {
  describe('getScoreLevel', () => {
    it('should return "优秀" for scores >= 90', () => {
      const result = getScoreLevel(95)
      expect(result.level).toBe('优秀')
      expect(result.color).toBe('green')
    })

    it('should return "良好" for scores 75-89', () => {
      const result = getScoreLevel(80)
      expect(result.level).toBe('良好')
      expect(result.color).toBe('blue')
    })

    it('should return "一般" for scores 60-74', () => {
      const result = getScoreLevel(65)
      expect(result.level).toBe('一般')
      expect(result.color).toBe('yellow')
    })

    it('should return "较差" for scores 40-59', () => {
      const result = getScoreLevel(50)
      expect(result.level).toBe('较差')
      expect(result.color).toBe('orange')
    })

    it('should return "危险" for scores < 40', () => {
      const result = getScoreLevel(30)
      expect(result.level).toBe('危险')
      expect(result.color).toBe('red')
    })

    it('should handle boundary values', () => {
      expect(getScoreLevel(90).level).toBe('优秀')
      expect(getScoreLevel(75).level).toBe('良好')
      expect(getScoreLevel(60).level).toBe('一般')
      expect(getScoreLevel(40).level).toBe('较差')
    })

    it('should handle edge cases', () => {
      expect(getScoreLevel(0).level).toBe('危险')
      expect(getScoreLevel(100).level).toBe('优秀')
    })
  })

  describe('formatScoreText', () => {
    it('should format score result correctly', () => {
      const score: HealthScoreResult = {
        health_score: 85,
        sub_scores: {
          digestion: 90,
          appetite: 80,
          activity: 85,
          weight_stability: 85
        },
        trend: 'stable',
        data_quality: 'good',
        calculated_at: new Date().toISOString()
      }

      const text = formatScoreText(score)
      expect(text).toContain('健康评分：85/100')
      expect(text).toContain('消化系统：90/100')
      expect(text).toContain('食欲：80/100')
      expect(text).toContain('活跃度：85/100')
      expect(text).toContain('体重稳定：85/100')
      expect(text).toContain('趋势：稳定')
      expect(text).toContain('数据质量：良好')
    })

    it('should format improving trend', () => {
      const score: HealthScoreResult = {
        health_score: 70,
        sub_scores: {
          digestion: 70,
          appetite: 70,
          activity: 70,
          weight_stability: 70
        },
        trend: 'improving',
        data_quality: 'fair',
        calculated_at: new Date().toISOString()
      }

      const text = formatScoreText(score)
      expect(text).toContain('趋势：改善中')
      expect(text).toContain('数据质量：一般')
    })

    it('should format declining trend', () => {
      const score: HealthScoreResult = {
        health_score: 60,
        sub_scores: {
          digestion: 60,
          appetite: 60,
          activity: 60,
          weight_stability: 60
        },
        trend: 'declining',
        data_quality: 'poor',
        calculated_at: new Date().toISOString()
      }

      const text = formatScoreText(score)
      expect(text).toContain('趋势：下降中')
      expect(text).toContain('数据质量：不足')
    })
  })
})
