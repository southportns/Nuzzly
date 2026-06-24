// =============================================
// Phase 1.2.3: Projection Registry
// Defines all projections and their event handlers.
// Each projection maps event types to a pure reducer function.
// =============================================

import { banditStateReducer } from "./reducers/bandit-state.reducer"
import { rolloutStateReducer } from "./reducers/rollout-state.reducer"
import { healthTimelineReducer } from "./reducers/health-timeline.reducer"
import { recommendationContextReducer } from "./reducers/recommendation-context.reducer"
import { outcomeAttributionReducer } from "./reducers/outcome-attribution.reducer"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProjectionEvent {
  id: string
  type: string
  aggregateId: string
  timestamp: string
  payload: Record<string, unknown>
  correlationId?: string
  causationId?: string
}

export type ProjectionReducer<T = unknown> = (state: T, event: ProjectionEvent) => T

export interface ProjectionDefinition<T = unknown> {
  name: string
  eventTypes: string[]
  reducer: ProjectionReducer<T>
  initialState: T
}

// ─── Registry ───────────────────────────────────────────────────────────────

class ProjectionRegistry {
  private projections: Map<string, ProjectionDefinition> = new Map()
  private eventTypeIndex: Map<string, string[]> = new Map() // eventType → projection names

  register<T>(def: ProjectionDefinition<T>): void {
    this.projections.set(def.name, def)

    // Index by event type for fast lookup
    for (const eventType of def.eventTypes) {
      const list = this.eventTypeIndex.get(eventType) ?? []
      list.push(def.name)
      this.eventTypeIndex.set(eventType, list)
    }
  }

  /**
   * Find all projections that handle a given event type.
   */
  findByEventType(eventType: string): ProjectionDefinition[] {
    const names = this.eventTypeIndex.get(eventType) ?? []
    return names
      .map(name => this.projections.get(name))
      .filter((def): def is ProjectionDefinition => def !== undefined)
  }

  /**
   * Find a projection by name.
   */
  findByName(name: string): ProjectionDefinition | undefined {
    return this.projections.get(name)
  }

  /**
   * Get all registered projection names.
   */
  getAllNames(): string[] {
    return Array.from(this.projections.keys())
  }

  /**
   * Get all definitions.
   */
  getAll(): ProjectionDefinition[] {
    return Array.from(this.projections.values())
  }
}

// ─── Register Built-in Projections ─────────────────────────────────────────

export const projectionRegistry = new ProjectionRegistry()

// Bandit State Projection
projectionRegistry.register({
  name: "bandit_state_projection",
  eventTypes: [
    "BanditArmSelected",
    "BanditRewardRecorded",
    "BanditWeightAdjusted",
  ],
  reducer: banditStateReducer,
  initialState: banditStateReducer(undefined as never, {} as ProjectionEvent),
})

// Rollout State Projection
projectionRegistry.register({
  name: "rollout_state_projection",
  eventTypes: [
    "PolicyActivated",
    "PolicyDeactivated",
    "StrategyCreated",
  ],
  reducer: rolloutStateReducer,
  initialState: rolloutStateReducer(undefined as never, {} as ProjectionEvent),
})

// Health Timeline Projection
projectionRegistry.register({
  name: "health_timeline_projection",
  eventTypes: [
    "ReviewCreated",
    "ReviewUpdated",
    "TimelineEventCreated",
  ],
  reducer: healthTimelineReducer,
  initialState: healthTimelineReducer(undefined as never, {} as ProjectionEvent),
})

// Recommendation Context Projection
projectionRegistry.register({
  name: "recommendation_context_projection",
  eventTypes: [
    "ReviewCreated",
    "ReviewUpdated",
    "ReviewDeleted",
    "BanditRewardRecorded",
  ],
  reducer: recommendationContextReducer,
  initialState: recommendationContextReducer(undefined as never, {} as ProjectionEvent),
})

// Outcome Attribution Projection
projectionRegistry.register({
  name: "outcome_attribution_projection",
  eventTypes: [
    "OutcomeAttributed",
    "CausalAnalysisCompleted",
    "ReviewCreated",
  ],
  reducer: outcomeAttributionReducer,
  initialState: outcomeAttributionReducer(undefined as never, {} as ProjectionEvent),
})
