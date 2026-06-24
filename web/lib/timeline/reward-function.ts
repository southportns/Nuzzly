// =============================================
// Phase 3.8: Reward Function Engine
// Timeline First Architecture — Unified Reward Signal
// =============================================
// Combines engagement + conversion + quality signals into a single
// normalized reward in [0, 1].  Applies time-decay and segment-aware
// weight multipliers so the bandit learns per-traffic-type behavior.
//
// Mathematical form:
//   base = w_ctr·CTR + w_conv·Conv + w_dwell·DwellNorm
//        - w_skip·Skip - w_bounce·Bounce
//   reward = clip( base - w_vol·RankVolatility, 0, 1 )
//          · timeDecay(ageDays, halfLife)
//          · segmentMultiplier(segment, base)
//
// Reward is computed in two ways:
//   1. computeRewardFromSignals()  — used at observation time, called
//      from the impression-tracking hook (real-time, single request).
//   2. computeRewardFromHistory()  — used by the nearline aggregator
//      to re-score past decisions from aggregated metrics.

import type { SegmentKey } from "@/lib/timeline/bandit-policy"

// ─── Configuration ─────────────────────────────────────────────────────────

export interface RewardWeights {
  ctr: number
  conversion: number
  dwell: number
  skip: number
  bounce: number
  volatility: number
}

export const DEFAULT_REWARD_WEIGHTS: RewardWeights = {
  ctr: 0.35,
  conversion: 0.35,
  dwell: 0.15,
  skip: 0.08,
  bounce: 0.05,
  volatility: 0.02,
}

export const TIME_DECAY_HALF_LIFE_DAYS = 7

// ─── Signal Inputs ─────────────────────────────────────────────────────────

export interface EngagementSignals {
  /** Click-through rate for the impression (0-1). */
  ctr: number
  /** Conversion rate — purchase / add-to-cart / signup (0-1). */
  conversion: number
  /** Dwell time on the recommended product, in milliseconds. */
  dwellTimeMs: number
  /** Skip rate — user scrolled past without click (0-1). */
  skipRate: number
  /** Bounce rate — user left the page entirely after impression (0-1). */
  bounceRate: number
  /** Rank volatility penalty — 0 = stable, 1 = high rank change vs prior. */
  rankVolatility: number
}

export interface RewardInput extends EngagementSignals {
  /** Age of the observation in days (used for time decay). */
  ageDays?: number
  /** Segment of the user / traffic that produced this signal. */
  segment?: SegmentKey
  /** Optional override of default reward weights. */
  weights?: Partial<RewardWeights>
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Dwell-time normalization: log-scaled, capped at 60s = 1.0.
 * Below 500ms = 0.
 */
export function normalizeDwellTime(dwellMs: number): number {
  if (dwellMs <= 0) return 0
  if (dwellMs < 500) return 0
  const cap = 60_000
  // log(1 + x) / log(1 + cap) — saturating curve
  return Math.min(1, Math.log(1 + dwellMs) / Math.log(1 + cap))
}

/**
 * Exponential time decay.  At age = 0, returns 1.  At age = halfLife,
 * returns 0.5.  Bounded to [0, 1].
 */
export function timeDecay(ageDays: number, halfLifeDays: number = TIME_DECAY_HALF_LIFE_DAYS): number {
  if (ageDays <= 0) return 1
  if (halfLifeDays <= 0) return 1
  return Math.pow(0.5, ageDays / halfLifeDays)
}

/**
 * Segment-specific weight multipliers.  Captures the fact that
 * different traffic types value different signals:
 *   - high_intent users: conversion-dominant
 *   - low_intent users: CTR-dominant
 *   - new users: dwell + bounce more important (trust signal)
 */
export function segmentMultiplier(segment: SegmentKey, weights: RewardWeights): RewardWeights {
  switch (segment) {
    case "high_intent":
      return { ...weights, conversion: weights.conversion * 1.4, ctr: weights.ctr * 0.8 }
    case "low_intent":
      return { ...weights, ctr: weights.ctr * 1.4, conversion: weights.conversion * 0.7 }
    case "new_user":
      return { ...weights, dwell: weights.dwell * 1.3, bounce: weights.bounce * 1.3, volatility: weights.volatility * 1.2 }
    case "returning_user":
      return { ...weights, conversion: weights.conversion * 1.1, ctr: weights.ctr * 1.05 }
    case "global":
    default:
      return weights
  }
}

// ─── Core Computation ──────────────────────────────────────────────────────

/**
 * Compute a single reward value from engagement signals.
 * Returns a value in [0, 1] along with the per-component breakdown
 * (useful for the bandit_rewards.reward_components jsonb column).
 */
export function computeReward(input: RewardInput): {
  reward: number
  components: Record<string, number>
} {
  const baseWeights: RewardWeights = { ...DEFAULT_REWARD_WEIGHTS, ...(input.weights ?? {}) }
  const weights = segmentMultiplier(input.segment ?? "global", baseWeights)

  const dwellNorm = normalizeDwellTime(input.dwellTimeMs)

  const ctr = clamp01(input.ctr)
  const conv = clamp01(input.conversion)
  const skip = clamp01(input.skipRate)
  const bounce = clamp01(input.bounceRate)
  const volatility = clamp01(input.rankVolatility)

  const positive = weights.ctr * ctr + weights.conversion * conv + weights.dwell * dwellNorm
  const negative = weights.skip * skip + weights.bounce * bounce + weights.volatility * volatility

  const raw = positive - negative
  const decay = timeDecay(input.ageDays ?? 0)
  const reward = clamp01(raw * decay)

  return {
    reward,
    components: {
      ctr,
      conversion: conv,
      dwell_normalized: dwellNorm,
      skip,
      bounce,
      volatility,
      raw_pre_decay: raw,
      time_decay: decay,
      weights_ctr: weights.ctr,
      weights_conversion: weights.conversion,
      weights_dwell: weights.dwell,
      weights_skip: weights.skip,
      weights_bounce: weights.bounce,
      weights_volatility: weights.volatility,
    },
  }
}

// ─── Aggregated (Nearline) Reward ──────────────────────────────────────────

/**
 * Compute a reward from aggregated historical metrics.  Used by the
 * nearline learning loop and the counterfactual engine.  All inputs
 * are mean values over a time window.
 */
export function computeRewardFromAggregates(agg: {
  ctr: number
  conversionRate: number
  meanDwellMs: number
  skipRate: number
  bounceRate: number
  rankVolatility: number
  ageDays: number
  segment?: SegmentKey
  weights?: Partial<RewardWeights>
}): number {
  return computeReward({
    ctr: agg.ctr,
    conversion: agg.conversionRate,
    dwellTimeMs: agg.meanDwellMs,
    skipRate: agg.skipRate,
    bounceRate: agg.bounceRate,
    rankVolatility: agg.rankVolatility,
    ageDays: agg.ageDays,
    segment: agg.segment ?? "global",
    weights: agg.weights,
  }).reward
}

// ─── Segment Inference ─────────────────────────────────────────────────────

/**
 * Infer a user / traffic segment from minimal request context.
 * Used at impression time when we have no engagement history yet.
 * The nearline loop may later refine this with real behavior.
 */
export function inferSegment(input: {
  userId?: string
  sessionId?: string
  isNewUser?: boolean
  query?: string
}): SegmentKey {
  if (input.isNewUser === true) return "new_user"
  if (input.isNewUser === false) return "returning_user"

  // Heuristic from query length — short queries tend to be high-intent
  // (direct brand / product searches), long queries exploratory.
  const q = (input.query ?? "").trim()
  if (q.length > 0 && q.length <= 6) return "high_intent"
  if (q.length > 30) return "low_intent"
  return "global"
}

// ─── Long-Term Alignment (Phase 3.8.1) ─────────────────────────────────────

/**
 * Combine the immediate-engagement reward with a long-term delayed
 * reward proxy.  The delayed weight (default 0.3) is the additional
 * signal that protects against "clickbait" lock-in.
 *
 *   final = (1 - delayedWeight) · shortTerm + delayedWeight · longTerm
 *
 * This wrapper keeps computeReward() pure (no DB / flag lookups)
 * and lets callers compose the two signals explicitly.
 */
export function combineWithDelayedProxy(input: {
  shortTermReward: number
  delayedProxyReward: number
  delayedWeight: number
}): number {
  const w = clamp01(input.delayedWeight)
  return clamp01((1 - w) * input.shortTermReward + w * input.delayedProxyReward)
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}
