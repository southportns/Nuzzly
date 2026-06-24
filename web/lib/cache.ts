// Lightweight TTL cache — Redis-compatible interface for MVP
// Replace with ioredis when scaling

interface CacheEntry<T> { value: T; expiresAt: number }

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private hits = 0
  private misses = 0

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) { this.misses++; return null }
    if (Date.now() > entry.expiresAt) { this.store.delete(key); this.misses++; return null }
    this.hits++
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  del(key: string): void { this.store.delete(key) }

  stats() { return { size: this.store.size, hits: this.hits, misses: this.misses, hitRate: this.hits / (this.hits + this.misses || 1) } }
}

// Singleton cache instance
const cache = new TTLCache()

// Typed helpers
export function getCached<T>(key: string): T | null { return cache.get<T>(key) }
export function setCache<T>(key: string, value: T, ttlMs: number): void { cache.set(key, value, ttlMs) }
export function invalidate(key: string): void { cache.del(key) }
export function cacheStats() { return cache.stats() }

// Cache key builders
export const CacheKeys = {
  recommendation: (petId: string) => `rec:${petId}`,
  userReputation: (userId: string) => `user_rep:${userId}`,
  productConfidence: (productId: string) => `prod_conf:${productId}`,
  riskIntel: (productId: string) => `risk:${productId}`,
}

// TTL constants (ms)
export const TTL = {
  recommendation: 5 * 60 * 1000,   // 5 min
  userReputation: 10 * 60 * 1000,   // 10 min
  productConfidence: 30 * 60 * 1000,// 30 min
  riskIntel: 15 * 60 * 1000,        // 15 min
}
