// =============================================
// Phase 1.2.2: Write Gateway Enforcement Layer
// ALL database mutations MUST pass through this gateway.
// Direct DB writes are blocked outside: /gateway/, /migrations/, /job-runtime/
// =============================================

import { getEventBus } from "@/lib/events/event-bus"
import { createAdminClient } from "@/lib/supabase/admin"
import type { DomainEventType } from "@/lib/events/event-bus"

// ─── Types ──────────────────────────────────────────────────────────────────

export type WriteSource = "api" | "admin" | "system" | "job"

export interface WriteIntent {
id: string // correlation_id (uuid)
type: string // e.g. "CREATE_REVIEW", "UPDATE_PROFILE"
actor: string // userId or "system"
payload: Record<string, unknown>
timestamp: number // Date.now()
idempotencyKey: string // Prevent duplicate writes
source: WriteSource
metadata?: Record<string, unknown>
}

export interface WriteResult {
intentId: string
eventId: string | null
jobId: string | null
status: "accepted" | "rejected" | "duplicate"
reason?: string
}

// ─── Idempotency Store (in-memory + DB fallback) ───────────────────────────

class IdempotencyStore {
private cache = new Map<string, { result: WriteResult; expiresAt: number }>()
private readonly MAX_SIZE = 1000
private readonly TTL_MS = 86_400_000 // 24small
private _admin: ReturnType<typeof createAdminClient> | null = null

private get admin() {
if (!this._admin) {
this._admin = createAdminClient()
}
return this._admin
}

/** 清理Expired 目 */
private cleanup(): void {
const now = Date.now()
for (const [key, value] of this.cache.entries()) {
if (now >= value.expiresAt) {
this.cache.delete(key)
}
}
}

async check(key: string): Promise<WriteResult | null> {
// 清理Expired 目
this.cleanup()

// Check in-memory cache first (with TTL check)
const cached = this.cache.get(key)
if (cached && Date.now() < cached.expiresAt) {
return cached.result
}

// Check in DB
const { data } = await this.admin.from("write_idempotency_keys").select("result").eq("key", key).single()

if (data) {
const result = data.result as unknown as WriteResult
this.cache.set(key, { result, expiresAt: Date.now() + this.TTL_MS })
return result
}

return null
}

async set(key: string, result: WriteResult, ttlMs: number = this.TTL_MS): Promise<void> {
// LRU 淘汰:超past Max容量时Delete最早 目
if (this.cache.size >= this.MAX_SIZE) {
const oldestKey = this.cache.keys().next().value
if (oldestKey) {
this.cache.delete(oldestKey)
}
}

this.cache.set(key, { result, expiresAt: Date.now() + ttlMs })

// Persist to DB
await this.admin.from("write_idempotency_keys").upsert({
key,
result: result as never,
expires_at: new Date(Date.now() + ttlMs).toISOString(),
}, { onConflict: "key" })
}
}

const idempotencyStore = new IdempotencyStore()

// ─── Write Gateway ──────────────────────────────────────────────────────────

export class WriteGateway {
private _idempotencyStore: IdempotencyStore | null = null

private get idempotencyStore() {
if (!this._idempotencyStore) {
this._idempotencyStore = new IdempotencyStore()
}
return this._idempotencyStore
}

/**
* Submit a write intent through the gateway.
* Flow: validate → check idempotency → convert to Event → enqueue Job → return result
*/
async submit(intent: WriteIntent): Promise<WriteResult> {
// 1. Validate intent
const validation = this.validateIntent(intent)
if (!validation.valid) {
return {
intentId: intent.id,
eventId: null,
jobId: null,
status: "rejected",
reason: validation.reason,
}
}

// 2. Check idempotency
const existing = await this.idempotencyStore.check(intent.idempotencyKey)
if (existing) {
return {...existing, status: "duplicate" as const }
}

// 3. Convert to Event and publish
try {
const eventBus = getEventBus()
const eventId = await eventBus.publish({
event_type: intent.type as DomainEventType,
aggregate_id: this.extractAggregateId(intent),
aggregate_type: this.extractAggregateType(intent),
payload: intent.payload,
metadata: {
correlation_id: intent.id,
causation_id: (intent.metadata?.causation_id as string)?? null,
decision_id: (intent.metadata?.decision_id as string)?? null,
user_id: intent.actor === "system"? null: intent.actor,
request_id: intent.id,
timestamp: new Date(intent.timestamp).toISOString(),
version: 1,
},
})

const result: WriteResult = {
intentId: intent.id,
eventId,
jobId: null, // Job is enqueued by EventBus async handlers
status: "accepted",
}

// 4. Store idempotency key
await this.idempotencyStore.set(intent.idempotencyKey, result)

return result
} catch (error) {
return {
intentId: intent.id,
eventId: null,
jobId: null,
status: "rejected",
reason: (error as Error).message,
}
}
}

/**
* Submit a system-level write (bypasses some validation, used by jobs).
*/
async submitSystem(intent: Omit<WriteIntent, "source">): Promise<WriteResult> {
return this.submit({...intent, source: "system" })
}

// ─── Validation ───────────────────────────────────────────────────────

private validateIntent(intent: WriteIntent): { valid: boolean; reason?: string } {
if (!intent.id || typeof intent.id!== "string") {
return { valid: false, reason: "Missing or invalid intent ID" }
}
if (!intent.type || typeof intent.type!== "string") {
return { valid: false, reason: "Missing or invalid intent type" }
}
if (!intent.actor || typeof intent.actor!== "string") {
return { valid: false, reason: "Missing or invalid actor" }
}
if (!intent.idempotencyKey || typeof intent.idempotencyKey!== "string") {
return { valid: false, reason: "Missing or invalid idempotency key" }
}
if (!intent.payload || typeof intent.payload!== "object") {
return { valid: false, reason: "Missing or invalid payload" }
}

return { valid: true }
}

// ─── Aggregate Extraction ─────────────────────────────────────────────

private extractAggregateId(intent: WriteIntent): string {
// Try common patterns
return ((intent.payload.aggregate_id as string)??
(intent.payload.id as string)??
(intent.payload.review_id as string)??
(intent.payload.product_id as string)??
(intent.payload.profile_id as string)??
(intent.payload.pet_id as string)??
intent.id) // Fallback to intent ID
}

private extractAggregateType(intent: WriteIntent): string {
const typeMap: Record<string, string> = {
CREATE_REVIEW: "product_review",
UPDATE_PROFILE: "profile",
CREATE_HEALTH_RECORD: "health_record",
CREATE_PET: "pet",
UPDATE_PET: "pet",
CREATE_FOOD_USAGE_PERIOD: "food_usage",
}
return typeMap[intent.type]?? "unknown"
}
}

// ─── Singleton ───────────────────────────────────────────────────────────

let gatewayInstance: WriteGateway | null = null

export function getWriteGateway(): WriteGateway {
if (!gatewayInstance) {
gatewayInstance = new WriteGateway()
}
return gatewayInstance
}

/** Generate a deterministic idempotency key for a given operation */
export function generateIdempotencyKey(operation: string,
identifiers: Record<string, string>): string {
const sortedEntries = Object.entries(identifiers).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&")
return `${operation}:${sortedEntries}`
}
