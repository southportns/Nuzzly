// =============================================
// Phase 3.8: Counterfactual Evaluation Engine
// Timeline First Architecture — IPS + Bootstrap CI
// =============================================
// Answers "what if we had chosen a different arm?" using:
//   1. Phase 3.7 replay_snapshots  — past decision reconstructions
//   2. Phase 3.7 decision_trace_log — original decision audit
//   3. bandit_rewards             — observed reward stream
//
// Method: Inverse Propensity Scoring (IPS) with bootstrap CIs.
//
//   IPS Estimate for arm a:
//     V_IPS(a) = (1/N) · Σ_i [ (r_i · 𝟙{a=A_i}) / π_a(x_i) ]
//
//   where:
//     r_i      = observed reward for impression i
//     A_i      = arm that was actually chosen
//     π_a(x_i) = P(a | x_i) ≈ empirical selection rate of arm a
//
//   In practice we use the empirical mean per arm + bootstrap to
//   construct a confidence interval.  This is a standard approximate
//   IPS estimator for logged bandit feedback.

import { createClient } from "@/lib/supabase/server"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"
import { calibratePropensityScore } from "@/lib/timeline/propensity-calibration"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CounterfactualInput {
  baselineArm?: string
  candidateArms?: string[]
  windowHours?: number
  segment?: SegmentKey
  bootstrapIterations?: number
  /** Confidence level (default 0.95). */
  confidenceLevel?: number
  /** Use Phase 3.7 replay snapshots instead of just bandit_rewards. */
  useReplaySnapshots?: boolean
  /** Apply Phase 3.8.1 propensity calibration (default true). */
  usePropensityCalibration?: boolean
}

export interface ArmCounterfactual {
  armId: string
  ipsEstimate: number
  ipsStd: number
  ipsCiLower: number
  ipsCiUpper: number
  expectedLift: number
  /** Lift relative to baseline in % terms. */
  expectedLiftPct: number
  sampleSize: number
  selectionRate: number
  /** Calibrated propensity score (raw × calibration_ratio). */
  calibratedPropensity: number
  /** Calibration ratio applied (1.0 = no correction). */
  calibrationRatio: number
  /** Bootstrap iterations that produced a lift > 0 (success probability). */
  probabilityOfBeatingBaseline: number
  rank: number
}

export interface CounterfactualResult {
  baselineArm: string
  candidateArms: string[]
  windowStart: string
  windowEnd: string
  segment: SegmentKey
  totalImpressions: number
  estimates: ArmCounterfactual[]
  bestArm: string | null
  bestLift: number
  bestLiftCi: [number, number]
  statisticalMethod: string
  computedAt: string
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────

function bootstrapSample<T>(arr: T[]): T[] {
  const out: T[] = new Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    out[i] = arr[Math.floor(Math.random() * arr.length)]
  }
  return out
}

function quantile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))
  return sorted[idx]
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Estimate counterfactual reward for each candidate arm vs a baseline.
 * Persists results to counterfactual_estimates and returns a ranked list.
 */
export async function evaluateCounterfactuals(input: CounterfactualInput = {}): Promise<CounterfactualResult> {
  const baselineArm = input.baselineArm ?? "review_only"
  const segment: SegmentKey = input.segment ?? "global"
  const windowHours = input.windowHours ?? 168
  const bootstrapIterations = input.bootstrapIterations ?? 1000
  const confidenceLevel = input.confidenceLevel ?? 0.95
  const useReplay = input.useReplaySnapshots ?? true
  const useCalibration = input.usePropensityCalibration ?? true

  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - windowHours * 3600_000)
  const supabase = await createClient()

  // ── 1. Load observed rewards ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data: rewardRows, error: rErr } = await (supabase as any)
    .from("bandit_rewards")
    .select("arm_id, reward, request_id, created_at")
    .eq("segment", segment)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())

  if (rErr) {
    console.error("[Counterfactual] rewards query failed:", rErr.message)
  }

  const rewards = (rewardRows ?? []) as Array<{ arm_id: string; reward: number; request_id: string; created_at: string }>

  // ── 2. Optionally cross-reference with Phase 3.7 replay snapshots ──────
  //    If a request has a replay snapshot, we know its full reconstruction
  //    (more signal).  Here we just enrich metadata — IPS still uses raw rewards.
  let replayEnrichedCount = 0
  if (useReplay && rewards.length > 0) {
    const requestIds = Array.from(new Set(rewards.map((r) => r.request_id))).slice(0, 500)
    if (requestIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicitany
      const { count } = await (supabase as any)
        .from("replay_snapshots")
        .select("id", { count: "exact", head: true })
        .in("request_id", requestIds)
      replayEnrichedCount = count ?? 0
    }
  }

  // ── 3. Group rewards by arm ─────────────────────────────────────────────
  const byArm = new Map<string, number[]>()
  for (const r of rewards) {
    const arr = byArm.get(r.arm_id) ?? []
    arr.push(r.reward)
    byArm.set(r.arm_id, arr)
  }

  const candidateArms = input.candidateArms ?? Array.from(byArm.keys())
  const baselineRewards = byArm.get(baselineArm) ?? []
  const baselineMean = mean(baselineRewards)
  const totalImpressions = rewards.length

  // ── 4. Compute IPS estimate + bootstrap CI for each candidate ──────────
  const estimates: ArmCounterfactual[] = []
  for (const armId of candidateArms) {
    const observed = byArm.get(armId) ?? []
    if (observed.length === 0) continue

    const selectionRate = observed.length / Math.max(1, totalImpressions)
    if (selectionRate <= 0) continue

    const observedMean = mean(observed)
    const observedStd = standardDeviation(observed)

    // ── Phase 3.8.1: propensity calibration ──
    //   The raw empirical selection rate mis-weights over-/under-sampled
    //   arms.  We correct by multiplying the IPS estimate by 1/calibration_ratio
    //   where calibration_ratio = observed / intended.
    let calibrationRatio = 1.0
    let calibratedPropensity = selectionRate
    let ipsEstimate = observedMean
    if (useCalibration) {
      try {
        calibratedPropensity = await calibratePropensityScore({
          armId,
          rawPropensity: selectionRate,
          segment,
        })
        calibrationRatio = selectionRate > 0 ? calibratedPropensity / selectionRate : 1.0
        // IPS correction: V_calibrated = V_empirical / calibration_ratio.
        //   - Over-sampled arm (ratio > 1) → estimate shrinks
        //   - Under-sampled arm (ratio < 1) → estimate grows
        // Clamp to [0, 1] to avoid numerical issues.
        const corrected = observedMean / calibrationRatio
        ipsEstimate = Math.max(0, Math.min(1, corrected))
      } catch (err) {
        // Calibration is best-effort; if it fails we use the empirical mean.
        console.error("[Counterfactual] calibration failed for arm", armId, (err as Error).message)
      }
    }

    // expectedLift uses the calibrated IPS estimate, not the raw mean.
    const expectedLift = ipsEstimate - baselineMean
    const expectedLiftPct = baselineMean > 0 ? (expectedLift / baselineMean) * 100 : 0

    // Bootstrap CI on the lift (re-uses raw observations for stability).
    const liftSamples: number[] = []
    let beatCount = 0
    const baseSample = baselineRewards.length > 0 ? baselineRewards : [baselineMean]
    for (let i = 0; i < bootstrapIterations; i++) {
      const a = bootstrapSample(observed)
      const b = bootstrapSample(baseSample)
      const lift = mean(a) - mean(b)
      liftSamples.push(lift)
      if (lift > 0) beatCount++
    }

    const alpha = (1 - confidenceLevel) / 2
    const ciLower = quantile(liftSamples, alpha)
    const ciUpper = quantile(liftSamples, 1 - alpha)

    estimates.push({
      armId,
      ipsEstimate,
      ipsStd: observedStd,
      ipsCiLower: ipsEstimate + ciLower,
      ipsCiUpper: ipsEstimate + ciUpper,
      expectedLift,
      expectedLiftPct,
      sampleSize: observed.length,
      selectionRate,
      calibratedPropensity,
      calibrationRatio,
      probabilityOfBeatingBaseline: beatCount / bootstrapIterations,
      rank: 0,
    })

    // Persist estimate
    // eslint-disable-next-line @typescript-eslint/no-explicitany
    await (supabase as any).from("counterfactual_estimates").insert({
      arm_id: armId,
      baseline_arm_id: baselineArm,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      ips_estimate: ipsEstimate,
      ips_std: observedStd,
      ips_ci_lower: ipsEstimate + ciLower,
      ips_ci_upper: ipsEstimate + ciUpper,
      expected_lift: expectedLift,
      sample_size: observed.length,
      propensity_score: calibratedPropensity,
      statistical_method: useCalibration
        ? useReplay
          ? "ips_calibrated_with_replay"
          : "ips_calibrated"
        : useReplay
        ? "ips_empirical_with_replay"
        : "ips_empirical",
    })
  }

  // ── 5. Rank ─────────────────────────────────────────────────────────────
  estimates.sort((a, b) => b.expectedLift - a.expectedLift)
  estimates.forEach((e, idx) => (e.rank = idx + 1))

  const best = estimates[0] ?? null
  const bestLiftCi: [number, number] = best
    ? [best.ipsCiLower - baselineMean, best.ipsCiUpper - baselineMean]
    : [0, 0]

  const result: CounterfactualResult = {
    baselineArm,
    candidateArms,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    segment,
    totalImpressions,
    estimates,
    bestArm: best && best.expectedLift > 0 ? best.armId : null,
    bestLift: best?.expectedLift ?? 0,
    bestLiftCi,
    statisticalMethod: useCalibration
      ? useReplay
        ? "ips_calibrated_with_replay"
        : "ips_calibrated"
      : useReplay
      ? "ips_empirical_with_replay"
      : "ips_empirical",
    computedAt: new Date().toISOString(),
  }

  recordBanditEvent({
    type: "COUNTERFACTUAL_EVALUATED",
    armId: "all",
    segment,
    sampledValue: result.bestLift,
    requestId: `cf-${Date.now()}`,
    metadata: {
      candidate_arms: candidateArms.length,
      total_impressions: totalImpressions,
      best_arm: result.bestArm,
      bootstrap_iterations: bootstrapIterations,
      replay_enriched: replayEnrichedCount,
    },
  })

  return result
}

// ─── One-Shot Comparison (Convenience) ─────────────────────────────────────

/**
 * Quick comparison: head-to-head between two arms.
 * Returns the winner and confidence.
 */
export async function compareArms(input: {
  armA: string
  armB: string
  windowHours?: number
  segment?: SegmentKey
}): Promise<{
  armA: string
  armB: string
  armAMean: number
  armBMean: number
  armAStd: number
  armBStd: number
  winner: string | "tie"
  probabilityABeatsB: number
  lift: number
  ciLower: number
  ciUpper: number
  sampleSizeA: number
  sampleSizeB: number
}> {
  const windowHours = input.windowHours ?? 168
  const segment: SegmentKey = input.segment ?? "global"
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - windowHours * 3600_000)
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data: rows } = await (supabase as any)
    .from("bandit_rewards")
    .select("arm_id, reward")
    .eq("segment", segment)
    .in("arm_id", [input.armA, input.armB])
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())

  const arr = (rows ?? []) as Array<{ arm_id: string; reward: number }>
  const a = arr.filter((r) => r.arm_id === input.armA).map((r) => r.reward)
  const b = arr.filter((r) => r.arm_id === input.armB).map((r) => r.reward)

  const armAMean = mean(a)
  const armBMean = mean(b)
  const armAStd = standardDeviation(a)
  const armBStd = standardDeviation(b)

  let beatCount = 0
  const liftSamples: number[] = []
  const iterations = 1000
  for (let i = 0; i < iterations; i++) {
    const sa = mean(bootstrapSample(a))
    const sb = mean(bootstrapSample(b))
    const lift = sa - sb
    liftSamples.push(lift)
    if (sa > sb) beatCount++
  }

  return {
    armA: input.armA,
    armB: input.armB,
    armAMean,
    armBMean,
    armAStd,
    armBStd,
    winner: armAMean === armBMean ? "tie" : armAMean > armBMean ? input.armA : input.armB,
    probabilityABeatsB: beatCount / iterations,
    lift: armAMean - armBMean,
    ciLower: quantile(liftSamples, 0.025),
    ciUpper: quantile(liftSamples, 0.975),
    sampleSizeA: a.length,
    sampleSizeB: b.length,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const v = arr.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (arr.length - 1)
  return Math.sqrt(v)
}
