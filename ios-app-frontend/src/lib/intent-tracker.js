// 用户意图追踪（与 web 端 lib/tracking/intent-tracker.ts 呼应）
// 设计目标：
//   1. 记录用户行为事件，用于后续分析和优化
//   2. 轻量级实现，不依赖外部服务
//   3. 支持本地存储 + 可选的远程上报
//   4. 与 Event Bus 集成，自动捕获关键事件

import { supabase } from './supabase'
import { on, EVENTS } from './event-bus'

// 事件类型常量
export const TRACK_EVENTS = {
  // 产品相关
  PRODUCT_VIEW: 'product_view',
  PRODUCT_CLICK: 'product_click',
  PRODUCT_SEARCH: 'product_search',
  PRODUCT_FILTER: 'product_filter',
  PRODUCT_BOOKMARK: 'product_bookmark',

  // 评价相关
  REVIEW_VIEW: 'review_view',
  REVIEW_CREATE: 'review_create',

  // 宠物相关
  PET_CREATE: 'pet_create',
  PET_VIEW: 'pet_view',
  PET_SWITCH: 'pet_switch',

  // 记录相关
  RECORD_CREATE: 'record_create',
  RECORD_VIEW: 'record_view',

  // 追踪相关
  FOLLOWUP_CREATE: 'followup_create',
  FOLLOWUP_VIEW: 'followup_view',

  // 导航相关
  PAGE_VIEW: 'page_view',
  TAB_SWITCH: 'tab_switch',

  // 推荐相关
  RECOMMENDATION_VIEW: 'recommendation_view',
  RECOMMENDATION_CLICK: 'recommendation_click'
}

// 本地存储键名
const STORAGE_KEY = 'nuzzly_tracking_events'
const MAX_LOCAL_EVENTS = 100 // 本地最多缓存事件数

// 事件队列（本地缓存）
let eventQueue = []

// 是否启用远程上报（可通过配置开关）
let enableRemoteTracking = false

/**
 * 初始化追踪器
 * - 加载本地缓存的事件
 * - 注册 Event Bus 监听器，自动捕获关键事件
 */
export function initTracker() {
  // 加载本地缓存
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      eventQueue = JSON.parse(cached)
    }
  } catch (err) {
    console.warn('[Tracker] 加载本地缓存失败:', err)
    eventQueue = []
  }

  // 注册 Event Bus 监听器，自动捕获关键事件
  setupAutoTracking()

  console.log('[Tracker] 初始化完成，当前缓存事件数:', eventQueue.length)
}

/**
 * 设置自动追踪（监听 Event Bus 事件）
 */
function setupAutoTracking() {
  // 产品浏览
  on(EVENTS.PRODUCT_VIEWED, (payload) => {
    track(TRACK_EVENTS.PRODUCT_VIEW, {
      product_id: payload.id,
      product_name: payload.name,
      category: payload.category
    })
  })

  // 产品收藏
  on(EVENTS.PRODUCT_BOOKMARKED, (payload) => {
    track(TRACK_EVENTS.PRODUCT_BOOKMARK, {
      product_id: payload.productId,
      bookmarked: payload.bookmarked
    })
  })

  // 评价创建
  on(EVENTS.REVIEW_CREATED, (payload) => {
    track(TRACK_EVENTS.REVIEW_CREATE, {
      product_id: payload.productId,
      rating: payload.rating
    })
  })

  // 宠物创建
  on(EVENTS.PET_CREATED, (payload) => {
    track(TRACK_EVENTS.PET_CREATE, {
      pet_id: payload.id,
      species: payload.species,
      breed: payload.breed
    })
  })

  // 宠物切换
  on(EVENTS.PET_SWITCHED, (payload) => {
    track(TRACK_EVENTS.PET_SWITCH, {
      pet_id: payload.id
    })
  })

  // 记录创建
  on(EVENTS.RECORD_CREATED, (payload) => {
    track(TRACK_EVENTS.RECORD_CREATE, {
      pet_id: payload.petId,
      record_type: payload.type
    })
  })

  // 追踪创建
  on(EVENTS.FOLLOWUP_CREATED, (payload) => {
    track(TRACK_EVENTS.FOLLOWUP_CREATE, {
      pet_id: payload.petId,
      product_id: payload.productId
    })
  })
}

/**
 * 记录追踪事件
 * @param {string} eventName - 事件名称（建议使用 TRACK_EVENTS 常量）
 * @param {Object} properties - 事件属性
 * @param {Object} [options] - 可选配置
 * @param {boolean} [options.immediate=false] - 是否立即上报（不走队列）
 *
 * @example
 * track(TRACK_EVENTS.PRODUCT_VIEW, {
 *   product_id: '123',
 *   product_name: '皇家猫粮'
 * })
 */
export function track(eventName, properties = {}, options = {}) {
  const event = {
    event: eventName,
    properties,
    timestamp: new Date().toISOString(),
    user_id: getCurrentUserId(),
    session_id: getSessionId()
  }

  // 加入本地队列
  eventQueue.push(event)

  // 限制队列大小
  if (eventQueue.length > MAX_LOCAL_EVENTS) {
    eventQueue = eventQueue.slice(-MAX_LOCAL_EVENTS)
  }

  // 保存到本地存储
  saveToLocalStorage()

  // 立即上报
  if (options.immediate || enableRemoteTracking) {
    flushEvents()
  }
}

/**
 * 手动上报所有缓存事件
 * @returns {Promise<{ success: boolean, count: number }>}
 */
export async function flushEvents() {
  if (eventQueue.length === 0) {
    return { success: true, count: 0 }
  }

  try {
    const count = eventQueue.length
    console.log('[Tracker] 上报事件:', count, '条')

    eventQueue = []
    saveToLocalStorage()

    return { success: true, count }
  } catch (err) {
    console.error('[Tracker] 上报失败:', err)
    return { success: false, count: 0 }
  }
}

/**
 * 获取当前用户 ID
 * @returns {string | null}
 */
function getCurrentUserId() {
  try {
    // 从 localStorage 或 sessionStorage 获取
    const user = JSON.parse(localStorage.getItem('nuzzly_user') || 'null')
    return user?.id || null
  } catch {
    return null
  }
}

/**
 * 获取会话 ID（每次打开应用生成一个）
 * @returns {string}
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('nuzzly_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem('nuzzly_session_id', sessionId)
  }
  return sessionId
}

/**
 * 保存事件队列到本地存储
 */
function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventQueue))
  } catch (err) {
    console.warn('[Tracker] 保存到本地存储失败:', err)
  }
}

/**
 * 启用/禁用远程上报
 * @param {boolean} enabled
 */
export function setRemoteTracking(enabled) {
  enableRemoteTracking = enabled
  console.log('[Tracker] 远程上报:', enabled ? '已启用' : '已禁用')
}

/**
 * 获取事件队列（调试用）
 * @returns {Array}
 */
export function getEventQueue() {
  return [...eventQueue]
}

/**
 * 清空事件队列（调试用）
 */
export function clearEventQueue() {
  eventQueue = []
  saveToLocalStorage()
}

/**
 * 页面浏览追踪（手动调用）
 * @param {string} pageName - 页面名称
 * @param {Object} [properties] - 额外属性
 */
export function trackPageView(pageName, properties = {}) {
  track(TRACK_EVENTS.PAGE_VIEW, {
    page: pageName,
    ...properties
  })
}

/**
 * 产品搜索追踪
 * @param {string} query - 搜索关键词
 * @param {number} resultCount - 结果数量
 */
export function trackSearch(query, resultCount) {
  track(TRACK_EVENTS.PRODUCT_SEARCH, {
    query,
    result_count: resultCount
  })
}

/**
 * 产品筛选追踪
 * @param {Object} filters - 筛选条件
 */
export function trackFilter(filters) {
  track(TRACK_EVENTS.PRODUCT_FILTER, {
    filters
  })
}
