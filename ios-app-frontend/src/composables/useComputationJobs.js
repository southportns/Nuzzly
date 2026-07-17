import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const jobs = shallowRef([])
const loading = ref(false)

async function fetchJobs({ status, job_type, target_profile_id, limit = 50 } = {}) {
  loading.value = true

  let query = supabase
    .from('pending_computation_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }
  if (job_type) {
    query = query.eq('job_type', job_type)
  }
  if (target_profile_id) {
    query = query.eq('target_profile_id', target_profile_id)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useComputationJobs] fetch error:', error.message)
    jobs.value = []
  } else {
    jobs.value = data || []
  }
  loading.value = false
}

async function fetchUserJobs(profileId, status = null) {
  loading.value = true

  let query = supabase
    .from('pending_computation_jobs')
    .select('*')
    .eq('target_profile_id', profileId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useComputationJobs] fetchUser error:', error.message)
    jobs.value = []
  } else {
    jobs.value = data || []
  }
  loading.value = false
}

async function createJob({ job_type, payload, target_id, target_profile_id, priority = 0, scheduled_at }) {
  const { data, error } = await supabase
    .from('pending_computation_jobs')
    .insert({
      job_type,
      payload,
      target_id,
      target_profile_id,
      priority,
      scheduled_at: scheduled_at || new Date().toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw normalizeError(error, 'createJob')
  jobs.value = [data, ...jobs.value]
  return data
}

async function updateJobStatus(id, status, { error_message, processed_at } = {}) {
  const updates = { status }
  if (error_message) updates.error_message = error_message
  if (processed_at) updates.processed_at = processed_at
  if (status === 'processed') updates.processed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('pending_computation_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw normalizeError(error, 'updateJobStatus')
  jobs.value = jobs.value.map(j => j.id === id ? data : j)
  return data
}

async function cancelJob(id) {
  return updateJobStatus(id, 'cancelled')
}

async function retryJob(id) {
  return updateJobStatus(id, 'pending')
}

async function markJobFailed(id, errorMessage) {
  return updateJobStatus(id, 'failed', { error_message: errorMessage })
}

function getJobStatusLabel(status) {
  const labels = {
    pending: '等待处理',
    processing: '处理中',
    processed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    dead_letter: '死信'
  }
  return labels[status] || status || '未知'
}

function getJobStatusColor(status) {
  const colors = {
    pending: '#d29922',
    processing: '#58a6ff',
    processed: '#3fb950',
    failed: '#f85149',
    cancelled: '#8b949e',
    dead_letter: '#da3633'
  }
  return colors[status] || '#8b949e'
}

function getJobTypeLabel(type) {
  const labels = {
    health_report: '健康报告生成',
    recommendation: '推荐计算',
    trust_score: '信任分数计算',
    metrics_aggregation: '指标聚合',
    data_sync: '数据同步',
    notification: '通知发送'
  }
  return labels[type] || type || '任务'
}

function getJobTypeIcon(type) {
  const icons = {
    health_report: '🏥',
    recommendation: '🎯',
    trust_score: '🛡️',
    metrics_aggregation: '📊',
    data_sync: '🔄',
    notification: '🔔'
  }
  return icons[type] || '⚙️'
}

function calculateJobStats(jobsList) {
  if (!jobsList || jobsList.length === 0) return null

  const stats = {
    total: jobsList.length,
    byStatus: {},
    byType: {},
    oldestPending: null,
    newestJob: jobsList[0]
  }

  for (const job of jobsList) {
    stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1
    stats.byType[job.job_type] = (stats.byType[job.job_type] || 0) + 1
  }

  // 找到最老的pending任务
  const pendingJobs = jobsList.filter(j => j.status === 'pending')
  if (pendingJobs.length > 0) {
    stats.oldestPending = pendingJobs[pendingJobs.length - 1]
  }

  return stats
}

export function useComputationJobs() {
  return {
    jobs,
    loading,
    fetchJobs,
    fetchUserJobs,
    createJob,
    updateJobStatus,
    cancelJob,
    retryJob,
    markJobFailed,
    getJobStatusLabel,
    getJobStatusColor,
    getJobTypeLabel,
    getJobTypeIcon,
    calculateJobStats
  }
}
