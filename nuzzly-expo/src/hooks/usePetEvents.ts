import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface Petevent {
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

export function usePetevents() {
  const [petevents, setPetevents] = useState<Petevent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPetevents = useCallback(async (petId: string, limit = 50) => {
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
      console.warn('[usePetevents] fetch error:', error.message);
      setPetevents([]);
    } else {
      setPetevents((data || []) as Petevent[]);
    }
    setLoading(false);
  }, []);

  const createPetevent = useCallback(async (event: Partial<Petevent>) => {
    const uid = await getUid();
    if (!uid) throw new Error('Not Sign In');
    const finaleventTime = event.event_time || new Date().toISOString();
    await writeGateway('CREATE_PET_EVENT', {
      pet_id: event.pet_id,
      event_type: event.event_type,
      event_time: finaleventTime,
      notes: event.notes,
      severity: event.severity,
      product_id: event.product_id,
      symptom_code: event.symptom_code,
      metadata: event.metadata,
      source_type: event.source_type || 'manual',
    });
    const optimistic: Petevent = {
      pet_id: event.pet_id || '',
      profile_id: uid,
      event_type: event.event_type || 'other',
      event_time: finaleventTime,
      notes: event.notes,
      severity: event.severity,
      product_id: event.product_id,
      symptom_code: event.symptom_code,
      metadata: event.metadata,
      source_type: event.source_type || 'manual',
      created_at: new Date().toISOString(),
    };
    setPetevents((prev) => [optimistic, ...prev]);
    return optimistic;
  }, []);

  const geteventTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      symptom: 'Symptom',
      medication: 'Medication',
      vet_visit: 'Vet Visit',
      vaccination: 'Vaccine',
      weight_change: 'WeightChange',
      diet_change: 'Diet Change',
      behavior: 'Behavior',
      other: 'Other',
    };
    return labels[type] || type || 'event';
  }, []);

  const groupeventsByDate = useCallback((events: Petevent[]) => {
    const groups: Record<string, Petevent[]> = {};
    for (const event of events) {
      const date = event.event_time?.slice(0, 10) || 'unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    }
    return groups;
  }, []);

  return { petevents, loading, fetchPetevents, createPetevent, geteventTypeLabel, groupeventsByDate };
}
