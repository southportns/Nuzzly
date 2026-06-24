// =============================================
// Rollout State Reducer (Pure Function)
// Handles: POLICY_ACTIVATED, POLICY_DEACTIVATED, STRATEGY_CREATED
// Output: feature flags, rollout percentages, user buckets
// =============================================

import type { ProjectionEvent, ProjectionReducer } from "../projection-registry"

export interface RolloutStateProjection {
  flags: Record<string, boolean>
  rolloutPercent: Record<string, number>
  buckets: Record<string, "control" | "treatment">
  activePolicies: string[]
  lastUpdated: string | null
}

const INITIAL_STATE: RolloutStateProjection = {
  flags: {},
  rolloutPercent: {},
  buckets: {},
  activePolicies: [],
  lastUpdated: null,
}

export const rolloutStateReducer: ProjectionReducer<RolloutStateProjection> = (
  state: RolloutStateProjection | undefined,
  event: ProjectionEvent
): RolloutStateProjection => {
  const s = state ?? INITIAL_STATE

  switch (event.type) {
    case "PolicyActivated": {
      const policyId = (event.payload.policy_id as string) ?? event.aggregateId
      const rolloutPercent = (event.payload.rollout_percent as number) ?? 100
      const flagKey = (event.payload.flag_key as string) ?? policyId

      const isActive = s.activePolicies.includes(policyId)
      const newActive = isActive ? s.activePolicies : [...s.activePolicies, policyId]

      return {
        ...s,
        flags: {
          ...s.flags,
          [flagKey]: true,
        },
        rolloutPercent: {
          ...s.rolloutPercent,
          [policyId]: rolloutPercent,
        },
        activePolicies: newActive,
        lastUpdated: event.timestamp,
      }
    }

    case "PolicyDeactivated": {
      const policyId = (event.payload.policy_id as string) ?? event.aggregateId
      const flagKey = (event.payload.flag_key as string) ?? policyId

      return {
        ...s,
        flags: {
          ...s.flags,
          [flagKey]: false,
        },
        activePolicies: s.activePolicies.filter(id => id !== policyId),
        lastUpdated: event.timestamp,
      }
    }

    case "StrategyCreated": {
      const strategyId = (event.payload.strategy_id as string) ?? event.aggregateId
      const bucket = (event.payload.bucket as "control" | "treatment") ?? "treatment"
      const userId = (event.payload.user_id as string) ?? event.aggregateId

      return {
        ...s,
        buckets: {
          ...s.buckets,
          [`${strategyId}:${userId}`]: bucket,
        },
        lastUpdated: event.timestamp,
      }
    }

    default:
      return s
  }
}
