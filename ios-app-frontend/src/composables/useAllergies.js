import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'
import { writeGateway } from '../lib/gateway'

const allergies = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchAllergies(petId) {
  loading.value = true
  const { data, error } = await supabase
    .from('pet_allergies')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[useAllergies] fetch error:', error.message)
    allergies.value = []
  } else {
    allergies.value = data || []
  }
  loading.value = false
}

async function addAllergy({ pet_id, allergen, severity = 'mild', confirmed = false }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'addAllergy')

  const { data, error } = await writeGateway('CREATE_PET_ALLERGY', { pet_id, allergen, severity, confirmed })

  if (error) throw normalizeError({ message: error }, 'addAllergy')
  allergies.value = [...allergies.value, data]
  return data
}

async function updateAllergy(id, updates) {
  const { data, error } = await supabase
    .from('pet_allergies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw normalizeError(error, 'updateAllergy')
  allergies.value = allergies.value.map(a => a.id === id ? data : a)
  return data
}

async function deleteAllergy(id, isConfirmed = false) {
  if (isConfirmed) {
    // 已确认的过敏原需要二次确认（由UI层处理）
  }

  // DELETE_PET_ALLERGY handler 需要 pet_id，从本地 state 解析
  const existing = allergies.value.find(a => a.id === id)
  const pet_id = existing?.pet_id
  const { error } = await writeGateway('DELETE_PET_ALLERGY', { id, pet_id })
  if (error) throw normalizeError({ message: error }, 'deleteAllergy')
  allergies.value = allergies.value.filter(a => a.id !== id)
}

function getSeverityLabel(severity) {
  const labels = { mild: '轻微', moderate: '中度', severe: '严重' }
  return labels[severity] || '未知'
}

function getSeverityColor(severity) {
  const colors = { mild: '#A8C5A0', moderate: '#E8A87C', severe: '#E85D4A' }
  return colors[severity] || '#A8C5A0'
}

export function useAllergies() {
  return {
    allergies,
    loading,
    fetchAllergies,
    addAllergy,
    updateAllergy,
    deleteAllergy,
    getSeverityLabel,
    getSeverityColor
  }
}
