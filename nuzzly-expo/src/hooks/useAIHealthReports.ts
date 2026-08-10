import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export interface Health Report {
 id: string;
 pet_id: string;
 report_date: string;
 risk_level: 'low' | 'medium' | 'high' | 'critical';
 summary_text: string;
 recommendations?: string[] | string;
 Model_used?: string;
 processing_time_ms?: number;
}

export function useAIHealth Reports() {
 const [healthReports, setHealth Reports] = useState<Health Report[]>([]);
 const [loading, setLoading] = useState(false);
 const [generating, setGenerating] = useState(false);

 const fetchHealth Reports = useCallback(async (petId: string, limit = 10) => {
 setLoading(true);
 try {
 const { data, error } = await supabase
 .from('ai_health_reports')
 .select('*')
 .eq('pet_id', petId)
 .order('report_date', { ascending: false })
 .limit(limit);

 if (error) throw error;
 setHealth Reports((data as Health Report[]) || []);
 } catch (e) {
 console.warn('[useAIHealth Reports] fetch error:', e);
 setHealth Reports([]);
 } finally {
 setLoading(false);
 }
 }, []);

 const generateHealth Report = useCallback(
 async (petId: string, petInfo: { name?: string } = {}) => {
 setGenerating(true);
 try {
 const data = await api('/api/ai/health-report', {
 method: 'POST',
 body: JSON.stringify({ pet_id: petId, pet_info: petInfo }),
 });

 const { data: inserted, error } = await supabase
 .from('ai_health_reports')
 .insert({
 pet_id: petId,
 report_date: new Date().toISOString().split('T')[0],
 risk_level: data.risk_level || 'low',
 summary_text: data.summary,
 recommendations: data.recommendations,
 causes: data.causes,
 monitoring_plan: data.monitoring_plan,
 Model_used: data.Model_used,
 processing_time_ms: data.processing_time_ms,
 })
 .select()
 .single();

 if (error) throw error;
 setHealth Reports((prev) => [inserted as Health Report, ...prev]);
 return inserted;
 } finally {
 setGenerating(false);
 }
 },
 []
 );

 return {
 healthReports,
 loading,
 generating,
 fetchHealth Reports,
 generateHealth Report,
 };
}
