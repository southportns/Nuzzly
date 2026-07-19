import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const diseaseRecords = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchDiseaseRecords(petId) {
  loading.value = true

  const { data, error } = await supabase
    .from('pet_disease_records')
    .select('*')
    .eq('pet_id', petId)
    .order('diagnosed_on', { ascending: false })

  if (error) {
    console.warn('[useDiseaseRecords] fetch error:', error.message)
    diseaseRecords.value = []
  } else {
    diseaseRecords.value = data || []
  }
  loading.value = false
}

async function createDiseaseRecord({ pet_id, name, severity = 'mild', status = 'active', diagnosed_on, notes }) {
  const finalDiagnosedOn = diagnosed_on || new Date().toISOString().split('T')[0]
  try {
    await writeGateway('CREATE_DISEASE_RECORD', {
      pet_id,
      name,
      severity,
      status,
      diagnosed_on: finalDiagnosedOn,
      notes
    })
  } catch (e) {
    throw normalizeError(e, 'createDiseaseRecord')
  }
  // gateway event 类型不返回行数据，本地构造一条乐观条目
  const optimistic = {
    pet_id,
    name,
    severity,
    status,
    diagnosed_on: finalDiagnosedOn,
    notes,
    created_at: new Date().toISOString()
  }
  diseaseRecords.value = [optimistic, ...diseaseRecords.value]
  return optimistic
}

async function updateDiseaseRecord(id, updates) {
  try {
    await writeGateway('UPDATE_DISEASE_RECORD', { id, ...updates })
  } catch (e) {
    throw normalizeError(e, 'updateDiseaseRecord')
  }
  // gateway event 类型不返回行数据，本地用已有记录合并 updates
  diseaseRecords.value = diseaseRecords.value.map(r =>
    r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
  )
  return diseaseRecords.value.find(r => r.id === id) || null
}

async function deleteDiseaseRecord(id) {
  try {
    await writeGateway('DELETE_DISEASE_RECORD', { id })
  } catch (e) {
    throw normalizeError(e, 'deleteDiseaseRecord')
  }
  diseaseRecords.value = diseaseRecords.value.filter(r => r.id !== id)
}

async function markAsResolved(id) {
  return updateDiseaseRecord(id, { status: 'resolved' })
}

async function markAsChronic(id) {
  return updateDiseaseRecord(id, { status: 'chronic' })
}

function getSeverityLabel(severity) {
  const labels = {
    mild: '轻微',
    moderate: '中度',
    severe: '严重',
    critical: '危急'
  }
  return labels[severity] || severity || '未知'
}

function getSeverityColor(severity) {
  const colors = {
    mild: '#3fb950',
    moderate: '#d29922',
    severe: '#f85149',
    critical: '#da3633'
  }
  return colors[severity] || '#8b949e'
}

function getStatusLabel(status) {
  const labels = {
    active: '进行中',
    resolved: '已康复',
    chronic: '慢性病',
    under_treatment: '治疗中'
  }
  return labels[status] || status || '未知'
}

function getStatusColor(status) {
  const colors = {
    active: '#d29922',
    resolved: '#3fb950',
    chronic: '#58a6ff',
    under_treatment: '#e8a87c'
  }
  return colors[status] || '#8b949e'
}

function calculateDiseaseStats(records) {
  if (!records || records.length === 0) return null

  const stats = {
    total: records.length,
    active: records.filter(r => r.status === 'active' || r.status === 'under_treatment').length,
    resolved: records.filter(r => r.status === 'resolved').length,
    chronic: records.filter(r => r.status === 'chronic').length,
    bySeverity: {
      mild: records.filter(r => r.severity === 'mild').length,
      moderate: records.filter(r => r.severity === 'moderate').length,
      severe: records.filter(r => r.severity === 'severe').length,
      critical: records.filter(r => r.severity === 'critical').length
    },
    recentDiagnoses: records.slice(0, 5)
  }

  return stats
}

function getActiveDiseases(records) {
  return records.filter(r => r.status === 'active' || r.status === 'under_treatment')
}

function getChronicDiseases(records) {
  return records.filter(r => r.status === 'chronic')
}

export function useDiseaseRecords() {
  return {
    diseaseRecords,
    loading,
    fetchDiseaseRecords,
    createDiseaseRecord,
    updateDiseaseRecord,
    deleteDiseaseRecord,
    markAsResolved,
    markAsChronic,
    getSeverityLabel,
    getSeverityColor,
    getStatusLabel,
    getStatusColor,
    calculateDiseaseStats,
    getActiveDiseases,
    getChronicDiseases
  }
}
