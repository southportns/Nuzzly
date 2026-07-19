import { ref, readonly } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'

const notifications = ref([])
const loading = ref(false)
const unreadCount = ref(0)

export function useNotifications() {
  async function fetchNotifications(limit = 30) {
    loading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { notifications.value = []; return }

      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, type, action_url, is_read, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      notifications.value = data || []
      unreadCount.value = notifications.value.filter(n => !n.is_read).length
    } catch (e) {
      console.warn('[useNotifications]', e.message)
      notifications.value = []
      unreadCount.value = 0
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id) {
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1 && !notifications.value[idx].is_read) {
      notifications.value[idx] = { ...notifications.value[idx], is_read: true }
      unreadCount.value = notifications.value.filter(n => !n.is_read).length
      try {
        await writeGateway('MARK_NOTIFICATION_READ', { id })
      } catch (e) {
        console.error('[useNotifications.markAsRead]', e.message)
      }
    }
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const unreadIds = notifications.value.filter(n => !n.is_read).map(n => n.id)
    notifications.value = notifications.value.map(n => ({ ...n, is_read: true }))
    unreadCount.value = 0
    for (const nid of unreadIds) {
      try {
        await writeGateway('MARK_NOTIFICATION_READ', { id: nid })
      } catch (e) {
        console.error('[useNotifications.markAllRead]', e.message)
      }
    }
  }

  return {
    notifications: readonly(notifications),
    loading: readonly(loading),
    unreadCount: readonly(unreadCount),
    fetchNotifications,
    markAsRead,
    markAllRead
  }
}
