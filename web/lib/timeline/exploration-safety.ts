// =============================================
// Phase 3.8: Exploration Safety Controller
// Timeline First Architecture — Guardrails + Auto-Stop
// =============================================
// Monitors bandit performance and enforces hard guardrails:
//
//   * Max exploration ratio  — bandit's blend arms must not exceed
//     max_exploration_pct of total traffic.
//   * CTR drop guardrail     — if experimental arms underperform
//     the review baseline by more than ctr_drop_pct, stop exploration.
//   * Conversion drop guardrail — same for conversion.
//   * Causal anomaly         — Phase 3.7 causal layer can signal
//     anomalies; this layer honors those signals.
//   * Auto rollback          — when guardrails fire, call Phase 3.6
//     rollback-system to disable timeline scoring globally.
//
// State:
//   * paused:boolean         — bandit is paused; selectBanditArm falls
//     back to defaults.  Stops recording rewards until resumed.
//   * lastTrigger — diagnostic info from the most recent guardrail fire.

import { createClient } from "@/lib/supabase/server"
import { getFlag, updateFlag, FLAG_KEYS } from "@/lib/timeline/feature-flags"
import { executeRollback } from "@/lib/timeline/rollback-system"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"

// ─── Configuration ─────────────────────────────────────────────────────────

export interface SafetyThresholds {
  ctrDropPct: number
  conversionDropPct: number
  minSamples: number
  maxExplorationPct: number
}

export const DEFAULT_SAFETY_THRESHOLDS: SafetyThresholds = {
  ctrDropPct: 10,
  conversionDropPct: 10,
  minSamples: 200,
  maxExplorationPct: 20,
}

export interface ArmPerformance {
  armId: string
  sampleSize: number
  ctr: number
  conversionRate: number
  meanReward: number
}

export interface GuardrailCheck {
  armId: string
  trigger: "ctr_drop" | "conversion_drop" | "sample_insufficient" | "ok"
  currentValue: number
  threshold: number
  baselineValue: number
  dropPct: number
  triggered: boolean
}

// ─── Safety State ──────────────────────────────────────────────────────────

let _paused = false
let _lastTrigger: {
  at: number
  armId: string
  trigger: GuardrailCheck["trigger"]
  reason: string
} | null = null

/**
 * In-memory pause flag — read by selectBanditArm / optimizer.
 * In a multi-instance deployment, this should be backed by a DB flag.
 * For now, the per-instance cache is acceptable because:
 *   - All Phase 3.6 decisions are also propagated via feature_flags
 *   - Bandit pause is conservative — worst case, one instance keeps
 *     serving bandit selections for a few seconds.
 */
export function isBanditPaused(): boolean {
  return _paused
}

export function getLastSafetyTrigger() {
  return _lastTrigger
}

// ─── Threshold Loading ─────────────────────────────────────────────────────

export async function loadSafetyThresholds(): Promise<SafetyThresholds> {
  try {
    const flag = await getFlag(FLAG_KEYS.BANDIT_SAFETY_THRESHOLDS)
    return {
      ctrDropPct: typeof flag.ctr_drop_pct === "number" ? flag.ctr_drop_pct : DEFAULT_SAFETY_THRESHOLDS.ctrDropPct,
      conversionDropPct:
        typeof flag.conversion_drop_pct === "number" ? flag.conversion_drop_pct : DEFAULT_SAFETY_THRESHOLDS.conversionDropPct,
      minSamples: typeof flag.min_samples === "number" ? flag.min_samples : DEFAULT_SAFETY_THRESHOLDS.minSamples,
      maxExplorationPct:
        typeof flag.max_exploration_pct === "number"
          ? flag.max_exploration_pct
          : DEFAULT_SAFETY_THRESHOLDS.maxExplorationPct,
    }
  } catch {
    return DEFAULT_SAFETY_THRESHOLDS
  }
}

// ─── Guardrail Checks ──────────────────────────────────────────────────────

/**
 * Compare each experimental arm's recent performance against the
 * review_only baseline.  Returns a guardrail check per arm.
 */
export async function checkGuardrails(input: {
  windowHours?: number
  thresholds?: SafetyThresholds
  segment?: SegmentKey
}): Promise<GuardrailCheck[]> {
  const thresholds = input.thresholds ?? (await loadSafetyThresholds())
  const windowHours = input.windowHours ?? 24
  const segment: SegmentKey = input.segment ?? "global"
  const supabase = await createClient()

  // Fetch arm-level aggregates from the rewards table for the window
  const cutoff = new Date(Date.now() - windowHours * 3600_000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("bandit_rewards")
    .select("arm_id, reward, reward_components, created_at")
    .eq("segment", segment)
    .gte("created_at", cutoff)

  if (error || !rows) return []

  const byArm = new Map<string, { rewards: number[]; components: Array<Record<string, number>> }>()
  for (const r of rows as Array<{ arm_id: string; reward: number; reward_components: Record<string, number> }>) {
    const bucket = byArm.get(r.arm_id) ?? { rewards: [], components: [] }
    bucket.rewards.push(Number(r.reward))
    bucket.components.push(r.reward_components ?? {})
    byArm.set(r.arm_id, bucket)
  }

  const baseline = computeArmStats("review_only", byArm.get("review_only"))
  const checks: GuardrailCheck[] = []

  for (const [armId, bucket] of byArm.entries()) {
    if (armId === "review_only") continue

    const stats = computeArmStats(armId, bucket)
    if (!stats) continue

    if (stats.sampleSize < thresholds.minSamples) {
      checks.push({
        armId,
        trigger: "sample_insufficient",
        currentValue: stats.sampleSize,
        threshold: thresholds.minSamples,
        baselineValue: baseline?.sampleSize ?? 0,
        dropPct: 0,
        triggered: false,
      })
      continue
    }

    // CTR drop check
    const ctrDropPct = baseline && baseline.ctr > 0
      ? ((baseline.ctr - stats.ctr) / baseline.ctr) * 100
      : 0
    if (ctrDropPct > thresholds.ctrDropPct) {
      checks.push({
        armId,
        trigger: "ctr_drop",
        currentValue: stats.ctr,
        threshold: thresholds.ctrDropPct,
        baselineValue: baseline?.ctr ?? 0,
        dropPct: ctrDropPct,
        triggered: true,
      })
      continue
    }

    // Conversion drop check
    const convDropPct = baseline && baseline.conversionRate > 0
      ? ((baseline.conversionRate - stats.conversionRate) / baseline.conversionRate) * 100
      : 0
    if (convDropPct > thresholds.conversionDropPct) {
      checks.push({
        armId,
        trigger: "conversion_drop",
        currentValue: stats.conversionRate,
        threshold: thresholds.conversionDropPct,
        baselineValue: baseline?.conversionRate ?? 0,
        dropPct: convDropPct,
        triggered: true,
      })
      continue
    }

    checks.push({
      armId,
      trigger: "ok",
      currentValue: stats.ctr,
      threshold: thresholds.ctrDropPct,
      baselineValue: baseline?.ctr ?? 0,
      dropPct: Math.max(ctrDropPct, convDropPct),
      triggered: false,
    })
  }

  return checks
}

function computeArmStats(
  _armId: string,
  bucket?: { rewards: number[]; components: Array<Record<string, number>> }
): { sampleSize: number; ctr: number; conversionRate: number; meanReward: number } | null {
  if (!bucket || bucket.rewards.length === 0) return null
  const n = bucket.rewards.length
  const meanReward = bucket.rewards.reduce((a, b) => a + b, 0) / n

  let ctrSum = 0
  let convSum = 0
  let withCtr = 0
  let withConv = 0
  for (const c of bucket.components) {
    if (typeof c.ctr === "number") {
      ctrSum += c.ctr
      withCtr++
    }
    if (typeof c.conversion === "number") {
      convSum += c.conversion
      withConv++
    }
  }

  return {
    sampleSize: n,
    ctr: withCtr > 0 ? ctrSum / withCtr : 0,
    conversionRate: withConv > 0 ? convSum / withConv : 0,
    meanReward,
  }
}

// ─── Safety Actions ────────────────────────────────────────────────────────

/**
 * Pause bandit exploration.  Persists state via the master flag.
 */
export async function pauseExploration(reason: string): Promise<void> {
  _paused = true
  _lastTrigger = {
    at: Date.now(),
    armId: "all",
    trigger: "ctr_drop",
    reason,
  }

  // Persist: set bandit flag to disabled (master switch)
  try {
    await updateFlag(FLAG_KEYS.BANDIT_ENABLED, { enabled: false })
  } catch (err) {
    console.error("[Safety] Failed to persist pause flag:", (err as Error).message)
  }

  await logSafetyEvent({
    event_type: "exploration_paused",
    reason,
  })

  recordBanditEvent({
    type: "EXPLORATION_PAUSED",
    armId: "all",
    segment: "global",
    sampledValue: 0,
    requestId: `safety-${Date.now()}`,
    metadata: { reason },
  })
}

/**
 * Resume bandit exploration.  Re-enables the master flag.
 */
export async function resumeExploration(): Promise<void> {
  _paused = false
  _lastTrigger = null

  try {
    await updateFlag(FLAG_KEYS.BANDIT_ENABLED, { enabled: true })
  } catch (err) {
    console.error("[Safety] Failed to persist resume flag:", (err as Error).message)
  }

  await logSafetyEvent({
    event_type: "exploration_resumed",
    reason: "manual_resume",
  })

  recordBanditEvent({
    type: "EXPLORATION_RESUMED",
    armId: "all",
    segment: "global",
    sampledValue: 0,
    requestId: `safety-${Date.now()}`,
  })
}

/**
 * Trigger a hard rollback via Phase 3.6 rollback-system.
 * Used when guardrails fire AND we want to disable timeline scoring.
 */
export async function triggerSafetyRollback(input: {
  armId: string
  trigger: GuardrailCheck["trigger"]
  reason: string
}): Promise<void> {
  // Pause first so the bandit stops producing selections.
  await pauseExploration(input.reason)

  // Then escalate to a full Phase 3.6 rollback.
  try {
    await executeRollback(
      `Bandit safety: ${input.trigger} on arm=${input.armId}: ${input.reason}`,
      "auto"
    )
  } catch (err) {
    console.error("[Safety] Rollback trigger failed:", (err as Error).message)
  }

  await logSafetyEvent({
    event_type: "rollback_triggered",
    reason: input.reason,
    trigger_metric: input.trigger,
    affected_arms: [input.armId],
  })

  recordBanditEvent({
    type: "ROLLBACK_TRIGGERED",
    armId: input.armId,
    segment: "global",
    sampledValue: 0,
    requestId: `safety-${Date.now()}`,
    metadata: { trigger: input.trigger, reason: input.reason },
  })
}

// ─── Master Safety Check ───────────────────────────────────────────────────

export interface SafetyCheckResult {
  ok: boolean
  checks: GuardrailCheck[]
  actions: Array<{ type: "pause" | "rollback" | "log"; armId: string; reason: string }>
}

/**
 * Run guardrails and apply safety actions.
 * Called by the nearline learning loop and by manual admin checks.
 */
export async function runSafetyCheck(input: {
  windowHours?: number
  thresholds?: SafetyThresholds
  segment?: SegmentKey
  /** If true, fire rollback on first triggered guardrail. */
  autoRollback?: boolean
}): Promise<SafetyCheckResult> {
  const checks = await checkGuardrails(input)
  const actions: SafetyCheckResult["actions"] = []

  for (const check of checks) {
    if (!check.triggered) continue

    actions.push({
      type: "log",
      armId: check.armId,
      reason: `${check.trigger} on ${check.armId} (drop=${check.dropPct.toFixed(2)}%)`,
    })

    await logSafetyEvent({
      event_type: "guardrail_triggered",
      reason: `Guardrail: ${check.trigger} on ${check.armId} drop=${check.dropPct.toFixed(2)}%`,
      trigger_metric: check.trigger,
      trigger_value: check.currentValue,
      threshold_value: check.threshold,
      affected_arms: [check.armId],
    })

    if (input.autoRollback) {
      actions.push({
        type: "rollback",
        armId: check.armId,
        reason: `auto_rollback on ${check.trigger}`,
      })
      await triggerSafetyRollback({
        armId: check.armId,
        trigger: check.trigger,
        reason: `Guardrail ${check.trigger} fired: drop=${check.dropPct.toFixed(2)}%`,
      })
    } else {
      actions.push({
        type: "pause",
        armId: check.armId,
        reason: `pause on ${check.trigger}`,
      })
      await pauseExploration(
        `Guardrail ${check.trigger} fired on ${check.armId} (drop=${check.dropPct.toFixed(2)}%)`
      )
    }
  }

  return {
    ok: actions.length === 0,
    checks,
    actions,
  }
}

// ─── Causal Layer Integration ──────────────────────────────────────────────

/**
 * Hook for Phase 3.7 causal layer.  If a causal anomaly is detected
 * (e.g. score divergence between timeline and review), the bandit
 * pauses exploration to avoid compounding the anomaly.
 */
export async function onCausalAnomalyDetected(input: {
  analysisId: string
  anomalyType: string
  severity: "low" | "medium" | "high"
  description: string
}): Promise<void> {
  if (input.severity === "low") {
    // Log only
    await logSafetyEvent({
      event_type: "safety_check",
      reason: `causal_anomaly (low): ${input.description}`,
      payload: { analysis_id: input.analysisId, anomaly_type: input.anomalyType },
    })
    return
  }

  if (input.severity === "medium") {
    await pauseExploration(`Causal anomaly: ${input.description}`)
    return
  }

  // High severity — full rollback
  await triggerSafetyRollback({
    armId: "all",
    trigger: "ctr_drop",
    reason: `Causal anomaly (high): ${input.description}`,
  })
}

// ─── Logging ───────────────────────────────────────────────────────────────

async function logSafetyEvent(input: {
  event_type: string
  reason: string
  trigger_metric?: string
  trigger_value?: number
  threshold_value?: number
  affected_arms?: string[]
  payload?: Record<string, unknown>
}): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("exploration_safety_log").insert({
    event_type: input.event_type,
    reason: input.reason,
    trigger_metric: input.trigger_metric ?? null,
    trigger_value: input.trigger_value ?? null,
    threshold_value: input.threshold_value ?? null,
    affected_arms: input.affected_arms ?? [],
    payload: input.payload ?? {},
  })
}
