import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'
import { writeGateway } from '../lib/gateway'

const healthRecords = shallowRef([])
const weightRecords = shallowRef([])
const allergies = shallowRef([])
const timeline = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchHealthRecords(petId) {
  loading.value = true
  const uid = await getUid()

  let query = supabase.from('health_records')
    .select('id, record_type, record_time, weight_kg, symptom_code, severity, diagnosis, medication_name, notes, metadata')
    .order('record_time', { ascending: false }).limit(20)
  if (uid) query = query.eq('profile_id', uid)
  if (petId) query = query.eq('pet_id', petId)

  const { data, error } = await query
  if (error) {
    console.warn('[useHealthRecords] fetch error:', error.message)
    healthRecords.value = []
    weightRecords.value = []
    timeline.value = []
  } else {
    const records = data || []
    healthRecords.value = records.filter(r => r.record_type !== 'weight')
    weightRecords.value = records.filter(r => r.record_type === 'weight' && r.weight_kg)
    timeline.value = records
      .map(r => ({ date: r.record_time?.slice(0, 10), text: r.notes || r.diagnosis || r.medication_name || '' }))
      .filter(r => r.text)
  }
  loading.value = false
}

async function fetchAllergies(petId) {
  const { data, error } = await supabase.from('pet_allergies').select('*').eq('pet_id', petId)
  if (error) {
    console.warn('[useHealthRecords] fetchAllergies error:', error.message)
    allergies.value = []
  } else {
    allergies.value = data || []
  }
}

async function addAllergy({ pet_id, allergen, severity = 'mild', confirmed = false }) {
  const { data, error } = await supabase
    .from('pet_allergies')
    .insert({ pet_id, allergen, severity, confirmed })
    .select()
    .single()
  if (error) throw normalizeError(error, 'addAllergy')
  allergies.value = [...allergies.value, data]
  return data
}

async function deleteAllergy(id) {
  const { error } = await supabase.from('pet_allergies').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deleteAllergy')
  allergies.value = allergies.value.filter(a => a.id !== id)
}

async function deleteHealthRecord(id) {
  const { error } = await supabase.from('health_records').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deleteHealthRecord')
}

async function addHealthRecord(record) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'addHealthRecord')

  const { data, error } = await writeGateway('CREATE_HEALTH_RECORD', { ...record })
  if (error) throw normalizeError({ message: error }, 'addHealthRecord')
  return data
}

export function useHealthRecords() {
  return { healthRecords, weightRecords, allergies, timeline, loading, fetchHealthRecords, fetchAllergies, addAllergy, deleteAllergy, addHealthRecord, deleteHealthRecord }
}
