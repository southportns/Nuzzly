// =============================================
// Phase 3.6: Feature Flag System
// Timeline First Architecture — Production Gradual Rollout Control
// =============================================
// Supports: global flags, per-user flags, percentage rollout, environment flags

import { createClient } from "@/lib/supabase/server"

// ─── Flag Schema ────────────────────────────────────────────────────────────

export interface FeatureFlagValue {
  enabled?: boolean
  percentage?: number
  control?: number
  timeline?: number
  failure_rate_pct?: number
  latency_p95_ms?: number
  score_drift_threshold?: number
  [key: string]: unknown
}

export interface FeatureFlag {
  flag_key: string
  flag_value: FeatureFlagValue
  description: string
  environment: "dev" | "staging" | "prod"
}

// ─── Flag Keys ──────────────────────────────────────────────────────────────

export const FLAG_KEYS = {
  TIMELINE_ENABLED: "timeline_score_enabled",
  TIMELINE_ROLLOUT_PCT: "timeline_score_rollout_percentage",
  SHADOW_ENABLED: "shadow_mode_enabled",
  AB_TEST_ENABLED: "ab_test_timeline_enabled",
  AB_TEST_RATIO: "ab_test_timeline_ratio",
  AUTO_ROLLBACK_ENABLED: "auto_rollback_enabled",
  AUTO_ROLLBACK_THRESHOLDS: "auto_rollback_thresholds",
  BLEND_WEIGHTS: "blend_weights",
  // Phase 3.8: Self-Optimizing Ranking
  BANDIT_ENABLED: "bandit_enabled",
  BANDIT_SAFETY_THRESHOLDS: "bandit_safety_thresholds",
  // Phase 3.8.1: Bandit Hardening Additions
  BANDIT_DELAYED_REWARD: "bandit_delayed_reward",
  BANDIT_FORCED_EXPLORATION: "bandit_forced_exploration",
  BANDIT_PROPENSITY_CALIBRATION: "bandit_propensity_calibration",
} as const

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS]

// ─── Flag Evaluation ────────────────────────────────────────────────────────

const flagCache = new Map<string, { value: FeatureFlagValue; expiresAt: number }>()
const CACHE_TTL_MS = 30_000 // 30s cache

export async function getFlag(key: FlagKey, environment: "dev" | "staging" | "prod" = "prod"): Promise<FeatureFlagValue> {
  const cacheKey = `${key}:${environment}`
  const cached = flagCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("feature_flags")
    .select("flag_value")
    .eq("flag_key", key)
    .eq("environment", environment)
    .single()

  if (error || !data) {
    // Safe defaults
    return getDefaultFlagValue(key)
  }

  const value = data.flag_value as FeatureFlagValue
  flagCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

export async function getFlagEnabled(key: FlagKey): Promise<boolean> {
  const value = await getFlag(key)
  return value.enabled === true
}

export async function updateFlag(key: FlagKey, value: FeatureFlagValue): Promise<FeatureFlagValue> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("update_feature_flag", {
    p_flag_key: key,
    p_flag_value: value,
    p_environment: "prod",
  })

  if (error) {
    throw new Error(`Failed to update flag ${key}: ${error.message}`)
  }

  // Invalidate cache
  flagCache.delete(`${key}:prod`)
  return data as FeatureFlagValue
}

// ─── Percentage Rollout Evaluation ──────────────────────────────────────────

export function evaluatePercentageRollout(
  userId: string | undefined,
  percentage: number
): boolean {
  if (percentage <= 0) return false
  if (percentage >= 100) return true
  if (!userId) return false

  const bucket = getUserBucket(userId)
  return bucket < percentage
}

// Deterministic hash-based bucket assignment (0-99)
function getUserBucket(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash) % 100
}

// ─── Default Flag Values ────────────────────────────────────────────────────

function getDefaultFlagValue(key: FlagKey): FeatureFlagValue {
  switch (key) {
    case FLAG_KEYS.TIMELINE_ENABLED:
      return { enabled: false }
    case FLAG_KEYS.TIMELINE_ROLLOUT_PCT:
      return { percentage: 0 }
    case FLAG_KEYS.SHADOW_ENABLED:
      return { enabled: true }
    case FLAG_KEYS.AB_TEST_ENABLED:
      return { enabled: false }
    case FLAG_KEYS.AB_TEST_RATIO:
      return { control: 90, timeline: 10 }
    case FLAG_KEYS.AUTO_ROLLBACK_ENABLED:
      return { enabled: true }
    case FLAG_KEYS.AUTO_ROLLBACK_THRESHOLDS:
      return { failure_rate_pct: 5, latency_p95_ms: 3000, score_drift_threshold: 30 }
    case FLAG_KEYS.BLEND_WEIGHTS:
      return { timeline: 0.7, review: 0.3 }
    case FLAG_KEYS.BANDIT_ENABLED:
      return { enabled: false, max_exploration_pct: 10, evaluation_window_hours: 24 }
    case FLAG_KEYS.BANDIT_SAFETY_THRESHOLDS:
      return { ctr_drop_pct: 10, conversion_drop_pct: 10, min_samples: 200, max_exploration_pct: 20 }
    case FLAG_KEYS.BANDIT_DELAYED_REWARD:
      return { enabled: true, weight: 0.3, retention_window_days: 7, max_lookback_days: 30 }
    case FLAG_KEYS.BANDIT_FORCED_EXPLORATION:
      return { enabled: true, min_exposure_pct: 5, window_hours: 24, lookback_hours: 1 }
    case FLAG_KEYS.BANDIT_PROPENSITY_CALIBRATION:
      return { enabled: true, min_samples: 100, max_calibration_ratio: 2.0 }
    default:
      return {}
  }
}
