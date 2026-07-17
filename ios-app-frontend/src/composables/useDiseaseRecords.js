import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
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
  const { data, error } = await supabase
    .from('pet_disease_records')
    .insert({
      pet_id,
      name,
      severity,
      status,
      diagnosed_on: diagnosed_on || new Date().toISOString().split('T')[0],
      notes
    })
    .select()
    .single()

  if (error) throw normalizeError(error, 'createDiseaseRecord')
  diseaseRecords.value = [data, ...diseaseRecords.value]
  return data
}

async function updateDiseaseRecord(id, updates) {
  const { data, error } = await supabase
    .from('pet_disease_records')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw normalizeError(error, 'updateDiseaseRecord')
  diseaseRecords.value = diseaseRecords.value.map(r => r.id === id ? data : r)
  return data
}

async function deleteDiseaseRecord(id) {
  const { error } = await supabase.from('pet_disease_records').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deleteDiseaseRecord')
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
