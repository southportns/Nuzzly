import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const healthMetrics = shallowRef([])
const latestMetrics = shallowRef(null)
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchHealthMetrics(petId, days = 30) {
  loading.value = true
  const uid = await getUid()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  let query = supabase
    .from('health_metrics')
    .select('*')
    .eq('pet_id', petId)
    .gte('date', startDateStr)
    .order('date', { ascending: false })

  if (uid) {
    // 健康指标通过pet_id关联，不需要profile_id过滤
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useHealthMetrics] fetch error:', error.message)
    healthMetrics.value = []
    latestMetrics.value = null
  } else {
    healthMetrics.value = data || []
    latestMetrics.value = data?.[0] || null
  }
  loading.value = false
}

async function addHealthMetric({ pet_id, date, appetite_score, activity_score, stool_score, symptom_severity_score, weight_delta }) {
  const finalDate = date || new Date().toISOString().split('T')[0]
  let result
  try {
    result = await writeGateway('CREATE_HEALTH_METRIC', {
      pet_id,
      date: finalDate,
      appetite_score,
      activity_score,
      stool_score,
      symptom_severity_score,
      weight_delta,
      calculation_method: 'manual'
    })
  } catch (e) {
    throw normalizeError(e, 'addHealthMetric')
  }
  // direct write 类型返回 data 字段
  const data = result?.data || {
    pet_id,
    date: finalDate,
    appetite_score,
    activity_score,
    stool_score,
    symptom_severity_score,
    weight_delta,
    calculation_method: 'manual',
    created_at: new Date().toISOString()
  }
  healthMetrics.value = [data, ...healthMetrics.value]
  latestMetrics.value = data
  return data
}

async function updateHealthMetric(id, updates) {
  const { data, error } = await supabase
    .from('health_metrics')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw normalizeError(error, 'updateHealthMetric')
  healthMetrics.value = healthMetrics.value.map(m => m.id === id ? data : m)
  if (latestMetrics.value?.id === id) {
    latestMetrics.value = data
  }
  return data
}

function getMetricTrend(metricName, days = 7) {
  const recent = healthMetrics.value.slice(0, days)
  if (recent.length < 2) return 'stable'

  const values = recent.map(m => m[metricName]).filter(v => v != null)
  if (values.length < 2) return 'stable'

  const avgRecent = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 2)
  const avgOlder = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(values.length / 2)

  if (avgRecent > avgOlder * 1.1) return 'improving'
  if (avgRecent < avgOlder * 0.9) return 'declining'
  return 'stable'
}

function calculateOverallScore(metrics) {
  if (!metrics) return null

  const scores = [
    metrics.appetite_score,
    metrics.activity_score,
    metrics.stool_score,
    metrics.symptom_severity_score ? (10 - metrics.symptom_severity_score) : null
  ].filter(s => s != null)

  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function useHealthMetrics() {
  return {
    healthMetrics,
    latestMetrics,
    loading,
    fetchHealthMetrics,
    addHealthMetric,
    updateHealthMetric,
    getMetricTrend,
    calculateOverallScore
  }
}
