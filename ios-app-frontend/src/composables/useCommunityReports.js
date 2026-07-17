import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const reports = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchReports(status = 'pending', limit = 50) {
  loading.value = true

  const { data, error } = await supabase
    .from('community_reports')
    .select('*, community_posts(content, profile_id), profiles(display_name)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[useCommunityReports] fetch error:', error.message)
    reports.value = []
  } else {
    reports.value = data || []
  }
  loading.value = false
}

async function fetchUserReports(userId) {
  loading.value = true

  const { data, error } = await supabase
    .from('community_reports')
    .select('*, community_posts(content)')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[useCommunityReports] fetchUser error:', error.message)
    reports.value = []
  } else {
    reports.value = data || []
  }
  loading.value = false
}

async function submitReport({ postId, reason, category = 'inappropriate' }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'submitReport')

  // 检查是否已经举报过
  const { data: existing } = await supabase
    .from('community_reports')
    .select('id')
    .eq('post_id', postId)
    .eq('reporter_id', uid)
    .single()

  if (existing) {
    throw normalizeError({ code: 'ALREADY_REPORTED', message: '您已经举报过该帖子' }, 'submitReport')
  }

  const { data, error } = await supabase
    .from('community_reports')
    .insert({
      post_id: postId,
      reporter_id: uid,
      reason,
      category,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw normalizeError(error, 'submitReport')
  return data
}

async function updateReportStatus(reportId, status, adminNote) {
  const { error } = await supabase
    .from('community_reports')
    .update({
      status,
      admin_note: adminNote
    })
    .eq('id', reportId)

  if (error) throw normalizeError(error, 'updateReportStatus')
  reports.value = reports.value.filter(r => r.id !== reportId)
}

async function dismissReport(reportId) {
  await updateReportStatus(reportId, 'dismissed', '举报无效')
}

async function resolveReport(reportId) {
  await updateReportStatus(reportId, 'resolved', '已处理')
}

function getReportStatusList() {
  return [
    { value: 'pending', label: '待处理' },
    { value: 'reviewing', label: '审核中' },
    { value: 'resolved', label: '已解决' },
    { value: 'dismissed', label: '已驳回' }
  ]
}

function getReportCategoryList() {
  return [
    { value: 'spam', label: '垃圾信息' },
    { value: 'inappropriate', label: '不当内容' },
    { value: 'harassment', label: '骚扰' },
    { value: 'misinformation', label: '虚假信息' },
    { value: 'other', label: '其他' }
  ]
}

function getReportStatusLabel(status) {
  const labels = {
    pending: '待处理',
    reviewing: '审核中',
    resolved: '已解决',
    dismissed: '已驳回'
  }
  return labels[status] || status || '未知'
}

function getReportStatusColor(status) {
  const colors = {
    pending: '#d29922',
    reviewing: '#58a6ff',
    resolved: '#3fb950',
    dismissed: '#8b949e'
  }
  return colors[status] || '#8b949e'
}

function getReportCategoryLabel(category) {
  const labels = {
    spam: '垃圾信息',
    inappropriate: '不当内容',
    harassment: '骚扰',
    misinformation: '虚假信息',
    other: '其他'
  }
  return labels[category] || category || '其他'
}

export function useCommunityReports() {
  return {
    reports,
    loading,
    fetchReports,
    fetchUserReports,
    submitReport,
    updateReportStatus,
    dismissReport,
    resolveReport,
    getReportStatusList,
    getReportCategoryList,
    getReportStatusLabel,
    getReportStatusColor,
    getReportCategoryLabel
  }
}
