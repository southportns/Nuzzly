// =============================================
// Phase 1.2.3: Projection Engine Core
// Converts Event Store events into deterministic, replayable application state.
// Reducers are pure functions — same events always produce same state.
// =============================================

import { createAdminClient } from "@/lib/supabase/admin"
import { projectionRegistry, type ProjectionDefinition, type ProjectionEvent } from "./projection-registry"
import { projectionStore } from "./projection-store"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProjectionState<T = unknown> {
  version: number
  lastProcessedEventId: string | null
  data: T
}

export interface ProcessResult {
  projectionName: string
  version: number
  eventId: string
  processed: boolean
}

// ─── Projection Engine ─────────────────────────────────────────────────────

export class ProjectionEngine {
  private admin = createAdminClient()

  /**
   * Process a single event through all matching projections.
   * Each projection's reducer is a pure function: state' = reducer(state, event)
   */
  async processEvent(event: ProjectionEvent): Promise<ProcessResult[]> {
    const results: ProcessResult[] = []

    // Find all projections that handle this event type
    const matchingProjections = projectionRegistry.findByEventType(event.type)

    for (const def of matchingProjections) {
      const result = await this.processProjection(def, event)
      results.push(result)
    }

    return results
  }

  /**
   * Process event for a single projection.
   */
  private async processProjection(
    def: ProjectionDefinition,
    event: ProjectionEvent
  ): Promise<ProcessResult> {
    // 1. Load current state
    const currentState = await projectionStore.getState(def.name)

    // 2. Skip if event already processed (idempotency)
    if (currentState.lastProcessedEventId === event.id) {
      return {
        projectionName: def.name,
        version: currentState.version,
        eventId: event.id,
        processed: false,
      }
    }

    // 3. Apply reducer (pure function)
    const newData = def.reducer(currentState.data, event)

    // 4. Persist new state
    const newVersion = currentState.version + 1
    await projectionStore.setState(def.name, newVersion, event.id, newData)

    // 5. Create checkpoint every 100 versions for fast rebuild
    if (newVersion % 100 === 0) {
      await projectionStore.createCheckpoint(def.name, newVersion, event.id, newData)
    }

    return {
      projectionName: def.name,
      version: newVersion,
      eventId: event.id,
      processed: true,
    }
  }

  /**
   * Get current state for a projection.
   */
  async getState(projectionName: string): Promise<ProjectionState> {
    return projectionStore.getState(projectionName)
  }

  /**
   * Reset a projection — deletes state and checkpoints.
   */
  async resetProjection(projectionName: string): Promise<void> {
    await projectionStore.reset(projectionName)
  }

  /**
   * Rebuild a projection from scratch by replaying all events.
   */
  async rebuildProjection(projectionName: string): Promise<{ version: number; eventsProcessed: number }> {
    const def = projectionRegistry.findByName(projectionName)
    if (!def) {
      throw new Error(`[ProjectionEngine] Unknown projection: ${projectionName}`)
    }

    // 1. Reset existing state
    await projectionStore.reset(projectionName)

    // 2. Load all events matching this projection's event types
    const events = await this.loadEventsForProjection(def)

    // 3. Replay events sequentially
    let state = def.initialState
    let version = 0
    let lastEventId: string | null = null

    for (const event of events) {
      state = def.reducer(state, event)
      version++
      lastEventId = event.id
    }

    // 4. Persist final state
    if (version > 0) {
      await projectionStore.setState(projectionName, version, lastEventId, state)
    } else {
      // Initialize with empty state
      await projectionStore.setState(projectionName, 0, null, def.initialState)
    }

    return { version, eventsProcessed: events.length }
  }

  /**
   * Load events from Event Store for a projection's event types.
   * Uses latest checkpoint as starting point if available.
   */
  private async loadEventsForProjection(def: ProjectionDefinition): Promise<ProjectionEvent[]> {
    // Check for checkpoint to skip old events
    const checkpoint = await projectionStore.getLatestCheckpoint(def.name)

    let events: ProjectionEvent[] = []

    if (checkpoint) {
      // Load events after checkpoint
      const { data, error } = await this.admin
        .from("event_store")
        .select("*")
        .in("event_type", def.eventTypes)
        .gt("created_at", checkpoint.createdAt)
        .order("created_at", { ascending: true })

      if (error) {
        throw new Error(`[ProjectionEngine] Failed to load events after checkpoint: ${error.message}`)
      }

      events = (data ?? []).map(this.toProjectionEvent)
    } else {
      // Load all events
      const { data, error } = await this.admin
        .from("event_store")
        .select("*")
        .in("event_type", def.eventTypes)
        .order("created_at", { ascending: true })

      if (error) {
        throw new Error(`[ProjectionEngine] Failed to load events: ${error.message}`)
      }

      events = (data ?? []).map(this.toProjectionEvent)
    }

    return events
  }

  private toProjectionEvent(row: Record<string, unknown>): ProjectionEvent {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>
    return {
      id: row.event_id as string,
      type: row.event_type as string,
      aggregateId: row.aggregate_id as string,
      timestamp: (metadata.timestamp as string) ?? new Date().toISOString(),
      payload: (row.payload ?? {}) as Record<string, unknown>,
      correlationId: (metadata.correlation_id as string) ?? undefined,
      causationId: (metadata.causation_id as string) ?? undefined,
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const projectionEngine = new ProjectionEngine()
