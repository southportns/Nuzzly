import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface PetEvent {
  id?: string;
  pet_id: string;
  profile_id?: string;
  event_type: string;
  event_time?: string;
  notes?: string | null;
  severity?: number | null;
  product_id?: string | null;
  symptom_code?: string | null;
  metadata?: any;
  source_type?: string;
  created_at?: string;
}

async function getUid() {
  const { data: session } = await supabase.auth.getSession();
  return session?.session?.user?.id;
}

export function usePetEvents() {
  const [petEvents, setPetEvents] = useState<PetEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPetEvents = useCallback(async (petId: string, limit = 50) => {
    setLoading(true);
    const uid = await getUid();
    let query = supabase
      .from('pet_events')
      .select('*, products(name, brand)')
      .eq('pet_id', petId)
      .order('event_time', { ascending: false })
      .limit(limit);
    if (uid) query = query.eq('profile_id', uid);
    const { data, error } = await query;
    if (error) {
      console.warn('[usePetEvents] fetch error:', error.message);
      setPetEvents([]);
    } else {
      setPetEvents((data || []) as PetEvent[]);
    }
    setLoading(false);
  }, []);

  const createPetEvent = useCallback(async (event: Partial<PetEvent>) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');
    const finalEventTime = event.event_time || new Date().toISOString();
    await writeGateway('CREATE_PET_EVENT', {
      pet_id: event.pet_id,
      event_type: event.event_type,
      event_time: finalEventTime,
      notes: event.notes,
      severity: event.severity,
      product_id: event.product_id,
      symptom_code: event.symptom_code,
      metadata: event.metadata,
      source_type: event.source_type || 'manual',
    });
    const optimistic: PetEvent = {
      pet_id: event.pet_id || '',
      profile_id: uid,
      event_type: event.event_type || 'other',
      event_time: finalEventTime,
      notes: event.notes,
      severity: event.severity,
      product_id: event.product_id,
      symptom_code: event.symptom_code,
      metadata: event.metadata,
      source_type: event.source_type || 'manual',
      created_at: new Date().toISOString(),
    };
    setPetEvents((prev) => [optimistic, ...prev]);
    return optimistic;
  }, []);

  const getEventTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      symptom: '症状',
      medication: '用药',
      vet_visit: '就诊',
      vaccination: '疫苗',
      weight_change: '体重变化',
      diet_change: '饮食变更',
      behavior: '行为',
      other: '其他',
    };
    return labels[type] || type || '事件';
  }, []);

  const groupEventsByDate = useCallback((events: PetEvent[]) => {
    const groups: Record<string, PetEvent[]> = {};
    for (const event of events) {
      const date = event.event_time?.slice(0, 10) || 'unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    }
    return groups;
  }, []);

  return { petEvents, loading, fetchPetEvents, createPetEvent, getEventTypeLabel, groupEventsByDate };
}
