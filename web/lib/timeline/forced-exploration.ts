// =============================================
// Phase 3.8.1: Forced-Exploration Scheduler
// Timeline First Architecture — Minimum Exposure Guarantee
// =============================================
// Closes the "early-winner lock-in" risk of pure Thompson Sampling.
// Without this layer, an arm that wins the first 100 impressions will
// be exploited forever — other arms never get enough samples to
// distinguish themselves from random noise.
//
// Mechanism:
//   - Track per-arm exposure counts in a 1-hour bucketed log
//     (pflid.arm_exposure_log).
//   - On each selectBanditArm() call, compute each candidate arm's
//     exposure rate over the last `lookback_hours` window.
//   - If any arm's exposure rate is below `min_exposure_pct`, force
//     that arm into the selection.  This is a *soft* override —
//     we surface the override in the ArmSelection record so it can
//     be audited, but we don't suppress it.
//
// Safety:
//   - The Phase 3.6 max_exploration_pct cap from exploration-safety
//     still applies — forced exploration never exceeds it.
//   - Forced exploration can be disabled globally via feature flag.

import { createClient } from "@/lib/supabase/server"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"
import { getFlag, FLAG_KEYS } from "@/lib/timeline/feature-flags"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"

// ─── Configuration ─────────────────────────────────────────────────────────

export interface ForcedExplorationConfig {
  enabled: boolean
  /** Minimum exposure per arm over the window (default 5%). */
  minExposurePct: number
  /** Window over which exposure is measured (default 24h). */
  windowHours: number
  /** Hourly bucket size for the exposure log (default 1h). */
  lookbackHours: number
}

export const DEFAULT_FORCED_CONFIG: ForcedExplorationConfig = {
  enabled: true,
  minExposurePct: 5,
  windowHours: 24,
  lookbackHours: 1,
}

// ─── Exposure Tracking ────────────────────────────────────────────────────

function hourBucketStart(at: Date = new Date()): Date {
  const d = new Date(at)
  d.setUTCMinutes(0, 0, 0)
  return d
}

/**
 * Record that an arm was exposed (selected) for a given request.
 * Increments the hourly exposure counter via the pflid.arm_exposure_bump
 * RPC (atomic upsert + increment).  Failure-safe — errors are logged
 * and swallowed so the realtime path is never blocked.
 */
export async function recordArmExposure(input: {
  armId: string
  segment?: SegmentKey
  at?: Date
}): Promise<void> {
  const bucket = hourBucketStart(input.at ?? new Date())
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("arm_exposure_bump", {
    p_arm_id: input.armId,
    p_segment: input.segment ?? "global",
    p_bucket_start: bucket.toISOString(),
  })
  if (error) {
    console.error("[ForcedExploration] exposure bump failed:", error.message)
  }
}

// ─── Exposure Stats ────────────────────────────────────────────────────────

export interface ArmExposureStats {
  armId: string
  exposureCount: number
  exposureRate: number
  belowMinThreshold: boolean
}

export interface ExposureSummary {
  windowStart: string
  windowEnd: string
  totalExposures: number
  minExposurePct: number
  arms: ArmExposureStats[]
  /** Arms currently flagged for forced exploration. */
  forcedCandidates: string[]
}

// ─── Config Loading ────────────────────────────────────────────────────────

export async function loadForcedConfig(): Promise<ForcedExplorationConfig> {
  try {
    const flag = await getFlag(FLAG_KEYS.BANDIT_FORCED_EXPLORATION ?? ("bandit_forced_exploration" as any))
    return {
      enabled: flag.enabled !== false,
      minExposurePct: typeof flag.min_exposure_pct === "number" ? flag.min_exposure_pct : DEFAULT_FORCED_CONFIG.minExposurePct,
      windowHours: typeof flag.window_hours === "number" ? flag.window_hours : DEFAULT_FORCED_CONFIG.windowHours,
      lookbackHours: typeof flag.lookback_hours === "number" ? flag.lookback_hours : DEFAULT_FORCED_CONFIG.lookbackHours,
    }
  } catch {
    return DEFAULT_FORCED_CONFIG
  }
}

// ─── Forced-Exploration Decision ───────────────────────────────────────────

/**
 * Inspect the candidate arm set and identify which (if any) should
 * be forced into the next selection.  Returns the list of arms that
 * are below `min_exposure_pct` exposure over the configured window.
 *
 * Ties (multiple arms below threshold) are broken by ascending
 * exposure count (most-deprived wins).
 */
export async function identifyForcedExplorationArms(input: {
  candidateArms: string[]
  segment?: SegmentKey
  config?: Partial<ForcedExplorationConfig>
}): Promise<{ stats: ExposureSummary; forcedArms: string[] }> {
  const config: ForcedExplorationConfig = { ...DEFAULT_FORCED_CONFIG, ...(input.config ?? {}) }
  const segment: SegmentKey = input.segment ?? "global"
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - config.windowHours * 3600_000)
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("arm_exposure_log")
    .select("arm_id, exposure_count")
    .eq("segment", segment)
    .gte("bucket_start", windowStart.toISOString())
    .lte("bucket_start", windowEnd.toISOString())

  if (error) {
    console.error("[ForcedExploration] query failed:", error.message)
  }

  const counts = new Map<string, number>()
  for (const r of (rows ?? []) as Array<{ arm_id: string; exposure_count: number }>) {
    counts.set(r.arm_id, (counts.get(r.arm_id) ?? 0) + Number(r.exposure_count ?? 0))
  }

  const candidateCounts = input.candidateArms.map((armId) => counts.get(armId) ?? 0)
  const totalExposures = candidateCounts.reduce((a, b) => a + b, 0)

  const stats: ExposureSummary = {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    totalExposures,
    minExposurePct: config.minExposurePct,
    arms: input.candidateArms.map((armId, idx) => {
      const count = candidateCounts[idx]
      const rate = totalExposures > 0 ? (count / totalExposures) * 100 : 0
      // Below threshold if rate is below min OR if totalExposures is so low
      // that even an evenly-distributed share would be too small.
      const below = totalExposures < input.candidateArms.length
        ? true
        : rate < config.minExposurePct
      return {
        armId,
        exposureCount: count,
        exposureRate: rate,
        belowMinThreshold: below,
      }
    }),
    forcedCandidates: [],
  }

  // Identify arms to force-explore: those below threshold with the lowest exposure.
  const below = stats.arms
    .filter((a) => a.belowMinThreshold)
    .sort((a, b) => a.exposureCount - b.exposureCount)
  const forcedArms = below.map((a) => a.armId)
  stats.forcedCandidates = forcedArms

  if (forcedArms.length > 0) {
    recordBanditEvent({
      type: "ARM_SELECTED",
      armId: forcedArms[0],
      segment,
      sampledValue: 0,
      requestId: `forced-explore-${Date.now()}`,
      metadata: {
        forced: true,
        candidates: forcedArms,
        total_exposures: totalExposures,
        min_exposure_pct: config.minExposurePct,
      },
    })
  }

  return { stats, forcedArms }
}
