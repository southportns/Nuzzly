import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface Product {
  name?: string;
  brand?: string;
  image_url?: string;
}

export interface Pet {
  name?: string;
  breed?: string;
  species?: string;
}

export interface ProductReview {
  id?: string;
  product_id?: string;
  pet_id?: string;
  products?: Product;
  pets?: Pet;
}

export interface FollowupSchedule {
  id: string;
  review_id?: string;
  profile_id?: string;
  followup_day: number;
  due_date?: string;
  status: 'pending' | 'reminded' | 'completed' | 'overdue';
  reminder_sent_at?: string;
  completed_at?: string;
  created_at?: string;
  product_reviews?: ProductReview;
}

export const FOLLOWUP_DAYS = [7, 14, 30, 60, 90, 180];

export const STATUS_LABEL: Record<string, string> = {
  pending: '待填写',
  reminded: '待填写',
  completed: '已完成',
  overdue: '已过期',
};

export function useFollowups() {
  const [schedules, setSchedules] = useState<FollowupSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getUid = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id;
  }, []);

  const fetchSchedules = useCallback(async (status?: string, options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    const uid = await getUid();
    if (!uid) {
      if (!silent) setSchedules([]);
      return [];
    }

    if (!silent) setLoading(true);
    let query = supabase
      .from('review_followup_schedules')
      .select(`
        id, review_id, profile_id, followup_day, due_date, status,
        reminder_sent_at, completed_at, created_at,
        product_reviews!inner(
          id, product_id, pet_id,
          products!inner(name, brand, image_url),
          pets!inner(name, breed, species)
        )
      `)
      .eq('profile_id', uid)
      .order('due_date', { ascending: true });

    if (status === 'pending') {
      query = query.in('status', ['pending', 'reminded']);
    } else if (status === 'completed') {
      query = query.eq('status', 'completed');
    } else if (status === 'overdue') {
      query = query.eq('status', 'overdue');
    }

    const { data, error } = await query;
    if (!silent) setLoading(false);
    if (error) {
      console.warn('[useFollowups.fetchSchedules]', error.message);
      if (!silent) setSchedules([]);
      return [];
    }
    const result = (data || []) as FollowupSchedule[];
    if (!silent) setSchedules(result);
    return result;
  }, [getUid]);

  const fetchSchedule = useCallback(async (scheduleId: string) => {
    const { data, error } = await supabase
      .from('review_followup_schedules')
      .select(`
        id, review_id, profile_id, followup_day, due_date, status,
        completed_at, created_at,
        product_reviews!inner(
          id, product_id, pet_id,
          products!inner(name, brand, image_url),
          pets!inner(name, breed, species, stomach_health)
        )
      `)
      .eq('id', scheduleId)
      .maybeSingle();

    if (error) {
      console.warn('[useFollowups.fetchSchedule]', error.message);
      return null;
    }
    return data as FollowupSchedule | null;
  }, []);

  const submitFollowupEntry = useCallback(async (payload: {
    schedule_id: string;
    stool_status?: string;
    coat_status?: string;
    energy_status?: string;
    appetite_status?: string;
    continued_usage?: boolean | null;
    repurchase_intent?: string;
    overall_satisfaction?: number | null;
    health_notes?: string;
  }) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');

    setSubmitting(true);
    const entryPayload = {
      schedule_id: payload.schedule_id,
      stool_status: payload.stool_status || null,
      coat_status: payload.coat_status || null,
      energy_status: payload.energy_status || null,
      appetite_status: payload.appetite_status || null,
      continued_usage: payload.continued_usage ?? null,
      repurchase_intent: payload.repurchase_intent || null,
      overall_satisfaction: payload.overall_satisfaction ?? null,
      health_notes: payload.health_notes || null,
    };

    try {
      await writeGateway('CREATE_FOLLOWUP_ENTRY', entryPayload);
    } catch (e: any) {
      setSubmitting(false);
      throw new Error(e.message || '提交失败');
    }

    try {
      await writeGateway('UPDATE_FOLLOWUP_SCHEDULE', {
        id: payload.schedule_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('[useFollowups] 标记完成失败', e.message);
    }

    setSubmitting(false);
    return { ...entryPayload, profile_id: uid, created_at: new Date().toISOString() };
  }, [getUid]);

  return {
    schedules,
    loading,
    submitting,
    FOLLOWUP_DAYS,
    STATUS_LABEL,
    fetchSchedules,
    fetchSchedule,
    submitFollowupEntry,
  };
}
