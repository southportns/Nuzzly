import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const medicationRecords = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchMedicationRecords(petId) {
  loading.value = true

  const { data, error } = await supabase
    .from('pet_medication_records')
    .select('*')
    .eq('pet_id', petId)
    .order('started_on', { ascending: false })

  if (error) {
    console.warn('[useMedicationRecords] fetch error:', error.message)
    medicationRecords.value = []
  } else {
    medicationRecords.value = data || []
  }
  loading.value = false
}

async function createMedicationRecord({ pet_id, name, dosage, frequency, started_on, ended_on, is_ongoing = true, notes }) {
  const finalStartedOn = started_on || new Date().toISOString().split('T')[0]
  try {
    await writeGateway('CREATE_MEDICATION_RECORD', {
      pet_id,
      name,
      dosage,
      frequency,
      started_on: finalStartedOn,
      ended_on,
      is_ongoing,
      notes
    })
  } catch (e) {
    throw normalizeError(e, 'createMedicationRecord')
  }
  // gateway event 类型不返回行数据，本地构造一条乐观条目
  const optimistic = {
    pet_id,
    name,
    dosage,
    frequency,
    started_on: finalStartedOn,
    ended_on,
    is_ongoing,
    notes,
    created_at: new Date().toISOString()
  }
  medicationRecords.value = [optimistic, ...medicationRecords.value]
  return optimistic
}

async function updateMedicationRecord(id, updates) {
  try {
    await writeGateway('UPDATE_MEDICATION_RECORD', { id, ...updates })
  } catch (e) {
    throw normalizeError(e, 'updateMedicationRecord')
  }
  // gateway event 类型不返回行数据，本地用已有记录合并 updates
  medicationRecords.value = medicationRecords.value.map(r =>
    r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
  )
  return medicationRecords.value.find(r => r.id === id) || null
}

async function deleteMedicationRecord(id) {
  try {
    await writeGateway('DELETE_MEDICATION_RECORD', { id })
  } catch (e) {
    throw normalizeError(e, 'deleteMedicationRecord')
  }
  medicationRecords.value = medicationRecords.value.filter(r => r.id !== id)
}

async function stopMedication(id, ended_on) {
  return updateMedicationRecord(id, {
    is_ongoing: false,
    ended_on: ended_on || new Date().toISOString().split('T')[0]
  })
}

function getFrequencyLabel(frequency) {
  const labels = {
    'once_daily': '每日一次',
    'twice_daily': '每日两次',
    'three_times_daily': '每日三次',
    'weekly': '每周一次',
    'as_needed': '按需服用',
    'other': '其他'
  }
  return labels[frequency] || frequency || '未知'
}

function calculateDuration(record) {
  const start = new Date(record.started_on)
  const end = record.ended_on ? new Date(record.ended_on) : new Date()
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  return days
}

function calculateMedicationStats(records) {
  if (!records || records.length === 0) return null

  const stats = {
    total: records.length,
    ongoing: records.filter(r => r.is_ongoing).length,
    completed: records.filter(r => !r.is_ongoing).length,
    avgDuration: 0,
    recentMedications: records.slice(0, 5)
  }

  // 计算平均用药时长
  const durations = records.filter(r => r.ended_on).map(r => calculateDuration(r))
  if (durations.length > 0) {
    stats.avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  }

  return stats
}

function getOngoingMedications(records) {
  return records.filter(r => r.is_ongoing)
}

function getCompletedMedications(records) {
  return records.filter(r => !r.is_ongoing)
}

export function useMedicationRecords() {
  return {
    medicationRecords,
    loading,
    fetchMedicationRecords,
    createMedicationRecord,
    updateMedicationRecord,
    deleteMedicationRecord,
    stopMedication,
    getFrequencyLabel,
    calculateDuration,
    calculateMedicationStats,
    getOngoingMedications,
    getCompletedMedications
  }
}
