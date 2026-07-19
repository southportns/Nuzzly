import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'
import { writeGateway } from '../lib/gateway'

const dietLogs = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchDietLogs(petId) {
  loading.value = true
  const uid = await getUid()

  let query = supabase.from('diet_logs').select('*').order('created_at', { ascending: false }).limit(20)
  if (uid) query = query.eq('profile_id', uid)
  if (petId) query = query.eq('pet_id', petId)

  const { data, error } = await query
  if (error) {
    console.warn('[useDietLogs] fetch error:', error.message)
    dietLogs.value = []
  } else {
    dietLogs.value = data || []
  }
  loading.value = false
}

async function addDietLog(log) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'addDietLog')

  const { data, error } = await writeGateway('CREATE_DIET_LOG', { ...log })
  if (error) throw normalizeError({ message: error }, 'addDietLog')
  dietLogs.value = [data, ...dietLogs.value]
  return data
}

async function deleteDietLog(id) {
  const { error } = await supabase.from('diet_logs').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deleteDietLog')
  dietLogs.value = dietLogs.value.filter(l => l.id !== id)
}

export function useDietLogs() {
  return { dietLogs, loading, fetchDietLogs, addDietLog, deleteDietLog }
}
