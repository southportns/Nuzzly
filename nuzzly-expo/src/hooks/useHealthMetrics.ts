import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface HealthMetric {
  id?: string;
  pet_id?: string;
  date?: string;
  appetite_score?: number;
  activity_score?: number;
  stool_score?: number;
  symptom_severity_score?: number;
  weight_delta?: number;
  calculation_method?: string;
  created_at?: string;
}

export function useHealthMetrics() {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<HealthMetric | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealthMetrics = useCallback(async (petId: string, days = 30) => {
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('pet_id', petId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      console.warn('[useHealthMetrics] fetch error:', error.message);
      setHealthMetrics([]);
      setLatestMetrics(null);
    } else {
      const result = (data || []) as HealthMetric[];
      setHealthMetrics(result);
      setLatestMetrics(result[0] || null);
    }
    setLoading(false);
  }, []);

  const addHealthMetric = useCallback(async (metric: Partial<HealthMetric>) => {
    const finalDate = metric.date || new Date().toISOString().split('T')[0];
    const payload = {
      pet_id: metric.pet_id,
      date: finalDate,
      appetite_score: metric.appetite_score,
      activity_score: metric.activity_score,
      stool_score: metric.stool_score,
      symptom_severity_score: metric.symptom_severity_score,
      weight_delta: metric.weight_delta,
      calculation_method: 'manual',
    };
    const result = await writeGateway('CREATE_HEALTH_METRIC', payload);
    const data = result?.data || { ...payload, created_at: new Date().toISOString() };
    setHealthMetrics((prev) => [data, ...prev]);
    setLatestMetrics(data);
    return data;
  }, []);

  const updateHealthMetric = useCallback(async (id: string, updates: Partial<HealthMetric>) => {
    const { data, error } = await supabase
      .from('health_metrics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    setHealthMetrics((prev) => prev.map((m) => (m.id === id ? data : m)));
    if (latestMetrics?.id === id) setLatestMetrics(data);
    return data;
  }, [latestMetrics]);

  const getMetricTrend = useCallback((metricName: keyof HealthMetric, days = 7) => {
    const recent = healthMetrics.slice(0, days);
    if (recent.length < 2) return 'stable';
    const values = recent.map((m) => (m as any)[metricName]).filter((v) => v != null);
    if (values.length < 2) return 'stable';

    const mid = Math.floor(values.length / 2);
    const avgRecent = values.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid);
    const avgOlder = values.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, values.length - mid);

    if (avgRecent > avgOlder * 1.1) return 'improving';
    if (avgRecent < avgOlder * 0.9) return 'declining';
    return 'stable';
  }, [healthMetrics]);

  const calculateOverallScore = useCallback((metrics?: HealthMetric | null) => {
    if (!metrics) return null;
    const scores = [
      metrics.appetite_score,
      metrics.activity_score,
      metrics.stool_score,
      metrics.symptom_severity_score ? 10 - metrics.symptom_severity_score : null,
    ].filter((s) => s != null) as number[];
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, []);

  return {
    healthMetrics,
    latestMetrics,
    loading,
    fetchHealthMetrics,
    addHealthMetric,
    updateHealthMetric,
    getMetricTrend,
    calculateOverallScore,
  };
}
