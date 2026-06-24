/**
 * Type-safe Supabase RPC wrappers
 * Eliminates `as any` casting for RPC calls
 */

import { SupabaseClient } from "@supabase/supabase-js"

/** Generic RPC response wrapper */
export interface RPCResponse<T> {
  data: T | null
  error: { message: string } | null
}

/** Typed RPC caller for specific functions */
export function createRPCCaller(client: SupabaseClient) {
  return {
    // Timeline functions
    async getProductTimelineStats(productId: string) {
      return client.rpc("get_product_timeline_stats", { p_product_id: productId })
    },

    async buildTimelineGroup(params: {
      p_product_id: string
      p_profiles: unknown[]
      p_timeline_stats: unknown
    }) {
      return client.rpc("build_timeline_group", params)
    },

    async upsertTimelineEvents(params: {
      p_timeline_group_id: string
      p_events: unknown[]
    }) {
      return client.rpc("upsert_timeline_events", params)
    },

    async calculateTimelineTrustScore(params: {
      p_timeline_group_id: string
    }) {
      return client.rpc("calculate_timeline_trust_score", params)
    },

    async backfillTimelineGroups(params: {
      p_review_ids?: string[]
    }) {
      return client.rpc("backfill_timeline_groups", params)
    },

    // Outcome functions
    async getOutcomeIntel(params: {
      p_pet_timeline_id?: string
      p_product_id?: string
    }) {
      return client.rpc("pflid.get_outcome_intel", params)
    },

    async recommendFoodByOutcome(params: {
      p_pet_timeline_id: string
    }) {
      return client.rpc("pflid.recommend_food_by_outcome", params)
    },

    async matchOutcomeForPet(params: {
      p_pet_id: string
      p_top_k?: number
    }) {
      return client.rpc("pflid.match_outcome_for_pet", params)
    },

    async buildOutcomeSample(params: {
      p_min_review_count?: number
      p_sample_size?: number
    }) {
      return client.rpc("pflid.build_outcome_sample", params)
    },

    async buildOutcomeDataset(params: {
      p_lookback_days?: number
    }) {
      return client.rpc("pflid.build_outcome_dataset", params)
    },

    async incrementalOutcomeDataset(params: {
      p_since?: string
    }) {
      return client.rpc("pflid.incremental_outcome_dataset", params)
    },

    // Score functions
    async calculateLongitudinalScore(params: {
      p_pet_timeline_id: string
    }) {
      return client.rpc("pflid.calculate_longitudinal_score", params)
    },

    async scoreProductForPetTimeline(params: {
      p_product_id: string
      p_pet_timeline_id: string
    }) {
      return client.rpc("pflid.score_product_for_pet_timeline", params)
    },

    async calculateScoreComparison(params: {
      p_segment?: string
      p_include_shadow?: boolean
    }) {
      return client.rpc("pflid.calculate_score_comparison", params)
    },

    async backfillScoreComparison() {
      return client.rpc("pflid.backfill_score_comparison")
    },

    async getScoreComparisonReport(params: {
      p_segment?: string
    }) {
      return client.rpc("pflid.get_score_comparison_report", params)
    },

    // Metrics functions
    async generateTimelineMetrics(params: {
      p_window_days?: number
    }) {
      return client.rpc("pflid.generate_timeline_metrics", params)
    },

    async backfillTimelineMetrics(params: {
      p_lookback_days?: number
    }) {
      return client.rpc("pflid.backfill_timeline_metrics", params)
    },

    // Rollout functions
    async getRolloutStatus() {
      return client.rpc("get_rollout_status")
    },

    async updateRolloutPercentage(params: {
      p_flag_key: string
      p_new_percentage: number
    }) {
      return client.rpc("update_rollout_percentage", params)
    },

    async executeRollback(params: {
      p_target_state: string
      p_auto_revert_after_hours?: number
    }) {
      return client.rpc("execute_rollback", params)
    },

    // Job functions
    async jobEnqueue(params: {
      p_job_type: string
      p_target_profile_id?: string
      p_target_id?: string
      p_priority?: number
      p_max_retries?: number
      p_payload?: unknown
    }) {
      return client.rpc("job_enqueue", params)
    },

    // Event store functions
    async eventStoreAppend(params: {
      p_aggregate_type: string
      p_aggregate_id: string
      p_event_type: string
      p_event_data: unknown
      p_correlation_id?: string
      p_causation_id?: string
      p_decision_id?: string
    }) {
      return client.rpc("event_store_append", params)
    },

    async eventStoreQueryByCorrelation(params: {
      p_correlation_id: string
    }) {
      return client.rpc("event_store_query_by_correlation", params)
    },

    async eventStoreQueryByCausation(params: {
      p_causation_id: string
    }) {
      return client.rpc("event_store_query_by_causation", params)
    },

    async eventStoreQueryByDecision(params: {
      p_decision_id: string
    }) {
      return client.rpc("event_store_query_by_decision", params)
    },

    // Projection functions
    async projectionGetState(params: {
      p_projection_name: string
      p_key?: string
    }) {
      return client.rpc("projection_get_state", params)
    },

    async projectionUpsertState(params: {
      p_projection_name: string
      p_key: string
      p_state: unknown
    }) {
      return client.rpc("projection_upsert_state", params)
    },

    async projectionCreateCheckpoint(params: {
      p_projection_name: string
      p_event_id: string
      p_event_offset: number
    }) {
      return client.rpc("projection_create_checkpoint", params)
    },

    async projectionGetLatestCheckpoint(params: {
      p_projection_name: string
    }) {
      return client.rpc("projection_get_latest_checkpoint", params)
    },

    async projectionReset(params: {
      p_projection_name: string
    }) {
      return client.rpc("projection_reset", params)
    },

    // Feature flag functions
    async updateFeatureFlag(params: {
      p_flag_key: string
      p_flag_value: boolean | string | number
    }) {
      return client.rpc("update_feature_flag", params)
    },

    // Arm exposure functions
    async armExposureBump(params: {
      p_segment: string
      p_arm_id: string
      p_bump_count: number
    }) {
      return client.rpc("arm_exposure_bump", params)
    },
  }
}

export type RPCCaller = ReturnType<typeof createRPCCaller>
