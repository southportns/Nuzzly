import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export interface DailySummary {
  id: string;
  pet_id?: string;
  date?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  summary_text?: string;
  metrics_snapshot?: any;
  anomaly_flags?: Record<string, any>;
  generated_at?: string;
  created_at?: string;
}

const RISK_LABELS: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险', critical: '严重' };
const RISK_COLORS: Record<string, string> = { low: '#3fb950', medium: '#d29922', high: '#f85149', critical: '#da3633' };
const RISK_ICONS: Record<string, string> = { low: '✓', medium: '⚠', high: '!', critical: '!!' };

const ANOMALY_LABELS: Record<string, string> = {
  appetite_anomaly: '食欲异常',
  weight_anomaly: '体重异常',
  activity_anomaly: '活动量异常',
  stool_anomaly: '排便异常',
  symptom_anomaly: '症状异常',
  medication_anomaly: '用药异常',
};

export function useDailySummary() {
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [latestSummary, setLatestSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDailySummaries = useCallback(async (petId: string, days = 7) => {
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_summary')
      .select('*')
      .eq('pet_id', petId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      console.warn('[useDailySummary] fetch error:', error.message);
      setDailySummaries([]);
      setLatestSummary(null);
    } else {
      const result = (data || []) as DailySummary[];
      setDailySummaries(result);
      setLatestSummary(result[0] || null);
    }
    setLoading(false);
  }, []);

  const generateDailySummary = useCallback(async (petId: string, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const summaryData = await api(`/api/analytics/${petId}/summary?date=${encodeURIComponent(targetDate)}`, {
      method: 'GET',
    });

    const existing = dailySummaries.find((s) => s.date === targetDate);
    if (existing?.id) {
      const { data, error } = await supabase
        .from('daily_summary')
        .update({
          risk_level: summaryData.risk_level,
          summary_text: summaryData.summary_text,
          metrics_snapshot: summaryData.metrics_snapshot,
          anomaly_flags: summaryData.anomaly_flags,
          generated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      setDailySummaries((prev) => prev.map((s) => (s.id === existing.id ? data : s)));
      if (latestSummary?.id === existing.id) setLatestSummary(data);
      return data;
    } else {
      const { data, error } = await supabase
        .from('daily_summary')
        .insert({
          pet_id: petId,
          date: targetDate,
          risk_level: summaryData.risk_level,
          summary_text: summaryData.summary_text,
          metrics_snapshot: summaryData.metrics_snapshot,
          anomaly_flags: summaryData.anomaly_flags,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setDailySummaries((prev) => [data, ...prev]);
      if (!latestSummary || new Date(data.date) > new Date(latestSummary.date || 0)) {
        setLatestSummary(data);
      }
      return data;
    }
  }, [dailySummaries, latestSummary]);

  const deleteDailySummary = useCallback(async (id: string) => {
    const { error } = await supabase.from('daily_summary').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setDailySummaries((prev) => prev.filter((s) => s.id !== id));
    if (latestSummary?.id === id) setLatestSummary(dailySummaries[0] || null);
  }, [dailySummaries, latestSummary]);

  const getRiskLevelLabel = useCallback((level?: string) => RISK_LABELS[level || ''] || '未知', []);
  const getRiskLevelColor = useCallback((level?: string) => RISK_COLORS[level || ''] || '#3fb950', []);
  const getRiskLevelIcon = useCallback((level?: string) => RISK_ICONS[level || ''] || '?', []);
  const getAnomalyLabel = useCallback((key?: string) => ANOMALY_LABELS[key || ''] || key || '', []);

  const calculateHealthTrend = useCallback((summaries?: DailySummary[]) => {
    if (!summaries || summaries.length < 2) return 'stable';
    const riskScores = summaries
      .map((s) => ({ low: 1, medium: 2, high: 3, critical: 4 }[s.risk_level || 'low'] || 1))
      .reverse();
    const recent = riskScores.slice(-3);
    const older = riskScores.slice(0, -3);
    if (older.length === 0) return 'stable';
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (recentAvg > olderAvg * 1.2) return 'worsening';
    if (recentAvg < olderAvg * 0.8) return 'improving';
    return 'stable';
  }, []);

  return {
    dailySummaries,
    latestSummary,
    loading,
    fetchDailySummaries,
    generateDailySummary,
    deleteDailySummary,
    getRiskLevelLabel,
    getRiskLevelColor,
    getRiskLevelIcon,
    getAnomalyLabel,
    calculateHealthTrend,
  };
}
