import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export interface DataTrustScore {
  id: string;
  entity_type?: string;
  entity_id?: string;
  trust_score?: number;
  confidence_score?: number;
  factor_scores?: Record<string, number>;
  has_photos?: boolean;
  has_voucher?: boolean;
  has_long_term_data?: boolean;
  is_continuous?: boolean;
  is_anomaly?: boolean;
  suspicious_level?: number;
  calculated_at?: string;
}

interface TrustLevel {
  label: string;
  color: string;
  icon: string;
}

export function useDataTrustScores() {
  const [trustScores, setTrustScores] = useState<DataTrustScore[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrustScores = useCallback(async (entityType?: string, entityId?: string) => {
    setLoading(true);
    let query = supabase
      .from('data_trust_scores')
      .select('*')
      .order('calculated_at', { ascending: false });

    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);

    const { data, error } = await query;
    if (error) {
      console.warn('[useDataTrustScores] fetch error:', error.message);
      setTrustScores([]);
    } else {
      setTrustScores((data || []) as DataTrustScore[]);
    }
    setLoading(false);
  }, []);

  const fetchTrustScoreByEntity = useCallback(async (entityType: string, entityId: string) => {
    const { data, error } = await supabase
      .from('data_trust_scores')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[useDataTrustScores] fetchByEntity error:', error.message);
      return null;
    }
    return data as DataTrustScore | null;
  }, []);

  const calculateTrustScore = useCallback(async (entityType: string, entityId: string, metadata?: any) => {
    const result = await api('/api/analytics/trust-score', {
      method: 'POST',
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, metadata }),
    });

    const { data, error } = await supabase
      .from('data_trust_scores')
      .upsert({
        entity_type: entityType,
        entity_id: entityId,
        trust_score: result.trust_score,
        confidence_score: result.confidence_score,
        factor_scores: result.factor_scores,
        has_photos: result.has_photos,
        has_voucher: result.has_voucher,
        has_long_term_data: result.has_long_term_data,
        is_continuous: result.is_continuous,
        is_anomaly: result.is_anomaly,
        suspicious_level: result.suspicious_level,
        calculated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const score = data as DataTrustScore;
    setTrustScores((prev) => {
      const index = prev.findIndex((s) => s.entity_type === entityType && s.entity_id === entityId);
      if (index >= 0) {
        const next = [...prev];
        next[index] = score;
        return next;
      }
      return [score, ...prev];
    });
    return score;
  }, []);

  const getTrustLevel = useCallback((score?: number): TrustLevel => {
    if (score == null) return { label: '未知', color: '#8b949e', icon: '?' };
    if (score >= 0.9) return { label: '极高信任', color: '#3fb950', icon: '🛡️' };
    if (score >= 0.7) return { label: '高信任', color: '#58a6ff', icon: '✓' };
    if (score >= 0.5) return { label: '中等信任', color: '#d29922', icon: '⚠' };
    if (score >= 0.3) return { label: '低信任', color: '#f85149', icon: '!' };
    return { label: '极低信任', color: '#da3633', icon: '🚨' };
  }, []);

  const getSuspiciousLevelLabel = useCallback((level?: number) => {
    if (level == null) return '未知';
    if (level >= 0.8) return '高度可疑';
    if (level >= 0.5) return '中度可疑';
    if (level >= 0.2) return '轻微可疑';
    return '正常';
  }, []);

  const getSuspiciousLevelColor = useCallback((level?: number) => {
    if (level == null) return '#8b949e';
    if (level >= 0.8) return '#da3633';
    if (level >= 0.5) return '#f85149';
    if (level >= 0.2) return '#d29922';
    return '#3fb950';
  }, []);

  const getFactorLabel = useCallback((factor?: string) => {
    const labels: Record<string, string> = {
      has_photos: '有照片凭证',
      has_voucher: '有购买凭证',
      has_long_term_data: '有长期数据',
      is_continuous: '数据连续',
      is_anomaly: '异常数据',
    };
    return labels[factor || ''] || factor || '未知因素';
  }, []);

  const getFactorColor = useCallback((factor: string, value: boolean) => {
    const positiveFactors = ['has_photos', 'has_voucher', 'has_long_term_data', 'is_continuous'];
    if (positiveFactors.includes(factor)) return value ? '#3fb950' : '#8b949e';
    return value ? '#f85149' : '#3fb950';
  }, []);

  return {
    trustScores,
    loading,
    fetchTrustScores,
    fetchTrustScoreByEntity,
    calculateTrustScore,
    getTrustLevel,
    getSuspiciousLevelLabel,
    getSuspiciousLevelColor,
    getFactorLabel,
    getFactorColor,
  };
}
