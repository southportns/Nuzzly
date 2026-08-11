import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface Allergy {
  id: string;
  pet_id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  confirmed: boolean;
}

async function getUid() {
  const { data: session } = await supabase.auth.getSession();
  return session?.session?.user?.id;
}

export function useAllergies() {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllergies = useCallback(async (petId: string) => {
    setLoading(true);
    const { data, error } = await supabase.from('pet_allergies').select('*').eq('pet_id', petId).order('created_at', { ascending: false });
    if (error) {
      console.warn('[useAllergies] fetch error:', error.message);
      setAllergies([]);
    } else {
      setAllergies((data || []) as Allergy[]);
    }
    setLoading(false);
  }, []);

  const addAllergy = useCallback(async ({ pet_id, allergen, severity = 'mild', confirmed = false }: Partial<Allergy>) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');
    const { data, error } = await writeGateway('CREATE_PET_ALLERGY', { pet_id, allergen, severity, confirmed });
    if (error) throw new Error(error);
    setAllergies((prev) => [...prev, data as Allergy]);
    return data as Allergy;
  }, []);

  const deleteAllergy = useCallback(async (id: string) => {
    const existing = allergies.find((a) => a.id === id);
    const pet_id = existing?.pet_id;
    const { error } = await writeGateway('DELETE_PET_ALLERGY', { id, pet_id });
    if (error) throw new Error(error);
    setAllergies((prev) => prev.filter((a) => a.id !== id));
  }, [allergies]);

  const getSeverityLabel = useCallback((severity: string) => {
    const labels: Record<string, string> = { mild: '轻微', moderate: '中度', severe: '严重' };
    return labels[severity] || '未知';
  }, []);

  return { allergies, loading, fetchAllergies, addAllergy, deleteAllergy, getSeverityLabel };
}
