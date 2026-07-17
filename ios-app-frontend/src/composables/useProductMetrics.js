import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const productMetrics = shallowRef([])
const loading = ref(false)

async function fetchProductMetrics(productId, days = 30) {
  loading.value = true

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('product_metrics_daily')
    .select('*')
    .eq('product_id', productId)
    .gte('date', startDateStr)
    .order('date', { ascending: false })

  if (error) {
    console.warn('[useProductMetrics] fetch error:', error.message)
    productMetrics.value = []
  } else {
    productMetrics.value = data || []
  }
  loading.value = false
}

async function fetchLatestMetrics(productIds) {
  loading.value = true

  const { data, error } = await supabase
    .from('product_metrics_daily')
    .select('product_id, date, average_rating, review_count, risk_score, repurchase_rate')
    .in('product_id', productIds)
    .order('date', { ascending: false })
    .limit(productIds.length * 2)

  if (error) {
    console.warn('[useProductMetrics] fetchLatest error:', error.message)
    productMetrics.value = []
  } else {
    // 每个产品只保留最新的一条
    const latestMap = new Map()
    for (const item of data || []) {
      if (!latestMap.has(item.product_id)) {
        latestMap.set(item.product_id, item)
      }
    }
    productMetrics.value = Array.from(latestMap.values())
  }
  loading.value = false
}

function getLatestMetric(productId) {
  return productMetrics.value.find(m => m.product_id === productId)
}

function getMetricTrend(productId, metricName, days = 7) {
  const metrics = productMetrics.value
    .filter(m => m.product_id === productId)
    .slice(0, days)

  if (metrics.length < 2) return 'stable'

  const values = metrics.map(m => m[metricName]).filter(v => v != null)
  if (values.length < 2) return 'stable'

  const recent = values[0]
  const older = values[values.length - 1]
  const diff = recent - older

  if (diff > 0.05) return 'improving'
  if (diff < -0.05) return 'declining'
  return 'stable'
}

function getRiskLevel(score) {
  if (score >= 0.7) return { label: '高风险', color: '#f85149' }
  if (score >= 0.4) return { label: '中风险', color: '#d29922' }
  return { label: '低风险', color: '#3fb950' }
}

function formatMetric(value, suffix = '') {
  if (value == null) return '-'
  if (typeof value === 'number') {
    return value.toFixed(1) + suffix
  }
  return String(value) + suffix
}

function calculateAverageMetric(productId, metricName) {
  const metrics = productMetrics.value.filter(m => m.product_id === productId)
  const values = metrics.map(m => m[metricName]).filter(v => v != null)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function useProductMetrics() {
  return {
    productMetrics,
    loading,
    fetchProductMetrics,
    fetchLatestMetrics,
    getLatestMetric,
    getMetricTrend,
    getRiskLevel,
    formatMetric,
    calculateAverageMetric
  }
}
