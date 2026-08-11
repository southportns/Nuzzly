import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TraceLog {
  id: string;
  pet_id: string;
  profile_id?: string;
  session_id?: string;
  model_version?: string;
  data_sources?: string[];
  feature_snapshot?: any;
  decision_graph?: any;
  input_features?: any;
  user_segment?: string;
  created_at?: string;
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  reviews: '用户评价',
  timeline: '时间线数据',
  profile: '用户档案',
  pet: '宠物信息',
  product: '产品数据',
  external: '外部数据',
};

export function useRecommendationTrace() {
  const [traceLogs, setTraceLogs] = useState<TraceLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTraceLogs = useCallback(async (petId: string, limit = 20) => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;

    let query = supabase
      .from('recommendation_trace_log')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (uid) query = query.eq('profile_id', uid);

    const { data, error } = await query;
    if (error) {
      console.warn('[useRecommendationTrace.fetchTraceLogs]', error.message);
      setTraceLogs([]);
    } else {
      setTraceLogs((data || []) as TraceLog[]);
    }
    setLoading(false);
  }, []);

  const getDataSourceLabel = useCallback((source?: string) => {
    return DATA_SOURCE_LABELS[source || ''] || source || '未知';
  }, []);

  return {
    traceLogs,
    loading,
    fetchTraceLogs,
    getDataSourceLabel,
  };
}
