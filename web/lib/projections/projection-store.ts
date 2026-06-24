// =============================================
// Phase 1.2.3: Projection Storage Layer
// Persists projection states and checkpoints to database.
// Uses service_role for system-level read/write access.
// =============================================

import { createAdminClient } from "@/lib/supabase/admin"

export interface ProjectionState<T = unknown> {
  version: number
  lastProcessedEventId: string | null
  data: T
}

export interface CheckpointRecord {
  checkpointVersion: number
  eventId: string
  stateSnapshot: unknown
  createdAt: string
}

// ─── Projection Store ──────────────────────────────────────────────────────

export class ProjectionStore {
  private admin = createAdminClient()

  /**
   * Get current state for a projection.
   */
  async getState<T>(projectionName: string): Promise<ProjectionState<T>> {
    const { data, error } = await (this.admin as any).rpc("projection_get_state", {
      p_name: projectionName,
    })

    if (error) {
      throw new Error(`[ProjectionStore] Failed to get state for ${projectionName}: ${error.message}`)
    }

    if (!data || (data as unknown[]).length === 0) {
      return {
        version: 0,
        lastProcessedEventId: null,
        data: {} as T,
      }
    }

    const row = (data as unknown[])[0] as Record<string, unknown>
    return {
      version: (row.version as number) ?? 0,
      lastProcessedEventId: (row.last_processed_event_id as string) ?? null,
      data: (row.state ?? {}) as T,
    }
  }

  /**
   * Upsert projection state (idempotent).
   */
  async setState<T>(
    projectionName: string,
    version: number,
    eventId: string | null,
    state: T
  ): Promise<void> {
    const { error } = await (this.admin as any).rpc("projection_upsert_state", {
      p_name: projectionName,
      p_version: version,
      p_event_id: eventId,
      p_state: state as never,
    })

    if (error) {
      throw new Error(`[ProjectionStore] Failed to set state for ${projectionName}: ${error.message}`)
    }
  }

  /**
   * Create a checkpoint for fast rebuild.
   */
  async createCheckpoint<T>(
    projectionName: string,
    version: number,
    eventId: string,
    snapshot: T
  ): Promise<string> {
    const { data, error } = await (this.admin as any).rpc("projection_create_checkpoint", {
      p_name: projectionName,
      p_version: version,
      p_event_id: eventId,
      p_snapshot: snapshot as never,
    })

    if (error) {
      throw new Error(`[ProjectionStore] Failed to create checkpoint for ${projectionName}: ${error.message}`)
    }

    return data as string
  }

  /**
   * Get latest checkpoint for a projection.
   */
  async getLatestCheckpoint(projectionName: string): Promise<CheckpointRecord | null> {
    const { data, error } = await (this.admin as any).rpc("projection_get_latest_checkpoint", {
      p_name: projectionName,
    })

    if (error) {
      throw new Error(`[ProjectionStore] Failed to get checkpoint for ${projectionName}: ${error.message}`)
    }

    if (!data || (data as unknown[]).length === 0) {
      return null
    }

    const row = (data as unknown[])[0] as Record<string, unknown>
    return {
      checkpointVersion: (row.checkpoint_version as number) ?? 0,
      eventId: row.event_id as string,
      stateSnapshot: row.state_snapshot,
      createdAt: row.created_at as string,
    }
  }

  /**
   * Reset a projection — deletes state and all checkpoints.
   */
  async reset(projectionName: string): Promise<void> {
    const { error } = await (this.admin as any).rpc("projection_reset", {
      p_name: projectionName,
    })

    if (error) {
      throw new Error(`[ProjectionStore] Failed to reset ${projectionName}: ${error.message}`)
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const projectionStore = new ProjectionStore()
