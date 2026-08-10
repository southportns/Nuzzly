import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type JobStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled' | 'dead_letter';

export interface ComationJob {
 id: string;
 job_type: string;
 status: JobStatus;
 payload?: any;
 target_id?: string;
 target_profile_id?: string;
 priority?: number;
 scheduled_at?: string;
 created_at?: string;
 processed_at?: string;
 error_message?: string;
}

const STATUS_LABELS: Record<JobStatus, string> = {
 pending: 'etc.Pending',
 processing: 'Medium',
 processed: 'Completed',
 failed: 'Failed',
 cancelled: ' Cancel',
 dead_letter: 'believe',
};

const STATUS_COLORS: Record<JobStatus, string> = {
 pending: '#d29922',
 processing: '#58a6ff',
 processed: '#3fb950',
 failed: '#f85149',
 cancelled: '#8b949e',
 dead_letter: '#da3633',
};

const TYPE_LABELS: Record<string, string> = {
 health_report: 'Health',
 recommendation: 'Recommendations',
 trust_score: 'Trust Score',
 metrics_aggregation: '',
 data_sync: 'DataSync',
 notification: 'NotificationsSend',
};

export function useComationJobs() {
 const [jobs, setJobs] = useState<ComationJob[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchJobs = useCallback(async (filters: { status?: JobStatus; job_type?: string; target_profile_id?: string; limit?: number } = {}) => {
 setLoading(true);
 let query = supabase.from('pending_comation_jobs').select('*').order('created_at', { ascending: false }).limit(filters.limit || 50);
 if (filters.status) query = query.eq('status', filters.status);
 if (filters.job_type) query = query.eq('job_type', filters.job_type);
 if (filters.target_profile_id) query = query.eq('target_profile_id', filters.target_profile_id);

 const { data, error } = await query;
 if (error) {
 console.warn('[useComationJobs.fetchJobs]', error.message);
 setJobs([]);
 } else {
 setJobs((data || []) as ComationJob[]);
 }
 setLoading(false);
 }, []);

 const getJobStatusLabel = useCallback((status: JobStatus) => STATUS_LABELS[status] || status || 'Unknown', []);
 const getJobStatusColor = useCallback((status: JobStatus) => STATUS_COLORS[status] || '#8b949e', []);
 const getJobTypeLabel = useCallback((type: string) => TYPE_LABELS[type] || type || '', []);

 return {
 jobs,
 loading,
 fetchJobs,
 getJobStatusLabel,
 getJobStatusColor,
 getJobTypeLabel,
 };
}
