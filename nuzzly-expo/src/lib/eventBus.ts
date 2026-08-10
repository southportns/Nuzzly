// Lightweight event bus for decoupled communication between pages/components
export const EVENTS = {
 PRODUCT_VIEWED: 'product:viewed',
 PRODUCT_BOOKMARKED: 'product:bookmarked',
 REVIEW_CREATED: 'review:created',
} as const;

type eventMap = Record<string, any>;

const handlers = new Map<string, Set<(payload: any) => void>>();
const MAX_LISTENERS = 50;

export function on(event: string, handler: (payload: any) => void) {
 if (!handlers.has(event)) {
 handlers.set(event, new Set());
 }
 const set = handlers.get(event)!;
 if (set.size >= MAX_LISTENERS) {
 console.warn(`[eventBus] event "${event}" too many listeners(${set.size})`);
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
 console.error(`[eventBus] event "${event}" handler error:`, err);
 }
 }
}
