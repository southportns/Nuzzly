import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { mockDietLogs } from '../lib/mock'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

// dietLogs 列表整体替换，使用 shallowRef 减少深度响应式开销
const dietLogs = shallowRef([])
const loading = ref(false)

async function fetchDietLogs(petId) {
  loading.value = true
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id

  let query = supabase.from('diet_logs').select('*').order('created_at', { ascending: false }).limit(20)
  if (uid) query = query.eq('profile_id', uid)
  if (petId) query = query.eq('pet_id', petId)

  const { data, error } = await query
  if (error || !data?.length) {
    console.warn('[useDietLogs] 降级 mock', error?.message)
    dietLogs.value = mockDietLogs
  } else {
    dietLogs.value = data
  }
  loading.value = false
}

async function addDietLog(log) {
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'addDietLog')

  const { data, error } = await supabase
    .from('diet_logs')
    .insert({ ...log, profile_id: uid })
    .select()
    .single()
  if (error) throw normalizeError(error, 'addDietLog')
  dietLogs.value.unshift(data)
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
