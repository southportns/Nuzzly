import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const dailySummaries = shallowRef([])
const latestSummary = shallowRef(null)
const loading = ref(false)

async function fetchDailySummaries(petId, days = 7) {
  loading.value = true

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('pet_id', petId)
    .gte('date', startDateStr)
    .order('date', { ascending: false })

  if (error) {
    console.warn('[useDailySummary] fetch error:', error.message)
    dailySummaries.value = []
    latestSummary.value = null
  } else {
    dailySummaries.value = data || []
    latestSummary.value = data?.[0] || null
  }
  loading.value = false
}

async function generateDailySummary(petId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0]

  try {
    // 调用后端API生成每日摘要（实际路由为 /api/analytics/[petId]/summary）
    const response = await fetch(`/api/analytics/${petId}/summary?date=${encodeURIComponent(targetDate)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('生成摘要失败')
    }

    const summaryData = await response.json()

    // 检查是否已存在该日期的摘要
    const existing = dailySummaries.value.find(s => s.date === targetDate)
    if (existing) {
      // 更新现有摘要
      const { data, error } = await supabase
        .from('daily_summary')
        .update({
          risk_level: summaryData.risk_level,
          summary_text: summaryData.summary_text,
          metrics_snapshot: summaryData.metrics_snapshot,
          anomaly_flags: summaryData.anomaly_flags,
          generated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw normalizeError(error, 'generateDailySummary')

      dailySummaries.value = dailySummaries.value.map(s => s.id === existing.id ? data : s)
      if (latestSummary.value?.id === existing.id) {
        latestSummary.value = data
      }
      return data
    } else {
      // 创建新摘要
      const { data, error } = await supabase
        .from('daily_summary')
        .insert({
          pet_id: petId,
          date: targetDate,
          risk_level: summaryData.risk_level,
          summary_text: summaryData.summary_text,
          metrics_snapshot: summaryData.metrics_snapshot,
          anomaly_flags: summaryData.anomaly_flags,
          generated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw normalizeError(error, 'generateDailySummary')

      dailySummaries.value = [data, ...dailySummaries.value]
      if (!latestSummary.value || new Date(data.date) > new Date(latestSummary.value.date)) {
        latestSummary.value = data
      }
      return data
    }
  } catch (error) {
    console.error('[useDailySummary] generate error:', error)
    throw error
  }
}

async function deleteDailySummary(id) {
  const { error } = await supabase.from('daily_summary').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deleteDailySummary')
  dailySummaries.value = dailySummaries.value.filter(s => s.id !== id)
  if (latestSummary.value?.id === id) {
    latestSummary.value = dailySummaries.value[0] || null
  }
}

function getRiskLevelLabel(level) {
  const labels = { low: '低风险', medium: '中风险', high: '高风险', critical: '严重' }
  return labels[level] || '未知'
}

function getRiskLevelColor(level) {
  const colors = { low: '#3fb950', medium: '#d29922', high: '#f85149', critical: '#da3633' }
  return colors[level] || '#3fb950'
}

function getRiskLevelIcon(level) {
  const icons = { low: '✓', medium: '⚠', high: '!', critical: '!!' }
  return icons[level] || '?'
}

function calculateHealthTrend(summaries) {
  if (!summaries || summaries.length < 2) return 'stable'

  const riskScores = summaries.map(s => {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 }
    return scores[s.risk_level] || 1
  }).reverse()

  const recent = riskScores.slice(-3)
  const older = riskScores.slice(0, -3)

  if (older.length === 0) return 'stable'

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

  if (recentAvg > olderAvg * 1.2) return 'worsening'
  if (recentAvg < olderAvg * 0.8) return 'improving'
  return 'stable'
}

function getAnomalyFlagsList(flags) {
  if (!flags || typeof flags !== 'object') return []
  return Object.entries(flags)
    .filter(([_, value]) => value === true || value === 'high' || value === 'warning')
    .map(([key, value]) => ({
      key,
      value,
      label: getAnomalyLabel(key),
      severity: value === true ? 'warning' : value
    }))
}

function getAnomalyLabel(key) {
  const labels = {
    appetite_anomaly: '食欲异常',
    weight_anomaly: '体重异常',
    activity_anomaly: '活动量异常',
    stool_anomaly: '排便异常',
    symptom_anomaly: '症状异常',
    medication_anomaly: '用药异常'
  }
  return labels[key] || key
}

export function useDailySummary() {
  return {
    dailySummaries,
    latestSummary,
    loading,
    fetchDailySummaries,
    generateDailySummary,
    deleteDailySummary,
    getRiskLevelLabel,
    getRiskLevelColor,
    getRiskLevelIcon,
    calculateHealthTrend,
    getAnomalyFlagsList
  }
}
