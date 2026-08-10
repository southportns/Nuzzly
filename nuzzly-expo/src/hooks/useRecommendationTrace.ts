import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TraceLog {
 id: string;
 pet_id: string;
 profile_id?: string;
 session_id?: string;
 Model_version?: string;
 data_sources?: string[];
 feature_snapshot?: any;
 decision_graph?: any;
 in_features?: any;
 user_segment?: string;
 created_at?: string;
}

const DATA_SOURCE_LABELS: Record<string, string> = {
 reviews: 'UserReview',
 timeline: 'Timeline Data',
 profile: 'Userprofile',
 pet: 'Pet Info',
 product: 'ProductData',
 external: 'External Data',
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
 return DATA_SOURCE_LABELS[source || ''] || source || 'Unknown';
 }, []);

 return {
 traceLogs,
 loading,
 fetchTraceLogs,
 getDataSourceLabel,
 };
}
