// =============================================
// Phase 1.2.3: Projection Validator
// Validates projection consistency, detects drift and missing events.
// =============================================

import { createAdminClient } from "@/lib/supabase/admin"
import { projectionRegistry } from "./projection-registry"
import { projectionStore } from "./projection-store"
import { projectionRebuilder } from "./projection-rebuilder"

export interface ProjectionValidation {
  projection: string
  isConsistent: boolean
  driftScore: number          // 0 = perfect, 1 = completely drifted
  missingEvents: string[]     // Event IDs that should have been processed
  suspiciousStates: Record<string, unknown>[]
  version: number
  lastProcessedEventId: string | null
  totalEventsInStore: number
  eventsProcessed: number
}

// ─── Projection Validator ─────────────────────────────────────────────────

export class ProjectionValidator {
  private admin = createAdminClient()

  /**
   * Validate a single projection for consistency.
   */
  async validate(projectionName: string): Promise<ProjectionValidation> {
    const def = projectionRegistry.findByName(projectionName)
    if (!def) {
      throw new Error(`[ProjectionValidator] Unknown projection: ${projectionName}`)
    }

    // 1. Get current projection state
    const currentState = await projectionStore.getState(projectionName)

    // 2. Count total events in store for this projection's event types
    const { count: totalEvents, error: countError } = await (this.admin as any)
      .from("event_store")
      .select("*", { count: "exact", head: true })
      .in("event_type", def.eventTypes)

    if (countError) {
      throw new Error(`[ProjectionValidator] Failed to count events: ${countError.message}`)
    }

    // 3. Check for missing events (events after lastProcessedEventId)
    const missingEvents = await this.findMissingEvents(def, currentState.lastProcessedEventId)

    // 4. Check for suspicious states (null values, negative counts, etc.)
    const suspiciousStates = this.detectSuspiciousStates(currentState.data)

    // 5. Calculate drift score
    const driftScore = this.calculateDriftScore(
      totalEvents ?? 0,
      currentState.version,
      missingEvents.length
    )

    return {
      projection: projectionName,
      isConsistent: missingEvents.length === 0 && driftScore < 0.1,
      driftScore,
      missingEvents,
      suspiciousStates,
      version: currentState.version,
      lastProcessedEventId: currentState.lastProcessedEventId,
      totalEventsInStore: totalEvents ?? 0,
      eventsProcessed: currentState.version,
    }
  }

  /**
   * Validate all registered projections.
   */
  async validateAll(): Promise<ProjectionValidation[]> {
    const results: ProjectionValidation[] = []
    const projections = projectionRegistry.getAllNames()

    for (const name of projections) {
      const result = await this.validate(name)
      results.push(result)
    }

    return results
  }

  /**
   * Full consistency check: rebuild and compare.
   * This is expensive — use only for debugging or scheduled checks.
   */
  async fullConsistencyCheck(projectionName: string): Promise<{
    before: unknown
    after: unknown
    isIdentical: boolean
    rebuildDurationMs: number
  }> {
    const before = await projectionStore.getState(projectionName)

    // Rebuild from scratch
    const rebuildResult = await projectionRebuilder.rebuild(projectionName)

    const after = await projectionStore.getState(projectionName)

    // Deep compare
    const isIdentical = JSON.stringify(before.data) === JSON.stringify(after.data)

    return {
      before: before.data,
      after: after.data,
      isIdentical,
      rebuildDurationMs: rebuildResult.durationMs,
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private async findMissingEvents(
    def: { name: string; eventTypes: string[] },
    lastProcessedEventId: string | null
  ): Promise<string[]> {
    if (!lastProcessedEventId) {
      // No events processed yet — check if there are any events at all
      const { data, error } = await (this.admin as any)
        .from("event_store")
        .select("event_id")
        .in("event_type", def.eventTypes)
        .limit(100)
        .order("created_at", { ascending: true })

      if (error) return []
      return (data ?? []).map((r: Record<string, unknown>) => r.event_id as string)
    }

    // Get the timestamp of last processed event
    const { data: lastEvent, error: lastError } = await (this.admin as any)
      .from("event_store")
      .select("created_at")
      .eq("event_id", lastProcessedEventId)
      .single()

    if (lastError || !lastEvent) return []

    // Find events after that timestamp
    const { data, error } = await (this.admin as any)
      .from("event_store")
      .select("event_id")
      .in("event_type", def.eventTypes)
      .gt("created_at", (lastEvent as Record<string, unknown>).created_at as string)
      .order("created_at", { ascending: true })

    if (error) return []
    return (data ?? []).map((r: Record<string, unknown>) => r.event_id as string)
  }

  private detectSuspiciousStates(data: unknown): Record<string, unknown>[] {
    const suspicious: Record<string, unknown>[] = []

    if (!data || typeof data !== "object") return suspicious

    const obj = data as Record<string, unknown>

    // Check for negative counts
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "number" && value < 0) {
        suspicious.push({ field: key, value, reason: "negative_count" })
      }
      if (typeof value === "number" && !Number.isFinite(value)) {
        suspicious.push({ field: key, value, reason: "non_finite_number" })
      }
    }

    // Check for empty collections that should have data
    if (Array.isArray(obj.arms) && (obj.arms as unknown[]).length === 0) {
      suspicious.push({ field: "arms", reason: "empty_arms_collection" })
    }

    return suspicious
  }

  private calculateDriftScore(
    totalEvents: number,
    processedVersion: number,
    missingCount: number
  ): number {
    if (totalEvents === 0) return 0

    // Drift = (missing events + version gap) / total events
    const versionGap = Math.max(0, totalEvents - processedVersion)
    const totalMissing = missingCount + versionGap

    return Math.min(1, totalMissing / totalEvents)
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const projectionValidator = new ProjectionValidator()
