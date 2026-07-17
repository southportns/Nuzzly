import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

// 评价 composable：提交产品使用反馈 + 查询评价列表
// 与 web 端 review-wizard 字段对齐：usage_duration 时长分桶 + 9 项结构化评分
// reviews 列表整体替换，使用 shallowRef 减少深度响应式开销
const reviews = shallowRef([])
const submitting = ref(false)

// 使用时长分桶（与 web/expand_product_reviews.sql ENUM 一致）
const DURATION_BUCKETS = [
  { value: 'lt_1w', label: '一周以内', days: '1-6天' },
  { value: '1w_to_2w', label: '一周到半个月', days: '7-14天' },
  { value: '2w_to_1m', label: '半个月到一个月', days: '15-30天' },
  { value: '1m_to_3m', label: '一个月到三个月', days: '31-90天' },
  { value: 'm6', label: '半年', days: '约180天' },
  { value: 'm6_to_1y', label: '半年到一年', days: '180-365天' },
  { value: 'gt_1y', label: '一年以上', days: '365天+' },
  { value: 'custom', label: '自定义', days: '输入具体天数' }
]

// 查询某产品的评价列表（带用户和宠物信息）
async function fetchReviews(productId) {
  const { data, error } = await supabase
    .from('product_reviews')
    .select(`
      id, product_id, pet_id, profile_id,
      usage_duration, usage_duration_custom_days,
      palatability_rating, stool_rating, coat_rating, energy_rating, overall_rating,
      black_chin_rating, vomit_rating, tear_stain_rating, shedding_rating,
      would_repurchase, review_text, pros, cons,
      verified_purchase, has_voucher, review_trust_score, helpful_count,
      transition_period_days, created_at,
      pets!inner(name, breed, species, stomach_health),
      profiles!inner(display_name, avatar_url)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[useReviews.fetchReviews]', error.message)
    reviews.value = []
    return []
  }
  reviews.value = data || []
  return data || []
}

// 查询当前用户提交的所有评价（用于"我的评价"）
async function fetchMyReviews() {
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) { reviews.value = []; return [] }
  const { data, error } = await supabase
    .from('product_reviews')
    .select(`
      id, product_id, pet_id, overall_rating, review_text, pros, cons,
      usage_duration, would_repurchase, created_at,
      products!inner(name, brand, image_url)
    `)
    .eq('profile_id', uid)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[useReviews.fetchMyReviews]', error.message)
    reviews.value = []
    return []
  }
  reviews.value = data || []
  return data || []
}

// 提交评价（6步向导收集的数据）
// payload: { product_id, pet_id, usage_duration, usage_duration_custom_days?,
//            palatability_rating?, stool_rating?, coat_rating?, energy_rating?,
//            black_chin_rating?, vomit_rating?, tear_stain_rating?, shedding_rating?,
//            overall_rating?, would_repurchase?, review_text?, pros?, cons?,
//            transition_period_days?, verified_purchase? }
async function submitReview(payload) {
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) throw new Error('未登录')

  submitting.value = true
  const record = {
    product_id: payload.product_id,
    pet_id: payload.pet_id,
    profile_id: uid,
    usage_duration: payload.usage_duration,
    usage_duration_custom_days: payload.usage_duration === 'custom' && payload.usage_duration_custom_days
      ? Number(payload.usage_duration_custom_days) : null,
    palatability_rating: payload.palatability_rating ?? null,
    stool_rating: payload.stool_rating ?? null,
    coat_rating: payload.coat_rating ?? null,
    energy_rating: payload.energy_rating ?? null,
    overall_rating: payload.overall_rating ?? null,
    black_chin_rating: payload.black_chin_rating ?? null,
    vomit_rating: payload.vomit_rating ?? null,
    tear_stain_rating: payload.tear_stain_rating ?? null,
    shedding_rating: payload.shedding_rating ?? null,
    would_repurchase: payload.would_repurchase ?? null,
    review_text: payload.review_text || null,
    pros: payload.pros || null,
    cons: payload.cons || null,
    transition_period_days: payload.transition_period_days ? Number(payload.transition_period_days) : null,
    verified_purchase: payload.verified_purchase ?? false
  }

  const { data, error } = await supabase
    .from('product_reviews')
    .insert(record)
    .select()
    .single()

  submitting.value = false
  if (error) throw normalizeError(error, 'submitReview')

  // 触发时间线处理（web 端是 /api/reviews/[id]/process-timeline，iOS 复用同一 API）
  // 失败静默忽略——时间线处理是非关键的后台任务
  fetch(`/api/reviews/${data.id}/process-timeline`, { method: 'POST' }).catch(() => {})

  return data
}

export function useReviews() {
  return {
    reviews, submitting, DURATION_BUCKETS,
    fetchReviews, fetchMyReviews, submitReview
  }
}
