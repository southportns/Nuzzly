// 事件总线（与 web 端 lib/events/event-bus.ts 呼应）
// 设计目标：
//   1. 轻量级发布/订阅模式，解耦模块间通信
//   2. 支持同步/异步事件处理
//   3. 内存安全：自动清理未使用的监听器
//   4. 类型安全：通过常量定义事件名，避免拼写错误

// 事件名称常量（避免字符串硬编码）
export const EVENTS = {
  // 宠物相关
  PET_CREATED: 'pet:created',
  PET_UPDATED: 'pet:updated',
  PET_DELETED: 'pet:deleted',
  PET_SWITCHED: 'pet:switched', // 切换当前选中宠物

  // 产品相关
  PRODUCT_VIEWED: 'product:viewed',
  PRODUCT_BOOKMARKED: 'product:bookmarked',
  PRODUCT_REVIEWED: 'product:reviewed',

  // 评价相关
  REVIEW_CREATED: 'review:created',
  REVIEW_UPDATED: 'review:updated',

  // 追踪相关
  FOLLOWUP_CREATED: 'followup:created',
  FOLLOWUP_COMPLETED: 'followup:completed',

  // 记录相关
  RECORD_CREATED: 'record:created',
  RECORD_UPDATED: 'record:updated',

  // 用户相关
  USER_LOGGED_IN: 'user:logged_in',
  USER_LOGGED_OUT: 'user:logged_out',
  PROFILE_UPDATED: 'profile:updated',

  // 数据刷新
  DATA_REFRESH_REQUESTED: 'data:refresh_requested',
  DATA_REFRESH_COMPLETED: 'data:refresh_completed',

  // 错误上报
  ERROR_OCCURRED: 'error:occurred'
}

// 存储事件监听器：Map<event, Array<handler>>
const handlers = new Map()

// 最大监听器数量（防止内存泄漏）
const MAX_LISTENERS = 50

/**
 * 注册事件监听器
 * @param {string} event - 事件名称（建议使用 EVENTS 常量）
 * @param {Function} handler - 处理函数，可返回 Promise
 * @returns {Function} - 取消订阅的函数
 *
 * @example
 * const unsubscribe = on(EVENTS.PET_CREATED, (pet) => {
 *   console.log('新宠物创建:', pet)
 * })
 * // 后续取消订阅
 * unsubscribe()
 */
export function on(event, handler) {
  if (!handlers.has(event)) {
    handlers.set(event, [])
  }
  const list = handlers.get(event)
  if (list.length >= MAX_LISTENERS) {
    console.warn(`[EventBus] 事件 "${event}" 监听器过多（${list.length}），可能存在内存泄漏`)
  }
  list.push(handler)
  return () => off(event, handler)
}

export function off(event, handler) {
  const list = handlers.get(event)
  if (!list) return
  const idx = list.indexOf(handler)
  if (idx !== -1) {
    list.splice(idx, 1)
  }
  if (list.length === 0) {
    handlers.delete(event)
  }
}

function getSnapshot(event) {
  const list = handlers.get(event)
  return list?.length ? [...list] : null
}

export function emit(event, payload) {
  const snapshot = getSnapshot(event)
  if (!snapshot) return
  for (const handler of snapshot) {
    try {
      handler(payload)
    } catch (err) {
      console.error(`[EventBus] 事件 "${event}" 处理器出错:`, err)
    }
  }
}

export async function emitAsync(event, payload) {
  const snapshot = getSnapshot(event)
  if (!snapshot) return
  await Promise.all(
    snapshot.map(async (handler) => {
      try {
        await handler(payload)
      } catch (err) {
        console.error(`[EventBus] 事件 "${event}" 异步处理器出错:`, err)
      }
    })
  )
}

export function once(event, handler) {
  const wrapper = (payload) => {
    off(event, wrapper)
    handler(payload)
  }
  return on(event, wrapper)
}

export function clear() {
  handlers.clear()
}

export function listenerCount(event) {
  return handlers.get(event)?.length || 0
}
