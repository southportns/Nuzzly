import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'

// 产品库查询 composable（直查 supabase，与 web 端逻辑呼应）
// 不售卖，只做市场产品库导入 + 用户长期反馈数据展示
// 列表数据通过 .value 整体替换，使用 shallowRef 避免深度响应式追踪开销
const products = shallowRef([])
const categories = shallowRef([])
const loading = ref(false)

// 防竞态：自增请求序列号，仅最后一次请求的结果会写入 products.value
let fetchProductsReqId = 0

// 猫相关分类 slug（与 web 端 products/page.tsx 保持一致）
const CAT_CATEGORY_SLUGS = ['cat-food', 'cat-litter', 'cat-canned', 'cat-snack', 'cat-health']

// 物种过滤：默认只展示猫相关产品（与 web 一致）
function isCatProduct(p) {
  return p.applicable_species === 'cats' || p.applicable_species === 'both'
}

// 查询分类列表
async function fetchCategories() {
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, slug, icon, display_order')
    .order('display_order')
  if (error) {
    console.warn('[useProducts.fetchCategories]', error.message)
    categories.value = []
    return
  }
  // 只保留猫相关分类
  categories.value = (data || []).filter(c =>
    CAT_CATEGORY_SLUGS.includes(c.slug) || c.name.includes('猫')
  )
}

// 查询产品列表（支持分类 slug + 热门筛选 + 搜索关键词）
async function fetchProducts({ categorySlug, hot, keyword } = {}) {
  const myReqId = ++fetchProductsReqId
  loading.value = true
  let query = supabase
    .from('products')
    .select(`
      id, name, brand, image_url, description, price_min, price_max,
      origin_country, applicable_species, applicable_age, transparency_score,
      is_active, category_id,
      product_categories!inner(id, name, slug)
    `)
    .eq('is_active', true)

  if (categorySlug) {
    query = query.eq('product_categories.slug', categorySlug)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  // 竞态守卫：若期间已有新请求，丢弃本次结果
  if (myReqId !== fetchProductsReqId) return

  if (error) {
    console.warn('[useProducts.fetchProducts]', error.message)
    products.value = []
    loading.value = false
    return
  }

  let filtered = data || []
  // 非分类筛选时，过滤只保留猫产品
  if (!categorySlug) filtered = filtered.filter(isCatProduct)
  // 热门筛选：取有透明度评分或指标较好的（这里简化为按 transparency_score 排序前 20）
  if (hot === '1') {
    filtered = filtered
      .filter(p => p.transparency_score != null)
      .sort((a, b) => (b.transparency_score || 0) - (a.transparency_score || 0))
      .slice(0, 20)
  }
  // 关键词搜索（名称/品牌）
  if (keyword) {
    const k = keyword.trim().toLowerCase()
    filtered = filtered.filter(p =>
      p.name?.toLowerCase().includes(k) || p.brand?.toLowerCase().includes(k)
    )
  }

  // 二次守卫：过滤期间可能又有新请求
  if (myReqId !== fetchProductsReqId) return

  products.value = filtered
  loading.value = false
}

// 查询单个产品详情
async function fetchProduct(productId) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories(id, name, slug)
    `)
    .eq('id', productId)
    .maybeSingle()
  if (error) {
    console.warn('[useProducts.fetchProduct]', error.message)
    return null
  }
  return data
}

// 查询产品成分
async function fetchIngredients(productId) {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, notes, display_order')
    .eq('product_id', productId)
    .order('display_order')
  if (error) {
    console.warn('[useProducts.fetchIngredients]', error.message)
    return []
  }
  return data || []
}

// 查询产品版本历史
async function fetchVersions(productId) {
  const { data, error } = await supabase
    .from('product_versions')
    .select('id, version_name, formula_changes, effective_date, end_date, ingredients_snapshot, nutrition_snapshot, is_current, created_at')
    .eq('product_id', productId)
    .order('effective_date', { ascending: false, nullsFirst: false })
  if (error) {
    console.warn('[useProducts.fetchVersions]', error.message)
    return []
  }
  return data || []
}

// 查询产品标签
async function fetchProductTags(productId) {
  const { data, error } = await supabase
    .from('product_tags')
    .select('id, tag_type, tag_value')
    .eq('product_id', productId)
  if (error) {
    console.warn('[useProducts.fetchProductTags]', error.message)
    return []
  }
  return data || []
}

// 查询产品每日指标（取最新一条用于详情页 stats）
async function fetchMetrics(productId) {
  const { data, error } = await supabase
    .from('product_metrics_daily')
    .select('id, date, average_rating, review_count, stool_issue_rate, coat_improve_rate, energy_improve_rate, repurchase_rate, dispute_rate, risk_score, black_chin_rate, vomit_rate, tear_stain_rate, shedding_rate, long_term_stability_score')
    .eq('product_id', productId)
    .order('date', { ascending: false })
    .limit(30)
  if (error) {
    console.warn('[useProducts.fetchMetrics]', error.message)
    return []
  }
  return data || []
}

// 查询产品风险事件
async function fetchRiskEvents(productId) {
  const { data, error } = await supabase
    .from('risk_events')
    .select('id, title, description, severity, event_date, report_count, resolved')
    .eq('product_id', productId)
    .order('event_date', { ascending: false })
  if (error) {
    console.warn('[useProducts.fetchRiskEvents]', error.message)
    return []
  }
  return data || []
}

// 查询当前用户是否收藏某产品
async function isBookmarked(productId) {
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) return false
  const { data, error } = await supabase
    .from('product_bookmarks')
    .select('profile_id')
    .eq('profile_id', uid)
    .eq('product_id', productId)
    .maybeSingle()
  if (error) {
    console.warn('[useProducts.isBookmarked]', error.message)
    return false
  }
  return !!data
}

// 收藏/取消收藏切换，返回新状态
async function toggleBookmark(productId) {
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) throw new Error('未登录')
  const bookmarked = await isBookmarked(productId)
  if (bookmarked) {
    const { error } = await supabase
      .from('product_bookmarks')
      .delete()
      .eq('profile_id', uid)
      .eq('product_id', productId)
    if (error) throw new Error(error.message)
    return false
  } else {
    const { error } = await supabase
      .from('product_bookmarks')
      .insert({ profile_id: uid, product_id: productId })
    if (error) throw new Error(error.message)
    return true
  }
}

export function useProducts() {
  return {
    products, categories, loading,
    fetchCategories, fetchProducts, fetchProduct,
    fetchIngredients, fetchVersions, fetchProductTags,
    fetchMetrics, fetchRiskEvents,
    isBookmarked, toggleBookmark
  }
}
