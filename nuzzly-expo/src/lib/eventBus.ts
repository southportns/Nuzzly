// 轻量级事件总线，用于页面/组件间解耦通信
export const EVENTS = {
  PRODUCT_VIEWED: 'product:viewed',
  PRODUCT_BOOKMARKED: 'product:bookmarked',
  REVIEW_CREATED: 'review:created',
} as const;

type EventMap = Record<string, any>;

const handlers = new Map<string, Set<(payload: any) => void>>();
const MAX_LISTENERS = 50;

export function on(event: string, handler: (payload: any) => void) {
  if (!handlers.has(event)) {
    handlers.set(event, new Set());
  }
  const set = handlers.get(event)!;
  if (set.size >= MAX_LISTENERS) {
    console.warn(`[EventBus] 事件 "${event}" 监听器过多（${set.size}）`);
  }
  set.add(handler);
  return () => off(event, handler);
}

export function off(event: string, handler: (payload: any) => void) {
  const set = handlers.get(event);
  if (!set) return;
  set.delete(handler);
  if (set.size === 0) handlers.delete(event);
}

export function emit(event: string, payload?: any) {
  const set = handlers.get(event);
  if (!set) return;
  for (const handler of Array.from(set)) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[EventBus] 事件 "${event}" 处理器出错:`, err);
    }
  }
}
