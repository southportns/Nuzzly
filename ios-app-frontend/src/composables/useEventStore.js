import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const events = shallowRef([])
const loading = ref(false)

async function fetchEvents({ aggregate_type, aggregate_id, event_type, limit = 50, offset = 0 } = {}) {
  loading.value = true

  let query = supabase
    .from('event_store')
    .select('*')
    .order('global_sequence', { ascending: false })
    .range(offset, offset + limit - 1)

  if (aggregate_type) {
    query = query.eq('aggregate_type', aggregate_type)
  }
  if (aggregate_id) {
    query = query.eq('aggregate_id', aggregate_id)
  }
  if (event_type) {
    query = query.eq('event_type', event_type)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useEventStore] fetch error:', error.message)
    events.value = []
  } else {
    events.value = data || []
  }
  loading.value = false
}

async function fetchEventsByAggregate(aggregateType, aggregateId) {
  loading.value = true

  const { data, error } = await supabase
    .from('event_store')
    .select('*')
    .eq('aggregate_type', aggregateType)
    .eq('aggregate_id', aggregateId)
    .order('stream_version', { ascending: true })

  if (error) {
    console.warn('[useEventStore] fetchByAggregate error:', error.message)
    events.value = []
  } else {
    events.value = data || []
  }
  loading.value = false
}

async function appendEvent({ aggregate_type, aggregate_id, event_type, payload, metadata = {}, correlation_id, causation_id, decision_id }) {
  // 获取当前最大序列号
  const { data: maxSeq } = await supabase
    .from('event_store')
    .select('global_sequence')
    .order('global_sequence', { ascending: false })
    .limit(1)
    .single()

  const nextSequence = (maxSeq?.global_sequence || 0) + 1

  // 获取当前流版本
  const { data: maxVersion } = await supabase
    .from('event_store')
    .select('stream_version')
    .eq('aggregate_type', aggregate_type)
    .eq('aggregate_id', aggregate_id)
    .order('stream_version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (maxVersion?.stream_version || 0) + 1

  const { data, error } = await supabase
    .from('event_store')
    .insert({
      aggregate_type,
      aggregate_id,
      event_type,
      payload,
      metadata,
      correlation_id: correlation_id || crypto.randomUUID(),
      causation_id,
      decision_id,
      global_sequence: nextSequence,
      stream_version: nextVersion
    })
    .select()
    .single()

  if (error) throw normalizeError(error, 'appendEvent')
  events.value = [data, ...events.value]
  return data
}

async function fetchEventById(eventId) {
  const { data, error } = await supabase
    .from('event_store')
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (error) throw normalizeError(error, 'fetchEventById')
  return data
}

async function getAggregateVersion(aggregateType, aggregateId) {
  const { data, error } = await supabase
    .from('event_store')
    .select('stream_version')
    .eq('aggregate_type', aggregateType)
    .eq('aggregate_id', aggregateId)
    .order('stream_version', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return 0
  }
  return data?.stream_version || 0
}

function getAggregateTypeLabel(type) {
  const labels = {
    pet: '宠物',
    user: '用户',
    product: '产品',
    review: '评价',
    order: '订单',
    recommendation: '推荐',
    health_record: '健康记录'
  }
  return labels[type] || type || '实体'
}

function getEventTypeLabel(type) {
  const labels = {
    created: '创建',
    updated: '更新',
    deleted: '删除',
    status_changed: '状态变更',
    data_synced: '数据同步',
    score_calculated: '分数计算',
    recommendation_generated: '推荐生成'
  }
  return labels[type] || type || '事件'
}

function getEventTypeColor(type) {
  const colors = {
    created: '#3fb950',
    updated: '#58a6ff',
    deleted: '#f85149',
    status_changed: '#d29922',
    data_synced: '#a5d6ff',
    score_calculated: '#a8c5a0',
    recommendation_generated: '#e8a87c'
  }
  return colors[type] || '#8b949e'
}

function formatEventPayload(payload) {
  if (!payload || typeof payload !== 'object') return {}

  const formatted = {}
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'object' && value !== null) {
      formatted[key] = JSON.stringify(value)
    } else {
      formatted[key] = value
    }
  }
  return formatted
}

function getEventTimeline(eventsList) {
  return eventsList.map(e => ({
    id: e.event_id,
    sequence: e.global_sequence,
    aggregate: `${getAggregateTypeLabel(e.aggregate_type)}: ${e.aggregate_id?.slice(0, 8)}...`,
    type: getEventTypeLabel(e.event_type),
    timestamp: e.created_at,
    metadata: e.metadata
  }))
}

export function useEventStore() {
  return {
    events,
    loading,
    fetchEvents,
    fetchEventsByAggregate,
    appendEvent,
    fetchEventById,
    getAggregateVersion,
    getAggregateTypeLabel,
    getEventTypeLabel,
    getEventTypeColor,
    formatEventPayload,
    getEventTimeline
  }
}
