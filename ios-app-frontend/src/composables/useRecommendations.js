import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const recommendations = shallowRef([])
const recommendationContexts = shallowRef([])
const loading = ref(false)
const generating = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchRecommendations(petId, limit = 10) {
  loading.value = true

  // 获取推荐上下文
  const { data: contexts, error: contextError } = await supabase
    .from('recommendation_contexts')
    .select('*, products(name, brand, image_url, price_min, price_max)')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (contextError) {
    console.warn('[useRecommendations] fetch error:', contextError.message)
    recommendations.value = []
  } else {
    recommendations.value = contexts || []
  }
  loading.value = false
}

async function generateRecommendations(petId, petProfile) {
  generating.value = true
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'generateRecommendations')

  try {
    // 调用推荐API
    const response = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: petId,
        pet_profile: petProfile
      })
    })

    if (!response.ok) {
      throw new Error('生成推荐失败')
    }

    const data = await response.json()
    recommendations.value = data.recommendations || []
    return data
  } finally {
    generating.value = false
  }
}

async function saveRecommendationContext(context) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'saveRecommendationContext')

  const { data, error } = await supabase
    .from('recommendation_contexts')
    .insert({
      ...context,
      profile_id: uid
    })
    .select('*, products(name, brand, image_url)')
    .single()

  if (error) throw normalizeError(error, 'saveRecommendationContext')
  return data
}

async function submitRecommendationFeedback({ recommendationId, productId, petId, action, rating, notes }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'submitRecommendationFeedback')

  try {
    await writeGateway('CREATE_RECOMMENDATION_FEEDBACK', {
      product_id: productId,
      pet_id: petId,
      recommendation_id: recommendationId,
      action,
      rating,
      notes
    })
  } catch (e) {
    throw normalizeError(e, 'submitRecommendationFeedback')
  }
  // gateway event 类型不返回行数据，本地构造一条乐观条目
  return {
    profile_id: uid,
    product_id: productId,
    pet_id: petId,
    recommendation_id: recommendationId,
    action,
    rating,
    notes,
    created_at: new Date().toISOString()
  }
}

async function fetchUserFeedback(productId) {
  const uid = await getUid()
  if (!uid) return null

  const { data, error } = await supabase
    .from('recommendation_feedback')
    .select('*')
    .eq('profile_id', uid)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.warn('[useRecommendations] fetchFeedback error:', error.message)
    return null
  }
  return data
}

function getRecommendationTypeLabel(type) {
  const labels = {
    personalized: '个性化推荐',
    popular: '热门推荐',
    trending: '趋势推荐',
    similar: '相似推荐',
    complementary: '互补推荐'
  }
  return labels[type] || type || '推荐'
}

function getRecommendationTypeIcon(type) {
  const icons = {
    personalized: '✨',
    popular: '🔥',
    trending: '📈',
    similar: '🔄',
    complementary: '🎯'
  }
  return icons[type] || '💡'
}

function getActionLabel(action) {
  const labels = {
    accept: '采纳',
    reject: '拒绝',
    purchased: '已购买',
    bookmarked: '已收藏'
  }
  return labels[action] || action || '操作'
}

function getActionColor(action) {
  const colors = {
    accept: '#3fb950',
    reject: '#f85149',
    purchased: '#58a6ff',
    bookmarked: '#d29922'
  }
  return colors[action] || '#8b949e'
}

function calculateMatchScore(recommendation) {
  if (!recommendation) return 0

  const dimensions = recommendation.dimensions || {}
  const weights = {
    overall_rating: 0.3,
    stomach_match: 0.25,
    stool_safety: 0.2,
    long_term_stability: 0.15,
    repurchase_rate: 0.1
  }

  let score = 0
  for (const [key, weight] of Object.entries(weights)) {
    if (dimensions[key] != null) {
      score += dimensions[key] * weight
    }
  }
  return Math.round(score * 100)
}

export function useRecommendations() {
  return {
    recommendations,
    recommendationContexts,
    loading,
    generating,
    fetchRecommendations,
    generateRecommendations,
    saveRecommendationContext,
    submitRecommendationFeedback,
    fetchUserFeedback,
    getRecommendationTypeLabel,
    getRecommendationTypeIcon,
    getActionLabel,
    getActionColor,
    calculateMatchScore
  }
}
