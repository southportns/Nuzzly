// =============================================
// Phase 3.6: Rollout Controller (v2 — Fixed)
// Timeline First Architecture — Central Scoring Engine Router
// =============================================
// Fixes applied:
// 1. Single Decision Lock — strict priority order, single path per request
// 2. Stable Identity Resolver — deterministic hash key with source tracking
// 3. Pre-Execution Short-Circuit — skip Timeline computation on rollback
// 4. Critical Flag Bypass — rollback/master flags never cached

import {
  getFlag,
  getFlagEnabled,
  FLAG_KEYS,
  type FeatureFlagValue,
} from "@/lib/timeline/feature-flags"
import { recordShadowEvent } from "@/lib/timeline/shadow-observability"

// ─── Decision Path (Fix #1: Single Decision Lock) ──────────────────────────

export type DecisionPath =
  | "ROLLBACK"
  | "MASTER_OFF"
  | "AB_CONTROL"
  | "AB_TREATMENT"
  | "ROLLOUT_PARTIAL"
  | "ROLLOUT_FULL"
  | "FALLBACK"

// ─── Scoring Engine Types ───────────────────────────────────────────────────

export type ScoringEngine = "review" | "timeline" | "blend"

export interface RolloutDecision {
  engine: ScoringEngine
  decisionPath: DecisionPath
  timelineWeight: number
  reviewWeight: number
  abGroup: "control" | "treatment" | null
  reason: string
  // Fix #2: Stable Identity
  hashBucket: number | null
  hashSource: "userId" | "deviceId" | "sessionId" | "requestId" | "none"
  // Debug metadata (internal only)
  debug: {
    flags: Record<string, boolean>
    rolloutPercentage: number
  }
}

// ─── Central Controller ─────────────────────────────────────────────────────

// Fix #4: Critical flags that must NEVER be cached
const CRITICAL_FLAGS: Set<string> = new Set([
  FLAG_KEYS.TIMELINE_ENABLED,
  FLAG_KEYS.AUTO_ROLLBACK_ENABLED,
])

// Fix #4: Cached flags that can use TTL cache
const CACHED_FLAGS: Set<string> = new Set([
  FLAG_KEYS.TIMELINE_ROLLOUT_PCT,
  FLAG_KEYS.AB_TEST_ENABLED,
  FLAG_KEYS.AB_TEST_RATIO,
  FLAG_KEYS.AUTO_ROLLBACK_THRESHOLDS,
  FLAG_KEYS.BLEND_WEIGHTS,
  FLAG_KEYS.SHADOW_ENABLED,
])

export class RolloutController {
  private static instance: RolloutController | null = null
  private cachedFlags: Map<string, { value: FeatureFlagValue; expiresAt: number }> = new Map()
  private readonly CACHE_TTL_MS = 10_000 // 10s cache for non-critical flags
  private _rollbackActive = false

  static getInstance(): RolloutController {
    if (!RolloutController.instance) {
      RolloutController.instance = new RolloutController()
    }
    return RolloutController.instance
  }

  // ─── Fix #3: Pre-Execution Short-Circuit ────────────────────────────────

  /**
   * Check if Timeline scoring should be skipped entirely.
   * Called BEFORE any Timeline computation to save CPU/DB.
   */
  shouldShortCircuit(): boolean {
    return this._rollbackActive
  }

  /**
   * Mark rollback as active (called by rollback system).
   */
  setRollbackActive(active: boolean): void {
    this._rollbackActive = active
    // Clear all caches on rollback state change
    this.cachedFlags.clear()
  }

  // ─── Fix #1: Single Decision Lock ───────────────────────────────────────

  /**
   * Main decision function — called per request.
   *
   * Decision Priority (strict order, single path):
   * 1. ROLLBACK → Review only
   * 2. MASTER_OFF → Review only
   * 3. AB_TEST → Control or Treatment
   * 4. ROLLOUT_FULL → Blend (100%)
   * 5. ROLLOUT_PARTIAL → Blend for users in percentage
   * 6. FALLBACK → Review only
   *
   * Each request hits EXACTLY ONE path. No overlap.
   */
  async decideEngine(input: {
    userId?: string
    sessionId?: string
    requestId?: string
  }): Promise<RolloutDecision> {
    // Fix #2: Resolve stable identity key
    const { identityKey, hashSource } = this.resolveIdentity(input)

    // ── Priority 1: Rollback check ──
    if (this._rollbackActive) {
      return this.makeDecision("review", 0, 1, null, "ROLLBACK", identityKey, hashSource)
    }

    // ── Priority 2: Master flag ──
    const masterEnabled = await this.getFlag(FLAG_KEYS.TIMELINE_ENABLED)
    if (!masterEnabled.enabled) {
      return this.makeDecision("review", 0, 1, null, "MASTER_OFF", identityKey, hashSource)
    }

    // ── Priority 3: A/B test (if enabled, overrides rollout %) ──
    const abEnabled = await this.getFlag(FLAG_KEYS.AB_TEST_ENABLED)
    if (abEnabled.enabled && identityKey) {
      const abRatio = await this.getFlag(FLAG_KEYS.AB_TEST_RATIO)
      const bucket = this.getUserBucket(identityKey)
      const treatmentThreshold = (abRatio.timeline as number) ?? 10
      const abGroup: "control" | "treatment" = bucket < treatmentThreshold ? "treatment" : "control"

      if (abGroup === "treatment") {
        const blendWeights = await this.getFlag(FLAG_KEYS.BLEND_WEIGHTS)
        return this.makeDecision(
          "blend",
          (blendWeights.timeline as number) ?? 0.7,
          (blendWeights.review as number) ?? 0.3,
          abGroup,
          "AB_TREATMENT",
          identityKey,
          hashSource
        )
      } else {
        return this.makeDecision("review", 0, 1, abGroup, "AB_CONTROL", identityKey, hashSource)
      }
    }

    // ── Priority 4: Rollout percentage ──
    const rolloutPct = await this.getFlag(FLAG_KEYS.TIMELINE_ROLLOUT_PCT)
    const percentage = rolloutPct.percentage ?? 0

    if (percentage >= 100) {
      const blendWeights = await this.getFlag(FLAG_KEYS.BLEND_WEIGHTS)
      return this.makeDecision(
        "blend",
        (blendWeights.timeline as number) ?? 0.7,
        (blendWeights.review as number) ?? 0.3,
        null,
        "ROLLOUT_FULL",
        identityKey,
        hashSource
      )
    }

    if (percentage > 0 && identityKey) {
      const bucket = this.getUserBucket(identityKey)
      if (bucket < percentage) {
        const blendWeights = await this.getFlag(FLAG_KEYS.BLEND_WEIGHTS)
        return this.makeDecision(
          "blend",
          (blendWeights.timeline as number) ?? 0.7,
          (blendWeights.review as number) ?? 0.3,
          null,
          "ROLLOUT_PARTIAL",
          identityKey,
          hashSource
        )
      }
    }

    // ── Priority 6: Fallback ──
    return this.makeDecision("review", 0, 1, null, "FALLBACK", identityKey, hashSource)
  }

  // ─── Score Calculation ───────────────────────────────────────────────────

  calculateScore(timelineScore: number, reviewScore: number, decision: RolloutDecision): number {
    switch (decision.engine) {
      case "review":
        return reviewScore
      case "timeline":
        return timelineScore || reviewScore
      case "blend":
        if (!timelineScore) return reviewScore
        return Math.round(
          timelineScore * decision.timelineWeight + reviewScore * decision.reviewWeight
        )
      default:
        return reviewScore
    }
  }

  // ─── Fix #4: Critical Flag Bypass ───────────────────────────────────────

  /**
   * Get flag value with cache policy:
   * - Critical flags (rollback, master): NEVER cached, always fresh
   * - Cached flags (rollout %, AB): cached with TTL
   */
  private async getFlag(key: string): Promise<FeatureFlagValue> {
    // Critical flags: always fetch fresh
    if (CRITICAL_FLAGS.has(key)) {
      return this.fetchFresh(key)
    }

    // Cached flags: check cache first
    if (CACHED_FLAGS.has(key)) {
      const cached = this.cachedFlags.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value
      }
      const value = await this.fetchFresh(key)
      this.cachedFlags.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL_MS })
      return value
    }

    // Unknown keys: fetch fresh (safe default)
    return this.fetchFresh(key)
  }

  private async fetchFresh(key: string): Promise<FeatureFlagValue> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await getFlag(key as any)
    } catch {
      // Return safe default on fetch failure
      return {}
    }
  }

  // ─── Fix #2: Stable Identity Resolver ───────────────────────────────────

  /**
   * Resolve the primary identity key for hash-based bucket assignment.
   * Priority: userId > sessionId > requestId
   *
   * Never returns empty string — always has a fallback.
   */
  private resolveIdentity(input: {
    userId?: string
    sessionId?: string
    requestId?: string
  }): { identityKey: string | null; hashSource: RolloutDecision["hashSource"] } {
    if (input.userId) {
      return { identityKey: input.userId, hashSource: "userId" }
    }
    if (input.sessionId) {
      return { identityKey: input.sessionId, hashSource: "sessionId" }
    }
    if (input.requestId) {
      return { identityKey: input.requestId, hashSource: "requestId" }
    }
    return { identityKey: null, hashSource: "none" }
  }

  // ─── Deterministic User Bucket ──────────────────────────────────────────

  private getUserBucket(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return Math.abs(hash) % 100
  }

  // ─── Decision Factory ───────────────────────────────────────────────────

  private makeDecision(
    engine: ScoringEngine,
    timelineWeight: number,
    reviewWeight: number,
    abGroup: "control" | "treatment" | null,
    decisionPath: DecisionPath,
    identityKey: string | null,
    hashSource: RolloutDecision["hashSource"]
  ): RolloutDecision {
    const bucket = identityKey ? this.getUserBucket(identityKey) : null

    return {
      engine,
      decisionPath,
      timelineWeight,
      reviewWeight,
      abGroup,
      reason: decisionPath,
      hashBucket: bucket,
      hashSource,
      debug: {
        flags: {
          timeline_enabled: timelineWeight > 0,
          ab_test_active: abGroup !== null,
        },
        rolloutPercentage: Math.round(
          timelineWeight + reviewWeight > 0
            ? (timelineWeight / (timelineWeight + reviewWeight)) * 100
            : 0
        ),
      },
    }
  }

  // ─── Cache Management ───────────────────────────────────────────────────

  clearCache(): void {
    this.cachedFlags.clear()
  }
}

// Singleton export
export const rolloutController = RolloutController.getInstance()
