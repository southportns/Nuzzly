// =============================================
// Health Memory Tests
// =============================================

import { describe, it, expect, vi } from 'vitest'

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

import { formatMemoriesText } from '@/lib/ai/health-memory'
import type { MemoryItem } from '@/lib/ai/health-memory'

describe('Health Memory', () => {
  describe('formatMemoriesText', () => {
    it('should return empty message when no memories', () => {
      const result = formatMemoriesText([])
      expect(result).toBe('暂无历史记忆')
    })

    it('should format single memory correctly', () => {
      const memories: MemoryItem[] = [
        {
          id: '1',
          pet_id: 'pet-1',
          memory_type: 'anomaly',
          title: '软便异常',
          description: '连续3天出现软便',
          severity: 'medium',
          first_observed: '2026-05-20',
          last_observed: '2026-05-22',
          occurrence_count: 3,
          is_active: true,
          importance_score: 0.7,
          decay_score: 0.8,
          final_score: 0.56
        }
      ]

      const result = formatMemoriesText(memories)
      expect(result).toContain('软便异常')
      expect(result).toContain('(medium)')
      expect(result).toContain('重要性: 0.7')
      expect(result).toContain('连续3天出现软便')
    })

    it('should format multiple memories correctly', () => {
      const memories: MemoryItem[] = [
        {
          id: '1',
          pet_id: 'pet-1',
          memory_type: 'anomaly',
          title: '软便异常',
          description: '消化问题',
          severity: 'high',
          first_observed: '2026-05-20',
          last_observed: '2026-05-22',
          occurrence_count: 2,
          is_active: true,
          importance_score: 0.8,
          decay_score: 0.9,
          final_score: 0.72
        },
        {
          id: '2',
          pet_id: 'pet-1',
          memory_type: 'trend',
          title: '食欲下降',
          description: '进食量减少',
          severity: 'low',
          first_observed: '2026-05-25',
          last_observed: '2026-05-25',
          occurrence_count: 1,
          is_active: true,
          importance_score: 0.4,
          decay_score: 1.0,
          final_score: 0.4
        }
      ]

      const result = formatMemoriesText(memories)
      expect(result).toContain('软便异常')
      expect(result).toContain('食欲下降')
      expect(result).toContain('综合: 0.72')
      expect(result).toContain('综合: 0.4')
    })

    it('should handle memory without description', () => {
      const memories: MemoryItem[] = [
        {
          id: '1',
          pet_id: 'pet-1',
          memory_type: 'milestone',
          title: '疫苗接种',
          description: null,
          severity: 'low',
          first_observed: '2026-05-01',
          last_observed: '2026-05-01',
          occurrence_count: 1,
          is_active: true,
          importance_score: 0.3,
          decay_score: 0.5,
          final_score: 0.15
        }
      ]

      const result = formatMemoriesText(memories)
      expect(result).toContain('疫苗接种')
      expect(result).toContain('无描述')
    })
  })
})
