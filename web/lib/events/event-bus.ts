// =============================================
// Phase 1.2.1: Event Store + EventBus
// Event-driven architecture foundation
// =============================================

import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/database.types"

// ─── Domain Event Types ────────────────────────────────────────────────────

export type DomainEventType =
  // Review events
  | "ReviewCreated"
  | "ReviewUpdated"
  | "ReviewDeleted"
  // Bandit events
  | "BanditRewardRecorded"
  | "BanditArmSelected"
  | "BanditWeightAdjusted"
  // Policy events
  | "PolicyActivated"
  | "PolicyDeactivated"
  | "StrategyCreated"
  // Outcome events
  | "OutcomeAttributed"
  | "CausalAnalysisCompleted"
  // Decision events
  | "DecisionSnapshotCreated"
  // Timeline events
  | "TimelineGroupCreated"
  | "TimelineEventCreated"
  | "TimelineMetricsRefreshed"

export interface DomainEvent {
  event_id: string
  event_type: DomainEventType
  aggregate_id: string
  aggregate_type: string
  payload: Record<string, unknown>
  metadata: {
    correlation_id: string
    causation_id: string | null
    decision_id: string | null
    user_id: string | null
    request_id: string
    timestamp: string
    version: number
  }
}

// ─── Event Store ────────────────────────────────────────────────────────────

export class EventStore {
  private admin = createAdminClient()

  async append(event: Omit<DomainEvent, "event_id">): Promise<string> {
    const { data, error } = await (this.admin as any).rpc("event_store_append", {
      p_event_type: event.event_type,
      p_aggregate_id: event.aggregate_id as string,
      p_aggregate_type: event.aggregate_type,
      p_payload: event.payload as never,
      p_metadata: event.metadata as never,
      p_causation_id: event.metadata.causation_id as string,
      p_correlation_id: event.metadata.correlation_id as string,
      p_decision_id: event.metadata.decision_id as string,
    })

    if (error) {
      throw new Error(`[EventStore] Failed to append event: ${error.message}`)
    }

    return data as string
  }

  async queryByCorrelation(correlationId: string): Promise<DomainEvent[]> {
    const { data, error } = await (this.admin as any).rpc("event_store_query_by_correlation", {
      p_correlation_id: correlationId,
    })

    if (error) {
      throw new Error(`[EventStore] Failed to query by correlation: ${error.message}`)
    }

    return (data as unknown[]).map(this.toDomainEvent)
  }

  async queryByCausation(causationId: string): Promise<DomainEvent[]> {
    const { data, error } = await (this.admin as any).rpc("event_store_query_by_causation", {
      p_causation_id: causationId,
    })

    if (error) {
      throw new Error(`[EventStore] Failed to query by causation: ${error.message}`)
    }

    return (data as unknown[]).map(this.toDomainEvent)
  }

  async queryByDecision(decisionId: string): Promise<DomainEvent[]> {
    const { data, error } = await (this.admin as any).rpc("event_store_query_by_decision", {
      p_decision_id: decisionId,
    })

    if (error) {
      throw new Error(`[EventStore] Failed to query by decision: ${error.message}`)
    }

    return (data as unknown[]).map(this.toDomainEvent)
  }

  private toDomainEvent(row: unknown): DomainEvent {
    const r = row as Record<string, unknown>
    const metadata = (r.metadata ?? {}) as Record<string, unknown>
    return {
      event_id: r.event_id as string,
      event_type: r.event_type as DomainEventType,
      aggregate_id: r.aggregate_id as string,
      aggregate_type: r.aggregate_type as string,
      payload: (r.payload ?? {}) as Record<string, unknown>,
      metadata: {
        correlation_id: metadata.correlation_id as string,
        causation_id: (metadata.causation_id as string) ?? null,
        decision_id: (metadata.decision_id as string) ?? null,
        user_id: (metadata.user_id as string) ?? null,
        request_id: metadata.request_id as string,
        timestamp: metadata.timestamp as string,
        version: (metadata.version as number) ?? 1,
      },
    }
  }
}

// ─── Event Handler Interface ────────────────────────────────────────────────

export interface EventHandler {
  eventType: DomainEventType
  handler: (event: DomainEvent) => Promise<void>
  mode: "sync" | "async"
}

// ─── Event Bus ──────────────────────────────────────────────────────────────

export class EventBus {
  private handlers: Map<DomainEventType, EventHandler[]> = new Map()
  private eventStore = new EventStore()

  register(handler: EventHandler): void {
    const list = this.handlers.get(handler.eventType) ?? []
    list.push(handler)
    this.handlers.set(handler.eventType, list)
  }

  async publish(event: Omit<DomainEvent, "event_id">): Promise<string> {
    // 1. Persist to Event Store first (for Replay/Causal/Counterfactual)
    const eventId = await this.eventStore.append(event)

    // 2. Execute sync handlers immediately
    const syncHandlers = this.handlers.get(event.event_type)?.filter(h => h.mode === "sync") ?? []
    const syncEvent: DomainEvent = { ...event, event_id: eventId }
    await Promise.all(syncHandlers.map(h => h.handler(syncEvent)))

    // 3. Enqueue async handlers as jobs
    const asyncHandlers = this.handlers.get(event.event_type)?.filter(h => h.mode === "async") ?? []
    for (const handler of asyncHandlers) {
      await this.enqueueAsyncJob(handler, syncEvent)
    }

    return eventId
  }

  private async enqueueAsyncJob(handler: EventHandler, event: DomainEvent): Promise<void> {
    const admin = createAdminClient()

    const { error } = await (admin as any).rpc("job_enqueue", {
      p_job_type: `handle_${event.event_type}`,
      p_target_id: event.aggregate_id,
      p_target_profile_id: event.metadata.user_id,
      p_payload: event.payload,
      p_correlation_id: event.metadata.correlation_id || null,
      p_causation_id: event.metadata.causation_id || null,
      p_decision_id: event.metadata.decision_id || null,
      p_event_id: event.event_id,
      p_priority: 5,
      p_max_retries: 3,
    })

    if (error) {
      console.error(`[EventBus] Failed to enqueue job for ${handler.eventType}:`, error.message)
    }

    // Also enqueue projection update job for all events
    await this.enqueueProjectionJob(event)
  }

  /**
   * Enqueue a PROJECTION_UPDATE job to update derived state.
   * This runs asynchronously after the main handler completes.
   */
  private async enqueueProjectionJob(event: DomainEvent): Promise<void> {
    const admin = createAdminClient()

    const { error } = await (admin as any).rpc("job_enqueue", {
      p_job_type: "PROJECTION_UPDATE",
      p_target_id: event.aggregate_id,
      p_target_profile_id: null,
      p_payload: {
        eventType: event.event_type,
        eventId: event.event_id,
      },
      p_correlation_id: event.metadata.correlation_id || null,
      p_causation_id: event.metadata.causation_id || null,
      p_decision_id: event.metadata.decision_id || null,
      p_event_id: event.event_id,
      p_priority: 8, // Lower priority than main handlers
      p_max_retries: 3,
    })

    if (error) {
      console.error(`[EventBus] Failed to enqueue projection job:`, error.message)
    }
  }
}

// ─── Singleton (lazy, server-only) ──────────────────────────────────────────

let _eventBus: EventBus | null = null

export function getEventBus(): EventBus {
  if (!_eventBus) {
    _eventBus = new EventBus()
  }
  return _eventBus
}
