import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const insights = shallowRef([])
const latestInsight = shallowRef(null)
const loading = ref(false)

async function fetchInsights(productId, limit = 10) {
  loading.value = true

  let query = supabase
    .from('ai_insights')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useAIInsights] fetch error:', error.message)
    insights.value = []
    latestInsight.value = null
  } else {
    insights.value = data || []
    latestInsight.value = data?.[0] || null
  }
  loading.value = false
}

async function fetchInsightsByType(insightType, limit = 10) {
  loading.value = true

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('insight_type', insightType)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[useAIInsights] fetchByType error:', error.message)
    insights.value = []
  } else {
    insights.value = data || []
  }
  loading.value = false
}

async function fetchUserInsights(userId, limit = 20) {
  loading.value = true

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*, products(name, brand)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[useAIInsights] fetchUser error:', error.message)
    insights.value = []
  } else {
    insights.value = data || []
  }
  loading.value = false
}

function getInsightTypeLabel(type) {
  const labels = {
    price_alert: '价格提醒',
    risk_warning: '风险预警',
    recommendation: '推荐建议',
    trend_analysis: '趋势分析',
    ingredient_change: '成分变更',
    health_tip: '健康提示',
    recall_notice: '召回通知'
  }
  return labels[type] || type || '洞察'
}

function getInsightTypeIcon(type) {
  const icons = {
    price_alert: '💰',
    risk_warning: '⚠️',
    recommendation: '💡',
    trend_analysis: '📈',
    ingredient_change: '🔄',
    health_tip: '🏥',
    recall_notice: '🚨'
  }
  return icons[type] || '🔍'
}

function getInsightTypeColor(type) {
  const colors = {
    price_alert: '#3fb950',
    risk_warning: '#f85149',
    recommendation: '#58a6ff',
    trend_analysis: '#d29922',
    ingredient_change: '#a5d6ff',
    health_tip: '#3fb950',
    recall_notice: '#da3633'
  }
  return colors[type] || '#58a6ff'
}

function getConfidenceLabel(score) {
  if (score >= 0.9) return '高置信度'
  if (score >= 0.7) return '中置信度'
  if (score >= 0.5) return '低置信度'
  return '待验证'
}

function getConfidenceColor(score) {
  if (score >= 0.9) return '#3fb950'
  if (score >= 0.7) return '#d29922'
  if (score >= 0.5) return '#f85149'
  return '#8b949e'
}

function filterRelevantInsights(insightsList, petProfile) {
  if (!petProfile) return insightsList

  return insightsList.filter(insight => {
    // 根据宠物类型过滤
    if (insight.metadata?.species && insight.metadata.species !== petProfile.species) {
      return false
    }
    // 根据年龄阶段过滤
    if (insight.metadata?.life_stage && insight.metadata.life_stage !== petProfile.life_stage) {
      return false
    }
    return true
  })
}

function groupInsightsByType(insightsList) {
  const groups = {}
  for (const insight of insightsList) {
    const type = insight.insight_type || 'other'
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(insight)
  }
  return groups
}

export function useAIInsights() {
  return {
    insights,
    latestInsight,
    loading,
    fetchInsights,
    fetchInsightsByType,
    fetchUserInsights,
    getInsightTypeLabel,
    getInsightTypeIcon,
    getInsightTypeColor,
    getConfidenceLabel,
    getConfidenceColor,
    filterRelevantInsights,
    groupInsightsByType
  }
}
