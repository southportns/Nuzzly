import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface HealthReminder {
  id: string;
  pet_id: string;
  profile_id?: string;
  reminder_type: string;
  title: string;
  description?: string | null;
  due_date: string;
  repeat_interval: string;
  repeat_end_date?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
}

async function getUid() {
  const { data: session } = await supabase.auth.getSession();
  return session?.session?.user?.id;
}

function getNextDueDate(dateStr: string, interval: string) {
  const d = new Date(dateStr);
  switch (interval) {
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

function isDueSoon(reminder: HealthReminder) {
  if (reminder.is_completed) return false;
  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);
  const limit = weekLater.toISOString().slice(0, 10);
  return reminder.due_date >= today && reminder.due_date <= limit;
}

export function useHealthReminders() {
  const [reminders, setReminders] = useState<HealthReminder[]>([]);
  const [loading, setLoading] = useState(false);

  const dueCount = useMemo(() => reminders.filter(isDueSoon).length, [reminders]);

  const fetchReminders = useCallback(async (petId?: string) => {
    setLoading(true);
    const uid = await getUid();
    let query = supabase.from('health_reminders').select('*').order('due_date', { ascending: true });
    if (uid) query = query.eq('profile_id', uid);
    if (petId) query = query.eq('pet_id', petId);
    const { data, error } = await query;
    if (error) {
      console.warn('[useHealthReminders] fetch error:', error.message);
      setReminders([]);
    } else {
      setReminders((data || []) as HealthReminder[]);
    }
    setLoading(false);
  }, []);

  const addReminder = useCallback(async (payload: Partial<HealthReminder>) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');
    const result = await writeGateway('CREATE_HEALTH_REMINDER', {
      pet_id: payload.pet_id,
      reminder_type: payload.reminder_type,
      title: payload.title,
      description: payload.description || null,
      due_date: payload.due_date,
      repeat_interval: payload.repeat_interval || 'none',
      repeat_end_date: payload.repeat_end_date || null,
    });
    const data =
      (result?.data as HealthReminder | null) ||
      ({
        pet_id: payload.pet_id,
        profile_id: uid,
        reminder_type: payload.reminder_type,
        title: payload.title,
        description: payload.description || null,
        due_date: payload.due_date,
        repeat_interval: payload.repeat_interval || 'none',
        repeat_end_date: payload.repeat_end_date || null,
        created_at: new Date().toISOString(),
      } as unknown as HealthReminder);
    setReminders((prev) => [...prev, data]);
    return data;
  }, []);

  const completeReminder = useCallback(async (id: string) => {
    const { data: existing, error: fetchErr } = await supabase
      .from('health_reminders')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('提醒不存在');
    const now = new Date().toISOString();
    const { error } = await supabase.from('health_reminders').update({ is_completed: true, completed_at: now }).eq('id', id);
    if (error) throw error;
    setReminders((prev) => prev.filter((r) => r.id !== id));

    if (existing.repeat_interval && existing.repeat_interval !== 'none') {
      const nextDate = getNextDueDate(existing.due_date, existing.repeat_interval);
      if (!existing.repeat_end_date || nextDate <= existing.repeat_end_date) {
        try {
          const result = await writeGateway('CREATE_HEALTH_REMINDER', {
            pet_id: existing.pet_id,
            reminder_type: existing.reminder_type,
            title: existing.title,
            description: existing.description,
            due_date: nextDate,
            repeat_interval: existing.repeat_interval,
            repeat_end_date: existing.repeat_end_date,
          });
          const created = result?.data as HealthReminder | null;
          if (created) setReminders((prev) => [...prev, created]);
        } catch (e: any) {
          console.error('[useHealthReminders.completeReminder] create next:', e.message);
        }
      }
    }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    const { error } = await supabase.from('health_reminders').delete().eq('id', id);
    if (error) throw error;
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reminders, loading, dueCount, fetchReminders, addReminder, completeReminder, deleteReminder };
}
