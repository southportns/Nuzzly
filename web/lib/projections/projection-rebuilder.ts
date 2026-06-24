// =============================================
// Phase 1.2.3: Projection Rebuilder
// Replays events from Event Store to rebuild projection state.
// Supports full rebuild, partial rebuild, and replay by correlation/aggregate.
// =============================================

import { createAdminClient } from "@/lib/supabase/admin"
import { projectionRegistry, type ProjectionDefinition, type ProjectionEvent } from "./projection-registry"
import { projectionStore } from "./projection-store"

export interface RebuildResult {
  projectionName: string
  eventsProcessed: number
  finalVersion: number
  durationMs: number
}

export interface ReplayResult {
  aggregateId: string
  eventsProcessed: number
  finalState: unknown
}

// ─── Projection Rebuilder ──────────────────────────────────────────────────

export class ProjectionRebuilder {
  private admin = createAdminClient()

  /**
   * Full rebuild: reset and replay all events for a projection.
   */
  async rebuild(projectionName: string): Promise<RebuildResult> {
    const def = projectionRegistry.findByName(projectionName)
    if (!def) {
      throw new Error(`[ProjectionRebuilder] Unknown projection: ${projectionName}`)
    }

    const start = Date.now()

    // 1. Reset existing state
    await projectionStore.reset(projectionName)

    // 2. Try to use checkpoint as starting point
    const checkpoint = await projectionStore.getLatestCheckpoint(projectionName)
    const events = checkpoint
      ? await this.loadEventsAfter(def, checkpoint.createdAt)
      : await this.loadAllEvents(def)

    // 3. If checkpoint exists, start from checkpoint state
    let state = checkpoint
      ? (checkpoint.stateSnapshot ?? def.initialState)
      : def.initialState
    let version = checkpoint?.checkpointVersion ?? 0

    // 4. Replay events sequentially
    for (const event of events) {
      state = def.reducer(state, event)
      version++
    }

    // 5. Persist final state
    const lastEventId = events.length > 0 ? events[events.length - 1].id : null
    await projectionStore.setState(projectionName, version, lastEventId, state)

    const duration = Date.now() - start

    return {
      projectionName,
      eventsProcessed: events.length,
      finalVersion: version,
      durationMs: duration,
    }
  }

  /**
   * Rebuild all registered projections.
   */
  async rebuildAll(): Promise<RebuildResult[]> {
    const results: RebuildResult[] = []
    const projections = projectionRegistry.getAll()

    for (const def of projections) {
      const result = await this.rebuild(def.name)
      results.push(result)
    }

    return results
  }

  /**
   * Replay events for a specific aggregateId.
   * Returns the final computed state without persisting.
   */
  async replayByAggregate(
    projectionName: string,
    aggregateId: string
  ): Promise<ReplayResult> {
    const def = projectionRegistry.findByName(projectionName)
    if (!def) {
      throw new Error(`[ProjectionRebuilder] Unknown projection: ${projectionName}`)
    }

    // Load events for this aggregate
    const { data, error } = await (this.admin as any)
      .from("event_store")
      .select("*")
      .eq("aggregate_id", aggregateId)
      .in("event_type", def.eventTypes)
      .order("created_at", { ascending: true })

    if (error) {
      throw new Error(`[ProjectionRebuilder] Failed to load events: ${error.message}`)
    }

    const events = (data ?? []).map(this.toProjectionEvent)

    // Replay from initial state
    let state = def.initialState
    for (const event of events) {
      state = def.reducer(state, event)
    }

    return {
      aggregateId,
      eventsProcessed: events.length,
      finalState: state,
    }
  }

  /**
   * Replay events by correlationId.
   * Useful for debugging causal chains.
   */
  async replayByCorrelation(correlationId: string): Promise<ProjectionEvent[]> {
    const { data, error } = await (this.admin as any)
      .from("event_store")
      .select("*")
      .eq("metadata->>correlation_id", correlationId)
      .order("created_at", { ascending: true })

    if (error) {
      throw new Error(`[ProjectionRebuilder] Failed to load events: ${error.message}`)
    }

    return (data ?? []).map(this.toProjectionEvent)
  }

  /**
   * Partial rebuild: only process events after a specific version.
   */
  async rebuildFromVersion(
    projectionName: string,
    fromVersion: number
  ): Promise<RebuildResult> {
    const def = projectionRegistry.findByName(projectionName)
    if (!def) {
      throw new Error(`[ProjectionRebuilder] Unknown projection: ${projectionName}`)
    }

    const start = Date.now()

    // Load current state
    const currentState = await projectionStore.getState(projectionName)

    // If current version >= fromVersion, only process new events
    if (currentState.version >= fromVersion) {
      // Find checkpoint at or after fromVersion
      const checkpoint = await projectionStore.getLatestCheckpoint(projectionName)
      const events = checkpoint
        ? await this.loadEventsAfter(def, checkpoint.createdAt)
        : await this.loadAllEvents(def)

      let state = currentState.data
      let version = currentState.version

      for (const event of events) {
        state = def.reducer(state, event)
        version++
      }

      const lastEventId = events.length > 0 ? events[events.length - 1].id : null
      await projectionStore.setState(projectionName, version, lastEventId, state)

      return {
        projectionName,
        eventsProcessed: events.length,
        finalVersion: version,
        durationMs: Date.now() - start,
      }
    }

    // Otherwise do full rebuild
    return this.rebuild(projectionName)
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private async loadAllEvents(def: ProjectionDefinition): Promise<ProjectionEvent[]> {
    const { data, error } = await (this.admin as any)
      .from("event_store")
      .select("*")
      .in("event_type", def.eventTypes)
      .order("created_at", { ascending: true })

    if (error) {
      throw new Error(`[ProjectionRebuilder] Failed to load events: ${error.message}`)
    }

    return (data ?? []).map(this.toProjectionEvent)
  }

  private async loadEventsAfter(
    def: ProjectionDefinition,
    afterTimestamp: string
  ): Promise<ProjectionEvent[]> {
    const { data, error } = await (this.admin as any)
      .from("event_store")
      .select("*")
      .in("event_type", def.eventTypes)
      .gt("created_at", afterTimestamp)
      .order("created_at", { ascending: true })

    if (error) {
      throw new Error(`[ProjectionRebuilder] Failed to load events after checkpoint: ${error.message}`)
    }

    return (data ?? []).map(this.toProjectionEvent)
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

export const projectionRebuilder = new ProjectionRebuilder()
