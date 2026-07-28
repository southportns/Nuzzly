import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface HealthRecord {
  id: string;
  pet_id: string;
  profile_id?: string;
  record_type: string;
  record_time?: string;
  weight_kg?: number | null;
  symptom_code?: string | null;
  severity?: string | null;
  diagnosis?: string | null;
  medication_name?: string | null;
  notes?: string | null;
  metadata?: any;
}

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

export function useHealthRecords() {
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [weightRecords, setWeightRecords] = useState<HealthRecord[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [timeline, setTimeline] = useState<{ date: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHealthRecords = useCallback(async (petId?: string) => {
    setLoading(true);
    const uid = await getUid();
    let query = supabase
      .from('health_records')
      .select('id, record_type, record_time, weight_kg, symptom_code, severity, diagnosis, medication_name, notes, metadata')
      .order('record_time', { ascending: false })
      .limit(20);
    if (uid) query = query.eq('profile_id', uid);
    if (petId) query = query.eq('pet_id', petId);
    const { data, error } = await query;
    if (error) {
      console.warn('[useHealthRecords] fetch error:', error.message);
      setHealthRecords([]);
      setWeightRecords([]);
      setTimeline([]);
    } else {
      const records = (data || []) as HealthRecord[];
      setHealthRecords(records.filter((r) => r.record_type !== 'weight'));
      setWeightRecords(records.filter((r) => r.record_type === 'weight' && r.weight_kg));
      setTimeline(
        records
          .map((r) => ({ date: r.record_time?.slice(0, 10) || '', text: r.notes || r.diagnosis || r.medication_name || '' }))
          .filter((r) => r.text)
      );
    }
    setLoading(false);
  }, []);

  const fetchAllergies = useCallback(async (petId: string) => {
    const { data, error } = await supabase.from('pet_allergies').select('*').eq('pet_id', petId);
    if (error) {
      console.warn('[useHealthRecords] fetchAllergies error:', error.message);
      setAllergies([]);
    } else {
      setAllergies((data || []) as Allergy[]);
    }
  }, []);

  const addHealthRecord = useCallback(async (record: Partial<HealthRecord>) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');
    const { data, error } = await writeGateway('CREATE_HEALTH_RECORD', { ...record });
    if (error) throw new Error(error);
    return data as HealthRecord;
  }, []);

  const addAllergy = useCallback(async ({ pet_id, allergen, severity = 'mild', confirmed = false }: Partial<Allergy>) => {
    const { data, error } = await supabase.from('pet_allergies').insert({ pet_id, allergen, severity, confirmed }).select().single();
    if (error) throw error;
    setAllergies((prev) => [...prev, data as Allergy]);
    return data as Allergy;
  }, []);

  const deleteAllergy = useCallback(async (id: string) => {
    const { error } = await supabase.from('pet_allergies').delete().eq('id', id);
    if (error) throw error;
    setAllergies((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const deleteHealthRecord = useCallback(async (id: string) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');
    const { error } = await supabase.from('health_records').delete().eq('id', id).eq('profile_id', uid);
    if (error) throw error;
    setHealthRecords((prev) => prev.filter((r) => r.id !== id));
    setWeightRecords((prev) => prev.filter((r) => r.id !== id));
    setTimeline((prev) => prev.filter((r) => r.date !== id));
  }, []);

  return {
    healthRecords,
    weightRecords,
    allergies,
    timeline,
    loading,
    fetchHealthRecords,
    fetchAllergies,
    addHealthRecord,
    addAllergy,
    deleteAllergy,
    deleteHealthRecord,
  };
}
