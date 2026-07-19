import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const intentEvents = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchIntentEvents(profileId, limit = 50) {
  loading.value = true

  let query = supabase
    .from('intent_events')
    .select('*, products(name, brand), pets(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useIntentEvents] fetch error:', error.message)
    intentEvents.value = []
  } else {
    intentEvents.value = data || []
  }
  loading.value = false
}

async function fetchIntentByType(eventType, limit = 20) {
  loading.value = true

  const { data, error } = await supabase
    .from('intent_events')
    .select('*')
    .eq('event_type', eventType)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[useIntentEvents] fetchByType error:', error.message)
    intentEvents.value = []
  } else {
    intentEvents.value = data || []
  }
  loading.value = false
}

async function createIntentEvent({ event_type, pet_id, product_id, recommendation_id, metadata }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'createIntentEvent')

  try {
    await writeGateway('CREATE_INTENT_EVENT', {
      event_type,
      pet_id,
      product_id,
      recommendation_id,
      metadata
    })
  } catch (e) {
    throw normalizeError(e, 'createIntentEvent')
  }
  // gateway event 类型不返回行数据，本地构造一条乐观条目
  const optimistic = {
    profile_id: uid,
    event_type,
    pet_id,
    product_id,
    recommendation_id,
    metadata,
    created_at: new Date().toISOString()
  }
  intentEvents.value = [optimistic, ...intentEvents.value]
  return optimistic
}

async function recordPurchaseIntent(productId, petId) {
  return createIntentEvent({
    event_type: 'purchase_intent',
    product_id: productId,
    pet_id: petId
  })
}

async function recordRepurchaseIntent(productId, petId) {
  return createIntentEvent({
    event_type: 'repurchase_intent',
    product_id: productId,
    pet_id: petId
  })
}

async function recordComparisonIntent(productIds, petId) {
  return createIntentEvent({
    event_type: 'comparison_intent',
    product_id: productIds[0],
    pet_id: petId,
    metadata: { compared_products: productIds }
  })
}

async function recordSearchIntent(query, petId) {
  return createIntentEvent({
    event_type: 'search_intent',
    pet_id: petId,
    metadata: { search_query: query }
  })
}

function getEventTypeLabel(type) {
  const labels = {
    purchase_intent: '购买意向',
    repurchase_intent: '复购意向',
    comparison_intent: '对比意向',
    search_intent: '搜索意向',
    recommendation_intent: '推荐意向',
    inquiry_intent: '咨询意向',
    switch_intent: '换粮意向'
  }
  return labels[type] || type || '意向'
}

function getEventTypeIcon(type) {
  const icons = {
    purchase_intent: '🛒',
    repurchase_intent: '🔄',
    comparison_intent: '⚖️',
    search_intent: '🔍',
    recommendation_intent: '💡',
    inquiry_intent: '💬',
    switch_intent: '🔀'
  }
  return icons[type] || '🎯'
}

function getEventTypeColor(type) {
  const colors = {
    purchase_intent: '#3fb950',
    repurchase_intent: '#58a6ff',
    comparison_intent: '#d29922',
    search_intent: '#8b949e',
    recommendation_intent: '#a5d6ff',
    inquiry_intent: '#a8c5a0',
    switch_intent: '#e8a87c'
  }
  return colors[type] || '#8b949e'
}

function calculateIntentStats(events) {
  if (!events || events.length === 0) return null

  const stats = {
    totalIntents: events.length,
    byType: {},
    byProduct: {},
    byPet: {},
    conversionPotential: 0,
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

  // 按宠物统计
  for (const event of events) {
    if (event.pet_id) {
      stats.byPet[event.pet_id] = (stats.byPet[event.pet_id] || 0) + 1
    }
  }

  // 计算转化潜力（购买意向 + 复购意向）
  stats.conversionPotential = (stats.byType.purchase_intent || 0) + (stats.byType.repurchase_intent || 0)

  return stats
}

function getHighIntentProducts(events, topN = 5) {
  const productIntents = {}

  for (const event of events) {
    if (!event.product_id) continue

    if (!productIntents[event.product_id]) {
      productIntents[event.product_id] = {
        product_id: event.product_id,
        product_name: event.products?.name || '未知产品',
        intent_count: 0,
        has_purchase: false,
        has_repurchase: false
      }
    }

    productIntents[event.product_id].intent_count++

    if (event.event_type === 'purchase_intent') {
      productIntents[event.product_id].has_purchase = true
    }
    if (event.event_type === 'repurchase_intent') {
      productIntents[event.product_id].has_repurchase = true
    }
  }

  return Object.values(productIntents)
    .sort((a, b) => b.intent_count - a.intent_count)
    .slice(0, topN)
}

export function useIntentEvents() {
  return {
    intentEvents,
    loading,
    fetchIntentEvents,
    fetchIntentByType,
    createIntentEvent,
    recordPurchaseIntent,
    recordRepurchaseIntent,
    recordComparisonIntent,
    recordSearchIntent,
    getEventTypeLabel,
    getEventTypeIcon,
    getEventTypeColor,
    calculateIntentStats,
    getHighIntentProducts
  }
}
