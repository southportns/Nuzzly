import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type JobStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled' | 'dead_letter';

export interface ComputationJob {
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
  pending: '等待处理',
  processing: '处理中',
  processed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  dead_letter: '死信',
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
  health_report: '健康报告生成',
  recommendation: '推荐计算',
  trust_score: '信任分数计算',
  metrics_aggregation: '指标聚合',
  data_sync: '数据同步',
  notification: '通知发送',
};

export function useComputationJobs() {
  const [jobs, setJobs] = useState<ComputationJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async (filters: { status?: JobStatus; job_type?: string; target_profile_id?: string; limit?: number } = {}) => {
    setLoading(true);
    let query = supabase
      .from('pending_computation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.job_type) query = query.eq('job_type', filters.job_type);
    if (filters.target_profile_id) query = query.eq('target_profile_id', filters.target_profile_id);

    const { data, error } = await query;
    if (error) {
      console.warn('[useComputationJobs.fetchJobs]', error.message);
      setJobs([]);
    } else {
      setJobs((data || []) as ComputationJob[]);
    }
    setLoading(false);
  }, []);

  const getJobStatusLabel = useCallback((status: JobStatus) => STATUS_LABELS[status] || status || '未知', []);
  const getJobStatusColor = useCallback((status: JobStatus) => STATUS_COLORS[status] || '#8b949e', []);
  const getJobTypeLabel = useCallback((type: string) => TYPE_LABELS[type] || type || '任务', []);

  return {
    jobs,
    loading,
    fetchJobs,
    getJobStatusLabel,
    getJobStatusColor,
    getJobTypeLabel,
  };
}
