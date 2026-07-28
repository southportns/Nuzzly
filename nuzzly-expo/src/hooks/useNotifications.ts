import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (limit = 30) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, type, action_url, is_read, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      const list = (data as Notification[]) || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch (e) {
      console.warn('[useNotifications]', e);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await writeGateway('MARK_NOTIFICATION_READ', { id });
    } catch (e) {
      console.error('[useNotifications.markAsRead]', e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await Promise.all(
      unreadIds.map((id) =>
        writeGateway('MARK_NOTIFICATION_READ', { id }).catch((e) =>
          console.error('[useNotifications.markAllRead]', e)
        )
      )
    );
  }, [notifications]);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllRead,
  };
}
