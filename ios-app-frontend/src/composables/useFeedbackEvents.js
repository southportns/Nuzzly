import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const feedbackEvents = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchFeedbackEvents(profileId, limit = 50) {
  loading.value = true

  let query = supabase
    .from('feedback_events')
    .select('*, products(name, brand)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useFeedbackEvents] fetch error:', error.message)
    feedbackEvents.value = []
  } else {
    feedbackEvents.value = data || []
  }
  loading.value = false
}

async function fetchFeedbackByProduct(productId, limit = 20) {
  loading.value = true

  const { data, error } = await supabase
    .from('feedback_events')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[useFeedbackEvents] fetchByProduct error:', error.message)
    feedbackEvents.value = []
  } else {
    feedbackEvents.value = data || []
  }
  loading.value = false
}

async function createFeedbackEvent({ event_type, product_id, metadata, source = 'app' }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'createFeedbackEvent')

  const { data, error } = await supabase
    .from('feedback_events')
    .insert({
      profile_id: uid,
      event_type,
      product_id,
      metadata,
      source
    })
    .select('*, products(name, brand)')
    .single()

  if (error) throw normalizeError(error, 'createFeedbackEvent')
  feedbackEvents.value = [data, ...feedbackEvents.value]
  return data
}

async function recordProductView(productId) {
  return createFeedbackEvent({
    event_type: 'product_view',
    product_id: productId,
    source: 'app'
  })
}

async function recordProductBookmark(productId) {
  return createFeedbackEvent({
    event_type: 'product_bookmark',
    product_id: productId,
    source: 'app'
  })
}

async function recordRecommendationClick(productId, recommendationId) {
  return createFeedbackEvent({
    event_type: 'recommendation_click',
    product_id: productId,
    metadata: { recommendation_id: recommendationId },
    source: 'app'
  })
}

function getEventTypeLabel(type) {
  const labels = {
    product_view: '浏览产品',
    product_bookmark: '收藏产品',
    product_unbookmark: '取消收藏',
    recommendation_click: '点击推荐',
    recommendation_accept: '采纳推荐',
    recommendation_reject: '拒绝推荐',
    review_submit: '提交评价',
    search: '搜索',
    filter: '筛选',
    share: '分享'
  }
  return labels[type] || type || '事件'
}

function getEventTypeIcon(type) {
  const icons = {
    product_view: '👀',
    product_bookmark: '⭐',
    product_unbookmark: '☆',
    recommendation_click: '🎯',
    recommendation_accept: '✓',
    recommendation_reject: '✗',
    review_submit: '📝',
    search: '🔍',
    filter: '🔽',
    share: '📤'
  }
  return icons[type] || '📌'
}

function getEventTypeColor(type) {
  const colors = {
    product_view: '#58a6ff',
    product_bookmark: '#d29922',
    product_unbookmark: '#8b949e',
    recommendation_click: '#a5d6ff',
    recommendation_accept: '#3fb950',
    recommendation_reject: '#f85149',
    review_submit: '#58a6ff',
    search: '#8b949e',
    filter: '#8b949e',
    share: '#3fb950'
  }
  return colors[type] || '#8b949e'
}

function getSourceLabel(source) {
  const labels = {
    app: 'App端',
    web: 'Web端',
    api: 'API',
    system: '系统'
  }
  return labels[source] || source || '未知'
}

function calculateFeedbackStats(events) {
  if (!events || events.length === 0) return null

  const stats = {
    totalEvents: events.length,
    byType: {},
    byProduct: {},
    recentActivity: events.slice(0, 10),
    dateRange: {
      earliest: events[events.length - 1]?.created_at,
      latest: events[0]?.created_at
    }
  }

  // 按类型统计
  for (const event of events) {
    const type = event.event_type
    stats.byType[type] = (stats.byType[type] || 0) + 1
  }

  // 按产品统计
  for (const event of events) {
    if (event.product_id) {
      stats.byProduct[event.product_id] = (stats.byProduct[event.product_id] || 0) + 1
    }
  }

  return stats
}

export function useFeedbackEvents() {
  return {
    feedbackEvents,
    loading,
    fetchFeedbackEvents,
    fetchFeedbackByProduct,
    createFeedbackEvent,
    recordProductView,
    recordProductBookmark,
    recordRecommendationClick,
    getEventTypeLabel,
    getEventTypeIcon,
    getEventTypeColor,
    getSourceLabel,
    calculateFeedbackStats
  }
}
