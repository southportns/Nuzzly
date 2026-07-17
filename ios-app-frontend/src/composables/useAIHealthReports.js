import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const healthReports = shallowRef([])
const latestReport = shallowRef(null)
const loading = ref(false)
const generating = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchHealthReports(petId, limit = 10) {
  loading.value = true

  const { data, error } = await supabase
    .from('ai_health_reports')
    .select('*')
    .eq('pet_id', petId)
    .order('report_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[useAIHealthReports] fetch error:', error.message)
    healthReports.value = []
    latestReport.value = null
  } else {
    healthReports.value = data || []
    latestReport.value = data?.[0] || null
  }
  loading.value = false
}

async function generateHealthReport(petId, petInfo) {
  generating.value = true
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'generateHealthReport')

  try {
    // 调用AI服务生成健康报告
    const response = await fetch('/api/ai/health-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_id: petId, pet_info: petInfo })
    })

    if (!response.ok) {
      throw new Error('生成报告失败')
    }

    const reportData = await response.json()

    // 保存报告到数据库
    const { data, error } = await supabase
      .from('ai_health_reports')
      .insert({
        pet_id: petId,
        report_date: new Date().toISOString().split('T')[0],
        risk_level: reportData.risk_level || 'low',
        summary_text: reportData.summary,
        recommendations: reportData.recommendations,
        causes: reportData.causes,
        monitoring_plan: reportData.monitoring_plan,
        model_used: reportData.model_used,
        processing_time_ms: reportData.processing_time_ms
      })
      .select()
      .single()

    if (error) throw normalizeError(error, 'generateHealthReport')

    healthReports.value = [data, ...healthReports.value]
    latestReport.value = data
    return data
  } finally {
    generating.value = false
  }
}

async function deleteHealthReport(id) {
  const { error } = await supabase.from('ai_health_reports').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deleteHealthReport')
  healthReports.value = healthReports.value.filter(r => r.id !== id)
  if (latestReport.value?.id === id) {
    latestReport.value = healthReports.value[0] || null
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

export function useAIHealthReports() {
  return {
    healthReports,
    latestReport,
    loading,
    generating,
    fetchHealthReports,
    generateHealthReport,
    deleteHealthReport,
    getRiskLevelLabel,
    getRiskLevelColor
  }
}
