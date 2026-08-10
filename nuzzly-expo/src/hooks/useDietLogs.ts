import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface DietLog {
  id: string;
  pet_id: string;
  profile_id?: string;
  food_name: string;
  food_type: string;
  notes?: string | null;
  logged_date?: string;
  created_at?: string;
}

async function getUid() {
  const { data: session } = await supabase.auth.getSession();
  return session?.session?.user?.id;
}

export function useDietLogs() {
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDietLogs = useCallback(async (petId?: string) => {
    setLoading(true);
    const uid = await getUid();
    let query = supabase.from('diet_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (uid) query = query.eq('profile_id', uid);
    if (petId) query = query.eq('pet_id', petId);
    const { data, error } = await query;
    if (error) {
      console.warn('[useDietLogs] fetch error:', error.message);
      setDietLogs([]);
    } else {
      setDietLogs((data || []) as DietLog[]);
    }
    setLoading(false);
  }, []);

  const addDietLog = useCallback(async (log: Partial<DietLog>) => {
    const uid = await getUid();
    if (!uid) throw new Error('Not Sign In');
    const { data, error } = await writeGateway('CREATE_DIET_LOG', { ...log });
    if (error) throw new Error(error);
    setDietLogs((prev) => [data as DietLog, ...prev]);
    return data as DietLog;
  }, []);

  const deleteDietLog = useCallback(async (id: string) => {
    const uid = await getUid();
    if (!uid) throw new Error('Not Sign In');
    const { error } = await supabase.from('diet_logs').delete().eq('id', id).eq('profile_id', uid);
    if (error) throw error;
    setDietLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { dietLogs, loading, fetchDietLogs, addDietLog, deleteDietLog };
}
