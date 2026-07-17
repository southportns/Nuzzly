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
  id: string                    // correlation_id (uuid)
  type: string                  // e.g. "CREATE_REVIEW", "UPDATE_PROFILE"
  actor: string                 // userId or "system"
  payload: Record<string, unknown>
  timestamp: number             // Date.now()
  idempotencyKey: string        // Prevent duplicate writes
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
  private cache = new Map<string, WriteResult>()
  private _admin: ReturnType<typeof createAdminClient> | null = null

  private get admin() {
    if (!this._admin) {
      this._admin = createAdminClient()
    }
    return this._admin
  }

  async check(key: string): Promise<WriteResult | null> {
    // Check in-memory cache first
    const cached = this.cache.get(key)
    if (cached) return cached

    // Check in DB
    const { data } = await this.admin
      .from("write_idempotency_keys")
      .select("result")
      .eq("key", key)
      .single()

    if (data) {
      const result = data.result as WriteResult
      this.cache.set(key, result)
      return result
    }

    return null
  }

  async set(key: string, result: WriteResult, ttlMs: number = 86_400_000): Promise<void> {
    this.cache.set(key, result)

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
      return { ...existing, status: "duplicate" as const }
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
          causation_id: (intent.metadata?.causation_id as string) ?? null,
          decision_id: (intent.metadata?.decision_id as string) ?? null,
          user_id: intent.actor === "system" ? null : intent.actor,
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
    return this.submit({ ...intent, source: "system" })
  }

  // ─── Validation ───────────────────────────────────────────────────────

  private validateIntent(intent: WriteIntent): { valid: boolean; reason?: string } {
    if (!intent.id || typeof intent.id !== "string") {
      return { valid: false, reason: "Missing or invalid intent ID" }
    }
    if (!intent.type || typeof intent.type !== "string") {
      return { valid: false, reason: "Missing or invalid intent type" }
    }
    if (!intent.actor || typeof intent.actor !== "string") {
      return { valid: false, reason: "Missing or invalid actor" }
    }
    if (!intent.idempotencyKey || typeof intent.idempotencyKey !== "string") {
      return { valid: false, reason: "Missing or invalid idempotency key" }
    }
    if (!intent.payload || typeof intent.payload !== "object") {
      return { valid: false, reason: "Missing or invalid payload" }
    }

    return { valid: true }
  }

  // ─── Aggregate Extraction ─────────────────────────────────────────────

  private extractAggregateId(intent: WriteIntent): string {
    // Try common patterns
    return (
      (intent.payload.aggregate_id as string) ??
      (intent.payload.id as string) ??
      (intent.payload.review_id as string) ??
      (intent.payload.product_id as string) ??
      (intent.payload.profile_id as string) ??
      (intent.payload.pet_id as string) ??
      intent.id // Fallback to intent ID
    )
  }

  private extractAggregateType(intent: WriteIntent): string {
    return (
      (intent.payload.aggregate_type as string) ??
      this.typeToAggregateType(intent.type)
    )
  }

  private typeToAggregateType(type: string): string {
    const map: Record<string, string> = {
      CREATE_REVIEW: "Review",
      UPDATE_REVIEW: "Review",
      DELETE_REVIEW: "Review",
      CREATE_REVIEW_VOUCHER: "ReviewVoucher",
      CREATE_FOLLOWUP_ENTRY: "FollowupEntry",
      FLAG_USER: "Profile",
      UNFLAG_USER: "Profile",
      GRANT_ADMIN: "Profile",
      REVOKE_ADMIN: "Profile",
      CREATE_PET_EVENT: "PetEvent",
      UPDATE_PROFILE: "Profile",
      CREATE_PRODUCT: "Product",
      UPDATE_PRODUCT: "Product",
      CREATE_BOOKMARK: "Bookmark",
      DELETE_BOOKMARK: "Bookmark",
      CREATE_HEALTH_RECORD: "HealthRecord",
      UPDATE_HEALTH_RECORD: "HealthRecord",
      DEACTIVATE_HEALTH_MEMORY: "HealthMemory",
      CREATE_PET_ATTACHMENT: "PetAttachment",
      DELETE_PET_ATTACHMENT: "PetAttachment",
      CREATE_DISEASE_RECORD: "DiseaseRecord",
      UPDATE_DISEASE_RECORD: "DiseaseRecord",
      DELETE_DISEASE_RECORD: "DiseaseRecord",
      CREATE_MEDICATION_RECORD: "MedicationRecord",
      UPDATE_MEDICATION_RECORD: "MedicationRecord",
      DELETE_MEDICATION_RECORD: "MedicationRecord",
      CREATE_FEEDBACK: "Feedback",
      CREATE_METRICS_EVENT: "MetricsEvent",
      CREATE_BANDIT_REWARD: "BanditReward",
      UPDATE_BANDIT_ARM: "BanditArm",
      CREATE_POLICY: "Policy",
      UPDATE_POLICY: "Policy",
      ARCHIVE_POLICY: "Policy",
      CREATE_STRATEGY: "Strategy",
      UPDATE_STRATEGY: "Strategy",
      RETIRE_STRATEGY: "Strategy",
      CREATE_TIMELINE_EVENT: "TimelineEvent",
      UPDATE_TIMELINE_GROUP: "TimelineGroup",
      CREATE_OUTCOME: "Outcome",
      CREATE_CAUSAL_CHAIN: "CausalChain",
      CREATE_DECISION_TRACE: "DecisionTrace",
      CREATE_COUNTERFACTUAL: "Counterfactual",
      CREATE_EXPLORATION_SAFETY_LOG: "ExplorationSafetyLog",
      CREATE_CONSTRAINT_VIOLATION: "ConstraintViolation",
      CREATE_AGENT_DECISION_LOG: "AgentDecisionLog",
      CREATE_TRUST_ARBITRATION_LOG: "TrustArbitrationLog",
      CREATE_RECOMMENDATION_TRACE_LOG: "RecommendationTraceLog",
      // Phase 1.2.2 (P1): Client-side mutations
      MARK_NOTIFICATION_READ: "Notification",
      CREATE_DIET_LOG: "DietLog",
      UPDATE_PET_WEIGHT: "Pet",
      CREATE_PET_ALLERGY: "PetAllergy",
      DELETE_PET_ALLERGY: "PetAllergy",
      UPSERT_ENVIRONMENT_PROFILE: "EnvironmentProfile",
      UPDATE_FOLLOWUP_SCHEDULE: "FollowupSchedule",
      CREATE_INTENT_EVENT: "IntentEvent",
    }
    return map[type] ?? "Unknown"
  }
}

// ─── Singleton (lazy, server-only) ──────────────────────────────────────────

let _writeGateway: WriteGateway | null = null

export function getWriteGateway(): WriteGateway {
  if (!_writeGateway) {
    _writeGateway = new WriteGateway()
  }
  return _writeGateway
}

// ─── Helper: Generate Idempotency Key ───────────────────────────────────────

import { createHash } from "crypto"

export function generateIdempotencyKey(type: string, payload: Record<string, unknown>): string {
  // 使用 SHA-256 替代 DJB2 变种哈希，避免 32-bit 哈希碰撞导致幂等键误判
  const stable = JSON.stringify({ type, ...payload })
  const hash = createHash("sha256").update(stable).digest("hex").slice(0, 32)
  return `ik_${type}_${hash}`
}
