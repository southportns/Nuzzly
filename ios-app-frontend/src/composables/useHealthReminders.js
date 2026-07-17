import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

const reminders = ref([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchReminders(petId) {
  loading.value = true
  const uid = await getUid()
  let query = supabase
    .from('health_reminders')
    .select('*')
    .order('due_date', { ascending: true })
  if (uid) query = query.eq('profile_id', uid)
  if (petId) query = query.eq('pet_id', petId)

  const { data, error } = await query
  if (error) {
    console.warn('[useHealthReminders] fetch error:', error.message)
    reminders.value = []
  } else {
    reminders.value = data || []
  }
  loading.value = false
}

async function addReminder({ pet_id, reminder_type, title, description, due_date, repeat_interval, repeat_end_date }) {
  const uid = await getUid()
  if (!uid) throw new Error('未登录')

  const { data, error } = await supabase
    .from('health_reminders')
    .insert({
      pet_id,
      profile_id: uid,
      reminder_type,
      title,
      description: description || null,
      due_date,
      repeat_interval: repeat_interval || 'none',
      repeat_end_date: repeat_end_date || null,
    })
    .select()
    .single()
  if (error) throw error
  reminders.value = [...reminders.value, data]
  return data
}

async function completeReminder(id) {
  const { data: existing, error: fetchErr } = await supabase
    .from('health_reminders')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchErr || !existing) throw new Error('提醒不存在')

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('health_reminders')
    .update({ is_completed: true, completed_at: now })
    .eq('id', id)
  if (error) throw error

  // 本地更新
  reminders.value = reminders.value.filter(r => r.id !== id)

  // 循环提醒：创建下一期
  let nextReminder = null
  if (existing.repeat_interval && existing.repeat_interval !== 'none') {
    const nextDate = getNextDueDate(existing.due_date, existing.repeat_interval)
    if (!existing.repeat_end_date || nextDate <= existing.repeat_end_date) {
      const { data: created, error: createErr } = await supabase
        .from('health_reminders')
        .insert({
          pet_id: existing.pet_id,
          profile_id: existing.profile_id,
          reminder_type: existing.reminder_type,
          title: existing.title,
          description: existing.description,
          due_date: nextDate,
          repeat_interval: existing.repeat_interval,
          repeat_end_date: existing.repeat_end_date,
        })
        .select()
        .single()
      if (!createErr && created) {
        nextReminder = created
        reminders.value = [...reminders.value, created]
      }
    }
  }

  return nextReminder
}

async function deleteReminder(id) {
  const { error } = await supabase.from('health_reminders').delete().eq('id', id)
  if (error) throw error
  reminders.value = reminders.value.filter(r => r.id !== id)
}

function getNextDueDate(dateStr, interval) {
  const d = new Date(dateStr)
  switch (interval) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().slice(0, 10)
}

// 即将到期的提醒数（7天内）
const dueCount = computed(() => {
  const now = new Date()
  const weekLater = new Date(now)
  weekLater.setDate(weekLater.getDate() + 7)
  const today = now.toISOString().slice(0, 10)
  const limit = weekLater.toISOString().slice(0, 10)
  return reminders.value.filter(r => !r.is_completed && r.due_date >= today && r.due_date <= limit).length
})

export function useHealthReminders() {
  return { reminders, loading, dueCount, fetchReminders, addReminder, completeReminder, deleteReminder }
}
