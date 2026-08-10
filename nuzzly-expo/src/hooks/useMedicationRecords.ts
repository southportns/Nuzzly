import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface MedicationRecord {
  id?: string;
  pet_id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  started_on?: string;
  ended_on?: string;
  is_ongoing?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_times_daily: 'Three times daily',
  weekly: 'Once weekly',
  as_needed: 'As needed',
  other: 'Other',
};

export function useMedicationRecords() {
  const [medicationRecords, setMedicationRecords] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMedicationRecords = useCallback(async (petId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pet_medication_records')
      .select('*')
      .eq('pet_id', petId)
      .order('started_on', { ascending: false });

    if (error) {
      console.warn('[useMedicationRecords] fetch error:', error.message);
      setMedicationRecords([]);
    } else {
      setMedicationRecords((data || []) as MedicationRecord[]);
    }
    setLoading(false);
  }, []);

  const createMedicationRecord = useCallback(async (record: Partial<MedicationRecord>) => {
    const finalStartedOn = record.started_on || new Date().toISOString().split('T')[0];
    const payload = {
      pet_id: record.pet_id,
      name: record.name,
      dosage: record.dosage,
      frequency: record.frequency,
      started_on: finalStartedOn,
      ended_on: record.ended_on,
      is_ongoing: record.is_ongoing ?? true,
      notes: record.notes,
    };
    await writeGateway('CREATE_MEDICATION_RECORD', payload);
    const optimistic: MedicationRecord = {
      ...payload as MedicationRecord,
      created_at: new Date().toISOString(),
    };
    setMedicationRecords((prev) => [optimistic, ...prev]);
    return optimistic;
  }, []);

  const updateMedicationRecord = useCallback(async (id: string, updates: Partial<MedicationRecord>) => {
    await writeGateway('UPDATE_MEDICATION_RECORD', { id, ...updates });
    setMedicationRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r))
    );
    return medicationRecords.find((r) => r.id === id) || null;
  }, [medicationRecords]);

  const deleteMedicationRecord = useCallback(async (id: string) => {
    await writeGateway('DELETE_MEDICATION_RECORD', { id });
    setMedicationRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const stopMedication = useCallback(async (id: string, endedOn?: string) => {
    return updateMedicationRecord(id, {
      is_ongoing: false,
      ended_on: endedOn || new Date().toISOString().split('T')[0],
    });
  }, [updateMedicationRecord]);

  const getFrequencyLabel = useCallback((frequency?: string) => {
    return FREQUENCY_LABELS[frequency || ''] || frequency || 'Unknown';
  }, []);

  const calculateDuration = useCallback((record: MedicationRecord) => {
    const start = new Date(record.started_on || Date.now());
    const end = record.ended_on ? new Date(record.ended_on) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  return {
    medicationRecords,
    loading,
    fetchMedicationRecords,
    createMedicationRecord,
    updateMedicationRecord,
    deleteMedicationRecord,
    stopMedication,
    getFrequencyLabel,
    calculateDuration,
  };
}
