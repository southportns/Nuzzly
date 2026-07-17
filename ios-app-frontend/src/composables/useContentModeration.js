import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const moderationQueue = shallowRef([])
const moderationStats = ref({ pending: 0, approved: 0, rejected: 0 })
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchModerationQueue(status = 'pending', limit = 50) {
  loading.value = true

  const { data, error } = await supabase
    .from('community_posts')
    .select('*, profiles(display_name, avatar_url)')
    .eq('review_status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[useContentModeration] fetch error:', error.message)
    moderationQueue.value = []
  } else {
    moderationQueue.value = data || []
  }
  loading.value = false
}

async function fetchModerationStats() {
  const [pending, approved, rejected] = await Promise.all([
    supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
    supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('review_status', 'approved'),
    supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('review_status', 'rejected')
  ])

  moderationStats.value = {
    pending: pending.count || 0,
    approved: approved.count || 0,
    rejected: rejected.count || 0
  }
}

async function approvePost(postId) {
  const { error } = await supabase
    .from('community_posts')
    .update({ review_status: 'approved' })
    .eq('id', postId)

  if (error) throw normalizeError(error, 'approvePost')
  moderationQueue.value = moderationQueue.value.filter(p => p.id !== postId)
  moderationStats.value.pending--
  moderationStats.value.approved++
}

async function rejectPost(postId, reason) {
  const { error } = await supabase
    .from('community_posts')
    .update({
      review_status: 'rejected',
      reject_reason: reason || '内容不符合社区规范'
    })
    .eq('id', postId)

  if (error) throw normalizeError(error, 'rejectPost')
  moderationQueue.value = moderationQueue.value.filter(p => p.id !== postId)
  moderationStats.value.pending--
  moderationStats.value.rejected++
}

async function flagPost(postId, reason) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'flagPost')

  // 创建举报记录
  const { error } = await supabase
    .from('community_reports')
    .insert({
      post_id: postId,
      reporter_id: uid,
      reason: reason,
      category: 'inappropriate'
    })

  if (error) throw normalizeError(error, 'flagPost')
}

async function batchModerate(postIds, action, reason) {
  const updates = action === 'approve'
    ? { review_status: 'approved' }
    : { review_status: 'rejected', reject_reason: reason }

  const { error } = await supabase
    .from('community_posts')
    .update(updates)
    .in('id', postIds)

  if (error) throw normalizeError(error, 'batchModerate')

  // 更新本地状态
  moderationQueue.value = moderationQueue.value.filter(p => !postIds.includes(p.id))
  moderationStats.value.pending -= postIds.length
  if (action === 'approve') {
    moderationStats.value.approved += postIds.length
  } else {
    moderationStats.value.rejected += postIds.length
  }
}

function getReviewStatusLabel(status) {
  const labels = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    auto_approved: '自动通过'
  }
  return labels[status] || status || '未知'
}

function getReviewStatusColor(status) {
  const colors = {
    pending: '#d29922',
    approved: '#3fb950',
    rejected: '#f85149',
    auto_approved: '#58a6ff'
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

export function useContentModeration() {
  return {
    moderationQueue,
    moderationStats,
    loading,
    fetchModerationQueue,
    fetchModerationStats,
    approvePost,
    rejectPost,
    flagPost,
    batchModerate,
    getReviewStatusLabel,
    getReviewStatusColor,
    getReportCategoryLabel
  }
}
