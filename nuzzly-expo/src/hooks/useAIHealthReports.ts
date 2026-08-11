import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export interface HealthReport {
  id: string;
  pet_id: string;
  report_date: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  summary_text: string;
  recommendations?: string[] | string;
  model_used?: string;
  processing_time_ms?: number;
}

export function useAIHealthReports() {
  const [healthReports, setHealthReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchHealthReports = useCallback(async (petId: string, limit = 10) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_health_reports')
        .select('*')
        .eq('pet_id', petId)
        .order('report_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setHealthReports((data as HealthReport[]) || []);
    } catch (e) {
      console.warn('[useAIHealthReports] fetch error:', e);
      setHealthReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateHealthReport = useCallback(
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
            model_used: data.model_used,
            processing_time_ms: data.processing_time_ms,
          })
          .select()
          .single();

        if (error) throw error;
        setHealthReports((prev) => [inserted as HealthReport, ...prev]);
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
    fetchHealthReports,
    generateHealthReport,
  };
}
