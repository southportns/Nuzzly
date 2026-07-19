import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const traceLogs = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchTraceLogs(petId, limit = 20) {
  loading.value = true
  const uid = await getUid()

  let query = supabase
    .from('recommendation_trace_log')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (uid) {
    query = query.eq('profile_id', uid)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useRecommendationTrace] fetch error:', error.message)
    traceLogs.value = []
  } else {
    traceLogs.value = data || []
  }
  loading.value = false
}

async function createTraceLog({ pet_id, session_id, model_version, data_sources, feature_snapshot, decision_graph, input_features, user_segment }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'createTraceLog')

  const finalModelVersion = model_version || 'v1.0'
  const finalDataSources = data_sources || []
  const finalFeatureSnapshot = feature_snapshot || {}
  const finalDecisionGraph = decision_graph || {}
  try {
    await writeGateway('CREATE_RECOMMENDATION_TRACE_LOG', {
      pet_id,
      session_id,
      model_version: finalModelVersion,
      data_sources: finalDataSources,
      feature_snapshot: finalFeatureSnapshot,
      decision_graph: finalDecisionGraph,
      input_features,
      user_segment
    })
  } catch (e) {
    throw normalizeError(e, 'createTraceLog')
  }
  // gateway event 类型不返回行数据，本地构造一条乐观条目
  const optimistic = {
    pet_id,
    profile_id: uid,
    session_id,
    model_version: finalModelVersion,
    data_sources: finalDataSources,
    feature_snapshot: finalFeatureSnapshot,
    decision_graph: finalDecisionGraph,
    input_features,
    user_segment,
    created_at: new Date().toISOString()
  }
  traceLogs.value = [optimistic, ...traceLogs.value]
  return optimistic
}

async function fetchTraceLogById(id) {
  const { data, error } = await supabase
    .from('recommendation_trace_log')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw normalizeError(error, 'fetchTraceLogById')
  return data
}

function getModelVersionLabel(version) {
  return version || '未知版本'
}

function getDataSourceLabel(source) {
  const labels = {
    reviews: '用户评价',
    timeline: '时间线数据',
    profile: '用户档案',
    pet: '宠物信息',
    product: '产品数据',
    external: '外部数据'
  }
  return labels[source] || source || '未知'
}

function getDecisionGraphSummary(graph) {
  if (!graph || typeof graph !== 'object') return null

  const summary = {
    steps: Object.keys(graph).length,
    factors: [],
    finalScore: null
  }

  for (const [key, value] of Object.entries(graph)) {
    if (typeof value === 'object' && value !== null) {
      summary.factors.push({
        name: key,
        weight: value.weight || 0,
        impact: value.impact || 0
      })
    }
  }

  return summary
}

function getFeatureImportance(features) {
  if (!features || typeof features !== 'object') return []

  return Object.entries(features)
    .map(([name, value]) => ({
      name,
      value,
      importance: Math.abs(value)
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10)
}

function calculateTraceStats(logs) {
  if (!logs || logs.length === 0) return null

  const stats = {
    totalTraces: logs.length,
    uniqueModels: new Set(logs.map(l => l.model_version)).size,
    uniqueSessions: new Set(logs.map(l => l.session_id)).size,
    avgDataSources: logs.reduce((sum, l) => sum + (l.data_sources?.length || 0), 0) / logs.length,
    dateRange: {
      earliest: logs[logs.length - 1]?.created_at,
      latest: logs[0]?.created_at
    }
  }

  return stats
}

export function useRecommendationTrace() {
  return {
    traceLogs,
    loading,
    fetchTraceLogs,
    createTraceLog,
    fetchTraceLogById,
    getModelVersionLabel,
    getDataSourceLabel,
    getDecisionGraphSummary,
    getFeatureImportance,
    calculateTraceStats
  }
}
