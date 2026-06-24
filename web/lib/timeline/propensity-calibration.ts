// =============================================
// Phase 3.8.1: Propensity Calibration Layer
// Timeline First Architecture — IPS Bias Correction
// =============================================
// Closes the "noisy propensity" risk in counterfactual-eval.  The base
// IPS estimator uses the *observed* selection rate as the propensity
// score π̂(a) = count(a) / N.  When the bandit over- or under-explores
// an arm, the raw empirical propensities mis-weight the estimator and
// produce a "looks-optimal" arm that is actually a statistical artifact.
//
// Calibration strategy:
//   1. Compute "intended" propensity per arm from rollout config
//      (BLEND_WEIGHTS + AB_TEST_RATIO + TIMELINE_ROLLOUT_PCT) —
//      i.e. what the rollout controller was *configured* to deliver.
//   2. Compute "observed" propensity from bandit_rewards — what the
//      bandit actually delivered.
//   3. Calibration ratio = observed / intended.  Persist to
//      pflid.propensity_calibration for audit.
//   4. Counterfactual-eval multiplies raw IPS by calibration ratio
//      to correct for systematic over/under-sampling.
//
// This is a *lightweight* post-hoc calibration — not a full doubly-
// robust estimator.  It catches the gross biases (e.g. 5× over-
// sampling) without requiring per-request propensity modeling.

import { createClient } from "@/lib/supabase/server"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"
import { getFlag, FLAG_KEYS } from "@/lib/timeline/feature-flags"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"

// ─── Configuration ─────────────────────────────────────────────────────────

export interface PropensityCalibrationConfig {
  enabled: boolean
  /** Minimum samples required before calibrating an arm (default 100). */
  minSamples: number
  /** Cap on calibration ratio to prevent extreme corrections (default 2.0). */
  maxCalibrationRatio: number
}

export const DEFAULT_CALIBRATION_CONFIG: PropensityCalibrationConfig = {
  enabled: true,
  minSamples: 100,
  maxCalibrationRatio: 2.0,
}

export interface ArmCalibration {
  armId: string
  intendedPropensity: number
  observedPropensity: number
  calibrationRatio: number
  sampleSize: number
}

export interface CalibrationSnapshot {
  segment: SegmentKey
  windowStart: string
  windowEnd: string
  totalImpressions: number
  arms: ArmCalibration[]
  /** Arms that were skipped because they had < min_samples. */
  skippedArms: string[]
}

// ─── Config Loading ────────────────────────────────────────────────────────

export async function loadCalibrationConfig(): Promise<PropensityCalibrationConfig> {
  try {
    const flag = await getFlag(FLAG_KEYS.BANDIT_PROPENSITY_CALIBRATION ?? ("bandit_propensity_calibration" as any))
    return {
      enabled: flag.enabled !== false,
      minSamples: typeof flag.min_samples === "number" ? flag.min_samples : DEFAULT_CALIBRATION_CONFIG.minSamples,
      maxCalibrationRatio:
        typeof flag.max_calibration_ratio === "number"
          ? flag.max_calibration_ratio
          : DEFAULT_CALIBRATION_CONFIG.maxCalibrationRatio,
    }
  } catch {
    return DEFAULT_CALIBRATION_CONFIG
  }
}

// ─── Intended Propensity (from rollout config) ─────────────────────────────

/**
 * Compute the *intended* propensity per bandit arm by reading the
 * current rollout configuration flags.  When AB_TEST is active, the
 * treatment arm's intended share is AB_TEST_RATIO.  When BLEND is
 * the engine, the three blend arms split the blend share evenly
 * across the rollout percentage.
 *
 * This is an approximation — it doesn't account for traffic shape
 * across segments — but it captures the *intent* of the rollout
 * controller, which is what the calibration needs to compare against.
 */
export async function computeIntendedPropensities(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  try {
    const blendFlag = await getFlag(FLAG_KEYS.BLEND_WEIGHTS)
    const abFlag = await getFlag(FLAG_KEYS.AB_TEST_RATIO)
    const timelinePct = await getFlag(FLAG_KEYS.TIMELINE_ROLLOUT_PCT)

    const timelineShare = typeof timelinePct.percentage === "number" ? timelinePct.percentage / 100 : 0
    const abRatio = typeof abFlag.ratio === "number" ? abFlag.ratio : 0.5

    // review_only: 1 - timeline_share
    out["review_only"] = clamp01(1 - timelineShare)
    // timeline_only: timeline_share * (1 - abRatio)
    out["timeline_only"] = clamp01(timelineShare * (1 - abRatio))
    // blend_*: timeline_share * abRatio, split 3 ways
    const blendShare = clamp01(timelineShare * abRatio) / 3
    out["blend_70_30"] = blendShare
    out["blend_50_50"] = blendShare
    out["blend_30_70"] = blendShare

    // Sanity: weights from BLEND_WEIGHTS (informational only — the
    // *intended* share for each blend arm is the same, the difference
    // is in the *weight config*).
    void blendFlag
  } catch {
    // Fall back to uniform distribution
    out["review_only"] = 0.5
    out["timeline_only"] = 0.2
    out["blend_70_30"] = 0.1
    out["blend_50_50"] = 0.1
    out["blend_30_70"] = 0.1
  }
  return out
}

// ─── Observed Propensity (from bandit_rewards) ─────────────────────────────

/**
 * Compute the *observed* selection rate per arm from the bandit_rewards
 * table over the given window.
 */
export async function computeObservedPropensities(input: {
  segment?: SegmentKey
  windowHours?: number
}): Promise<Record<string, number>> {
  const segment: SegmentKey = input.segment ?? "global"
  const windowHours = input.windowHours ?? 168
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - windowHours * 3600_000)
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("bandit_rewards")
    .select("arm_id")
    .eq("segment", segment)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())

  if (error) {
    console.error("[PropensityCalibration] rewards query failed:", error.message)
    return {}
  }

  const arr = (rows ?? []) as Array<{ arm_id: string }>
  const counts = new Map<string, number>()
  for (const r of arr) {
    counts.set(r.arm_id, (counts.get(r.arm_id) ?? 0) + 1)
  }
  const total = arr.length
  if (total === 0) return {}

  const out: Record<string, number> = {}
  for (const [armId, count] of counts.entries()) {
    out[armId] = count / total
  }
  return out
}

// ─── Calibration Snapshot ──────────────────────────────────────────────────

/**
 * Build a calibration snapshot comparing intended vs observed propensities
 * across the candidate arm set.  Persists a row per arm to
 * pflid.propensity_calibration for audit.
 */
export async function buildCalibrationSnapshot(input: {
  candidateArms: string[]
  segment?: SegmentKey
  windowHours?: number
  config?: Partial<PropensityCalibrationConfig>
}): Promise<CalibrationSnapshot> {
  const config: PropensityCalibrationConfig = { ...DEFAULT_CALIBRATION_CONFIG, ...(input.config ?? {}) }
  const segment: SegmentKey = input.segment ?? "global"
  const windowHours = input.windowHours ?? 168
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - windowHours * 3600_000)

  const [intended, observed] = await Promise.all([
    computeIntendedPropensities(),
    computeObservedPropensities({ segment, windowHours }),
  ])

  const supabase = await createClient()
  const arms: ArmCalibration[] = []
  const skippedArms: string[] = []

  for (const armId of input.candidateArms) {
    const intendedP = intended[armId] ?? 0
    const observedP = observed[armId] ?? 0
    // Sample size for this arm in the window
    const sampleSize = Math.round(observedP * sumValues(observed))
    if (sampleSize < config.minSamples) {
      skippedArms.push(armId)
      continue
    }
    // calibrationRatio = observed / intended, capped.
    // If intended is 0 (shouldn't happen but defensive), default to 1.0
    const ratio = intendedP > 0 ? clamp(observedP / intendedP, 1 / config.maxCalibrationRatio, config.maxCalibrationRatio) : 1.0

    arms.push({
      armId,
      intendedPropensity: intendedP,
      observedPropensity: observedP,
      calibrationRatio: ratio,
      sampleSize,
    })

    // Persist audit row (best-effort)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("propensity_calibration").insert({
      arm_id: armId,
      segment,
      period_start: windowStart.toISOString(),
      period_end: windowEnd.toISOString(),
      intended_propensity: intendedP,
      observed_propensity: observedP,
      calibration_ratio: ratio,
      sample_size: sampleSize,
    })
  }

  const snapshot: CalibrationSnapshot = {
    segment,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    totalImpressions: sumValues(observed),
    arms,
    skippedArms,
  }

  recordBanditEvent({
    type: "OFFLINE_LOOP_COMPLETED",
    armId: "all",
    segment,
    sampledValue: 0,
    requestId: `calibration-${Date.now()}`,
    metadata: {
      calibrated_arms: arms.length,
      skipped_arms: skippedArms.length,
      window_hours: windowHours,
    },
  })

  return snapshot
}

// ─── Calibration Lookup ────────────────────────────────────────────────────

/**
 * Look up the most recent calibration ratio for an arm.
 * Returns 1.0 (no correction) if no calibration has been computed.
 */
export async function getCalibrationRatio(input: {
  armId: string
  segment?: SegmentKey
  maxAgeHours?: number
}): Promise<number> {
  const maxAgeHours = input.maxAgeHours ?? 168
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("propensity_calibration")
    .select("calibration_ratio")
    .eq("arm_id", input.armId)
    .eq("segment", input.segment ?? "global")
    .gte("computed_at", cutoff)
    .order("computed_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return 1.0
  return Number(data.calibration_ratio ?? 1.0)
}

/**
 * Calibrate a raw empirical propensity score using the most recent
 * calibration ratio.  Returns the corrected propensity in [0, 1].
 */
export async function calibratePropensityScore(input: {
  armId: string
  rawPropensity: number
  segment?: SegmentKey
}): Promise<number> {
  const ratio = await getCalibrationRatio({
    armId: input.armId,
    segment: input.segment,
  })
  return clamp01(input.rawPropensity * ratio)
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo
  if (v > hi) return hi
  return v
}

function sumValues(o: Record<string, number>): number {
  let s = 0
  for (const v of Object.values(o)) s += v
  return s
}
