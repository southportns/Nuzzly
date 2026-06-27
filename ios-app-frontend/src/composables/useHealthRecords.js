import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'
import { mockHealthRecords, mockWeightRecords, mockAllergies, mockTimeline } from '../lib/mock'

// 列表数据整体替换，使用 shallowRef 减少深度响应式开销
const healthRecords = shallowRef([])
const weightRecords = shallowRef([])
const allergies = shallowRef([])
const timeline = shallowRef([])
const loading = ref(false)

async function fetchHealthRecords(petId) {
  loading.value = true
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id

  let query = supabase.from('health_records')
    .select('id, record_type, record_time, weight_kg, symptom_code, severity, diagnosis, medication_name, notes, metadata')
    .order('record_time', { ascending: false }).limit(20)
  if (uid) query = query.eq('profile_id', uid)
  if (petId) query = query.eq('pet_id', petId)

  const { data, error } = await query
  if (error || !data?.length) {
    console.warn('[useHealthRecords] 降级 mock', error?.message)
    healthRecords.value = mockHealthRecords
    weightRecords.value = mockWeightRecords
    timeline.value = mockTimeline
  } else {
    healthRecords.value = data.filter(r => r.record_type !== 'weight')
    weightRecords.value = data.filter(r => r.record_type === 'weight' && r.weight_kg)
    timeline.value = data.map(r => ({
      date: r.record_time?.slice(0, 10),
      text: r.notes || r.diagnosis || r.medication_name || ''
    })).filter(r => r.text)
  }
  loading.value = false
}

async function fetchAllergies(petId) {
  const { data, error } = await supabase.from('pet_allergies').select('*').eq('pet_id', petId)
  if (error || !data?.length) {
    allergies.value = mockAllergies
  } else {
    allergies.value = data
  }
}

async function addAllergy({ pet_id, allergen, severity = 'mild', confirmed = false }) {
  const { data, error } = await supabase
    .from('pet_allergies')
    .insert({ pet_id, allergen, severity, confirmed })
    .select()
    .single()
  if (error) throw error
  allergies.value = [...allergies.value, data]
  return data
}

async function deleteAllergy(id) {
  const { error } = await supabase.from('pet_allergies').delete().eq('id', id)
  if (error) throw error
  allergies.value = allergies.value.filter(a => a.id !== id)
}

async function addHealthRecord(record) {
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'addHealthRecord')

  const { data, error } = await supabase
    .from('health_records')
    .insert({ ...record, profile_id: uid })
    .select()
    .single()
  if (error) throw normalizeError(error, 'addHealthRecord')
  return data
}

export function useHealthRecords() {
  return { healthRecords, weightRecords, allergies, timeline, loading, fetchHealthRecords, fetchAllergies, addAllergy, deleteAllergy, addHealthRecord }
}
