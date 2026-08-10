import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface DiseaseRecord {
 id?: string;
 pet_id: string;
 name: string;
 severity: 'mild' | 'Moderate' | 'severe' | 'critical';
 status: 'active' | 'under_treatment' | 'chronic' | 'resolved';
 diagnosed_on?: string;
 notes?: string | null;
 created_at?: string;
}

export function useDiseaseRecords() {
 const [diseaseRecords, setDiseaseRecords] = useState<DiseaseRecord[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchDiseaseRecords = useCallback(async (petId: string) => {
 setLoading(true);
 const { data, error } = await supabase.from('pet_disease_records').select('*').eq('pet_id', petId).order('diagnosed_on', { ascending: false });
 if (error) {
 console.warn('[useDiseaseRecords] fetch error:', error.message);
 setDiseaseRecords([]);
 } else {
 setDiseaseRecords((data || []) as DiseaseRecord[]);
 }
 setLoading(false);
 }, []);

 const createDiseaseRecord = useCallback(async (record: Partial<DiseaseRecord>) => {
 const finalDiagnosedOn = record.diagnosed_on || new Date().toISOString().split('T')[0];
 await writeGateway('CREATE_DISEASE_RECORD', {
 pet_id: record.pet_id,
 name: record.name,
 severity: record.severity,
 status: record.status,
 diagnosed_on: finalDiagnosedOn,
 notes: record.notes,
 });
 const optimistic: DiseaseRecord = {
 pet_id: record.pet_id || '',
 name: record.name || '',
 severity: (record.severity as any) || 'mild',
 status: (record.status as any) || 'active',
 diagnosed_on: finalDiagnosedOn,
 notes: record.notes,
 created_at: new Date().toISOString(),
 };
 setDiseaseRecords((prev) => [optimistic,...prev]);
 return optimistic;
 }, []);

 const getSeverityLabel = useCallback((severity: string) => {
 const labels: Record<string, string> = {
 mild: '',
 Moderate: 'Moderate',
 severe: 'Severity',
 critical: '',
 };
 return labels[severity] || severity || 'Unknown';
 }, []);

 const getStatusLabel = useCallback((status: string) => {
 const labels: Record<string, string> = {
 active: 'Ongoing',
 resolved: 'Recovered',
 chronic: 'slow',
 under_treatment: 'Under Treatment',
 };
 return labels[status] || status || 'Unknown';
 }, []);

 return { diseaseRecords, loading, fetchDiseaseRecords, createDiseaseRecord, getSeverityLabel, getStatusLabel };
}
