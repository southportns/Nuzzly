import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const petEvents = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchPetEvents(petId, limit = 50) {
  loading.value = true
  const uid = await getUid()

  let query = supabase
    .from('pet_events')
    .select('*, products(name, brand)')
    .eq('pet_id', petId)
    .order('event_time', { ascending: false })
    .limit(limit)

  if (uid) {
    query = query.eq('profile_id', uid)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[usePetEvents] fetch error:', error.message)
    petEvents.value = []
  } else {
    petEvents.value = data || []
  }
  loading.value = false
}

async function fetchEventsByType(petId, eventType, limit = 20) {
  loading.value = true

  const { data, error } = await supabase
    .from('pet_events')
    .select('*')
    .eq('pet_id', petId)
    .eq('event_type', eventType)
    .order('event_time', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[usePetEvents] fetchByType error:', error.message)
    petEvents.value = []
  } else {
    petEvents.value = data || []
  }
  loading.value = false
}

async function createPetEvent({ pet_id, event_type, event_time, notes, severity, product_id, symptom_code, metadata, source_type = 'manual' }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'createPetEvent')

  const finalEventTime = event_time || new Date().toISOString()
  try {
    await writeGateway('CREATE_PET_EVENT', {
      pet_id,
      event_type,
      event_time: finalEventTime,
      notes,
      severity,
      product_id,
      symptom_code,
      metadata,
      source_type
    })
  } catch (e) {
    throw normalizeError(e, 'createPetEvent')
  }
  // gateway event 类型不返回行数据，本地构造一条乐观条目
  const optimistic = {
    pet_id,
    profile_id: uid,
    event_type,
    event_time: finalEventTime,
    notes,
    severity,
    product_id,
    symptom_code,
    metadata,
    source_type,
    created_at: new Date().toISOString()
  }
  petEvents.value = [optimistic, ...petEvents.value]
  return optimistic
}

async function updatePetEvent(id, updates) {
  const { data, error } = await supabase
    .from('pet_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw normalizeError(error, 'updatePetEvent')
  petEvents.value = petEvents.value.map(e => e.id === id ? data : e)
  return data
}

async function deletePetEvent(id) {
  const { error } = await supabase.from('pet_events').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deletePetEvent')
  petEvents.value = petEvents.value.filter(e => e.id !== id)
}

function getEventTypeLabel(type) {
  const labels = {
    symptom: '症状',
    medication: '用药',
    vet_visit: '就诊',
    vaccination: '疫苗',
    weight_change: '体重变化',
    diet_change: '饮食变更',
    behavior: '行为',
    other: '其他'
  }
  return labels[type] || type || '事件'
}

function getEventTypeIcon(type) {
  const icons = {
    symptom: '🏥',
    medication: '💊',
    vet_visit: '👨‍⚕️',
    vaccination: '💉',
    weight_change: '⚖️',
    diet_change: '🍽️',
    behavior: '🐾',
    other: '📝'
  }
  return icons[type] || '📌'
}

function getEventTypeColor(type) {
  const colors = {
    symptom: '#f85149',
    medication: '#58a6ff',
    vet_visit: '#3fb950',
    vaccination: '#a5d6ff',
    weight_change: '#d29922',
    diet_change: '#e8a87c',
    behavior: '#a8c5a0',
    other: '#8b949e'
  }
  return colors[type] || '#8b949e'
}

function getSeverityLabel(severity) {
  if (severity == null) return '未知'
  if (severity >= 8) return '严重'
  if (severity >= 5) return '中度'
  if (severity >= 3) return '轻微'
  return '轻微'
}

function getSeverityColor(severity) {
  if (severity == null) return '#8b949e'
  if (severity >= 8) return '#f85149'
  if (severity >= 5) return '#d29922'
  if (severity >= 3) return '#a5d6ff'
  return '#3fb950'
}

function getSourceTypeLabel(source) {
  const labels = {
    manual: '手动记录',
    ai_extracted: 'AI提取',
    imported: '导入',
    api: 'API'
  }
  return labels[source] || source || '未知'
}

function groupEventsByDate(events) {
  const groups = {}
  for (const event of events) {
    const date = event.event_time?.slice(0, 10) || 'unknown'
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
  }
  return groups
}

function getEventTimeline(events) {
  return events.map(e => ({
    id: e.id,
    date: e.event_time,
    type: e.event_type,
    title: getEventTypeLabel(e.event_type),
    description: e.notes || '',
    severity: e.severity,
    icon: getEventTypeIcon(e.event_type)
  })).sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function usePetEvents() {
  return {
    petEvents,
    loading,
    fetchPetEvents,
    fetchEventsByType,
    createPetEvent,
    updatePetEvent,
    deletePetEvent,
    getEventTypeLabel,
    getEventTypeIcon,
    getEventTypeColor,
    getSeverityLabel,
    getSeverityColor,
    getSourceTypeLabel,
    groupEventsByDate,
    getEventTimeline
  }
}
