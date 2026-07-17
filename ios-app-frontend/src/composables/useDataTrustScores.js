import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const trustScores = shallowRef([])
const loading = ref(false)

async function fetchTrustScores(entityType, entityId) {
  loading.value = true

  let query = supabase
    .from('data_trust_scores')
    .select('*')
    .order('calculated_at', { ascending: false })

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }
  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useDataTrustScores] fetch error:', error.message)
    trustScores.value = []
  } else {
    trustScores.value = data || []
  }
  loading.value = false
}

async function fetchTrustScoreByEntity(entityType, entityId) {
  const { data, error } = await supabase
    .from('data_trust_scores')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.warn('[useDataTrustScores] fetchByEntity error:', error.message)
    return null
  }
  return data
}

async function calculateTrustScore(entityType, entityId, metadata) {
  // 调用后端API计算信任分数
  try {
    const response = await fetch('/api/analytics/trust-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        metadata
      })
    })

    if (!response.ok) {
      throw new Error('计算信任分数失败')
    }

    const result = await response.json()

    // 保存到数据库
    const { data, error } = await supabase
      .from('data_trust_scores')
      .upsert({
        entity_type: entityType,
        entity_id: entityId,
        trust_score: result.trust_score,
        confidence_score: result.confidence_score,
        factor_scores: result.factor_scores,
        has_photos: result.has_photos,
        has_voucher: result.has_voucher,
        has_long_term_data: result.has_long_term_data,
        is_continuous: result.is_continuous,
        is_anomaly: result.is_anomaly,
        suspicious_level: result.suspicious_level,
        calculated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw normalizeError(error, 'calculateTrustScore')

    // 更新本地状态
    const index = trustScores.value.findIndex(
      s => s.entity_type === entityType && s.entity_id === entityId
    )
    if (index >= 0) {
      trustScores.value[index] = data
    } else {
      trustScores.value = [data, ...trustScores.value]
    }

    return data
  } catch (error) {
    console.error('[useDataTrustScores] calculate error:', error)
    throw error
  }
}

function getTrustLevel(score) {
  if (score >= 0.9) return { label: '极高信任', color: '#3fb950', icon: '🛡️' }
  if (score >= 0.7) return { label: '高信任', color: '#58a6ff', icon: '✓' }
  if (score >= 0.5) return { label: '中等信任', color: '#d29922', icon: '⚠' }
  if (score >= 0.3) return { label: '低信任', color: '#f85149', icon: '!' }
  return { label: '极低信任', color: '#da3633', icon: '🚨' }
}

function getSuspiciousLevelLabel(level) {
  if (level == null) return '未知'
  if (level >= 0.8) return '高度可疑'
  if (level >= 0.5) return '中度可疑'
  if (level >= 0.2) return '轻微可疑'
  return '正常'
}

function getSuspiciousLevelColor(level) {
  if (level == null) return '#8b949e'
  if (level >= 0.8) return '#da3633'
  if (level >= 0.5) return '#f85149'
  if (level >= 0.2) return '#d29922'
  return '#3fb950'
}

function getFactorLabel(factor) {
  const labels = {
    has_photos: '有照片凭证',
    has_voucher: '有购买凭证',
    has_long_term_data: '有长期数据',
    is_continuous: '数据连续',
    is_anomaly: '异常数据'
  }
  return labels[factor] || factor || '未知因素'
}

function getFactorColor(factor, value) {
  const positiveFactors = ['has_photos', 'has_voucher', 'has_long_term_data', 'is_continuous']
  if (positiveFactors.includes(factor)) {
    return value ? '#3fb950' : '#8b949e'
  }
  // is_anomaly 是负面因素
  return value ? '#f85149' : '#3fb950'
}

function calculateTrustBreakdown(score) {
  if (!score) return null

  const factors = score.factor_scores || {}
  const breakdown = {
    positive: [],
    negative: [],
    neutral: []
  }

  for (const [key, value] of Object.entries(factors)) {
    const factor = {
      name: key,
      label: getFactorLabel(key),
      value: value,
      isPositive: value > 0
    }

    if (value > 0) {
      breakdown.positive.push(factor)
    } else if (value < 0) {
      breakdown.negative.push(factor)
    } else {
      breakdown.neutral.push(factor)
    }
  }

  return breakdown
}

export function useDataTrustScores() {
  return {
    trustScores,
    loading,
    fetchTrustScores,
    fetchTrustScoreByEntity,
    calculateTrustScore,
    getTrustLevel,
    getSuspiciousLevelLabel,
    getSuspiciousLevelColor,
    getFactorLabel,
    getFactorColor,
    calculateTrustBreakdown
  }
}
