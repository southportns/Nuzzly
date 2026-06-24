// =============================================
// Phase 3.8: Strategy Registry
// Timeline First Architecture — Versioned Strategy Management
// =============================================
// A "strategy" is a versioned, named bundle of (arm + weight config +
// eligibility rules + rollout constraints).  Strategies are the unit
// that admin operators reason about — the bandit is the *mechanism*
// that selects among them, but the *meaningful unit* of work is the
// strategy.
//
// Capabilities:
//   - List / get / create strategies
//   - Set strategy status (active / paused / retired / draft)
//   - Roll back to a previous strategy
//   - Eligibility-rule lookup (used at request time)
//   - Performance history query (joins strategy_performance_history)

import { createClient } from "@/lib/supabase/server"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"

// ─── Types ─────────────────────────────────────────────────────────────────

export type StrategyStatus = "draft" | "active" | "paused" | "retired"

export interface StrategyRecord {
  strategy_id: string
  version: string
  name: string
  description: string | null
  arm_id: string
  weight_config: {
    timeline: number
    review: number
    [k: string]: number
  }
  eligibility_rules: Record<string, unknown>
  rollout_constraints: Record<string, unknown>
  status: StrategyStatus
  parent_strategy_id: string | null
  created_by: string | null
  created_at: string
  retired_at: string | null
}

export interface StrategyPerformanceRow {
  id: string
  strategy_id: string
  arm_id: string
  window_start: string
  window_end: string
  pulls: number
  mean_reward: number
  reward_std: number | null
  exploration_rate: number | null
  ctr: number | null
  conversion_rate: number | null
  dwell_time_ms: number | null
  skip_rate: number | null
  sample_size: number
  recorded_at: string
}

export interface CreateStrategyInput {
  version: string
  name: string
  description?: string
  arm_id: string
  weight_config: { timeline: number; review: number; [k: string]: number }
  eligibility_rules?: Record<string, unknown>
  rollout_constraints?: Record<string, unknown>
  parent_strategy_id?: string | null
  created_by?: string | null
  /** If true, set status to 'active' immediately. */
  activate?: boolean
}

// ─── Reads ─────────────────────────────────────────────────────────────────

export async function listStrategies(filter?: {
  status?: StrategyStatus
  armId?: string
  limit?: number
}): Promise<StrategyRecord[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  let q = (supabase as any)
    .from("strategy_registry")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filter?.limit ?? 100)
  if (filter?.status) q = q.eq("status", filter.status)
  if (filter?.armId) q = q.eq("arm_id", filter.armId)
  const { data, error } = await q
  if (error || !data) return []
  return data as StrategyRecord[]
}

export async function getStrategy(strategyId: string): Promise<StrategyRecord | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data, error } = await (supabase as any)
    .from("strategy_registry")
    .select("*")
    .eq("strategy_id", strategyId)
    .single()
  if (error || !data) return null
  return data as StrategyRecord
}

export async function getActiveStrategiesForArm(armId: string): Promise<StrategyRecord[]> {
  return listStrategies({ armId, status: "active" })
}

// ─── Writes ────────────────────────────────────────────────────────────────

export async function createStrategy(input: CreateStrategyInput): Promise<StrategyRecord> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data, error } = await (supabase as any)
    .from("strategy_registry")
    .insert({
      version: input.version,
      name: input.name,
      description: input.description ?? null,
      arm_id: input.arm_id,
      weight_config: input.weight_config,
      eligibility_rules: input.eligibility_rules ?? {},
      rollout_constraints: input.rollout_constraints ?? {},
      parent_strategy_id: input.parent_strategy_id ?? null,
      created_by: input.created_by ?? null,
      status: input.activate ? "active" : "draft",
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Failed to create strategy: ${error?.message ?? "unknown"}`)
  }

  if (input.activate) {
    // Retire any other active strategies for the same arm.
    // eslint-disable-next-line @typescript-eslint/no-explicitany
    await (supabase as any)
      .from("strategy_registry")
      .update({ status: "retired", retired_at: new Date().toISOString() })
      .eq("arm_id", input.arm_id)
      .eq("status", "active")
      .neq("strategy_id", data.strategy_id)
  }

  recordBanditEvent({
    type: "STRATEGY_CREATED",
    armId: input.arm_id,
    segment: "global",
    sampledValue: 0,
    requestId: `registry-${Date.now()}`,
    metadata: {
      strategy_id: data.strategy_id,
      version: input.version,
      activate: input.activate ?? false,
    },
  })

  return data as StrategyRecord
}

export async function setStrategyStatus(
  strategyId: string,
  status: StrategyStatus
): Promise<StrategyRecord | null> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = { status }
  if (status === "retired") patch.retired_at = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicitany
  const { data, error } = await (supabase as any)
    .from("strategy_registry")
    .update(patch)
    .eq("strategy_id", strategyId)
    .select("*")
    .single()

  if (error || !data) return null

  recordBanditEvent({
    type: "STRATEGY_STATUS_CHANGED",
    armId: data.arm_id,
    segment: "global",
    sampledValue: 0,
    requestId: `registry-${Date.now()}`,
    metadata: { strategy_id: strategyId, status },
  })

  return data as StrategyRecord
}

/**
 * Roll back to a previous strategy by creating a new strategy record
 * that copies the parent's weight_config and eligibility_rules.
 * The original parent is not modified; the new copy is set to active.
 */
export async function rollbackToStrategy(input: {
  sourceStrategyId: string
  newVersion: string
  newName?: string
  reason: string
  createdBy?: string | null
}): Promise<StrategyRecord> {
  const parent = await getStrategy(input.sourceStrategyId)
  if (!parent) {
    throw new Error(`Source strategy ${input.sourceStrategyId} not found`)
  }

  const newStrategy = await createStrategy({
    version: input.newVersion,
    name: input.newName ?? `${parent.name} (rollback)`,
    description: `Rollback to ${parent.version}: ${input.reason}`,
    arm_id: parent.arm_id,
    weight_config: parent.weight_config,
    eligibility_rules: parent.eligibility_rules,
    rollout_constraints: parent.rollout_constraints,
    parent_strategy_id: parent.strategy_id,
    created_by: input.createdBy ?? null,
    activate: true,
  })

  recordBanditEvent({
    type: "STRATEGY_ROLLBACK",
    armId: parent.arm_id,
    segment: "global",
    sampledValue: 0,
    requestId: `rollback-${Date.now()}`,
    metadata: {
      from_strategy_id: parent.strategy_id,
      to_strategy_id: newStrategy.strategy_id,
      reason: input.reason,
    },
  })

  return newStrategy
}

// ─── Performance History ──────────────────────────────────────────────────

export async function getStrategyPerformance(
  strategyId: string,
  options: { limit?: number; sinceHours?: number } = {}
): Promise<StrategyPerformanceRow[]> {
  const supabase = await createClient()
  const limit = options.limit ?? 100
  // eslint-disable-next-line @typescript-eslint/no-explicitany
  let q = (supabase as any)
    .from("strategy_performance_history")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("recorded_at", { ascending: false })
    .limit(limit)
  if (options.sinceHours) {
    const cutoff = new Date(Date.now() - options.sinceHours * 3600_000).toISOString()
    q = q.gte("recorded_at", cutoff)
  }
  const { data, error } = await q
  if (error || !data) return []
  return data as StrategyPerformanceRow[]
}

/**
 * Aggregated performance summary across the recent history of a strategy.
 */
export async function getStrategySummary(
  strategyId: string,
  options: { sinceHours?: number } = {}
): Promise<{
  strategy: StrategyRecord | null
  totalPulls: number
  meanReward: number
  ctr: number
  conversionRate: number
  meanDwellMs: number
  skipRate: number
  recentWindows: number
} | null> {
  const strategy = await getStrategy(strategyId)
  if (!strategy) return null
  const history = await getStrategyPerformance(strategyId, { limit: 200, sinceHours: options.sinceHours ?? 168 })
  if (history.length === 0) {
    return {
      strategy,
      totalPulls: 0,
      meanReward: 0,
      ctr: 0,
      conversionRate: 0,
      meanDwellMs: 0,
      skipRate: 0,
      recentWindows: 0,
    }
  }

  const totalPulls = history.reduce((acc, h) => acc + h.pulls, 0)
  const weightedMeanReward =
    totalPulls > 0
      ? history.reduce((acc, h) => acc + h.mean_reward * h.pulls, 0) / totalPulls
      : 0
  const ctr = weightedMean(history, "ctr", "pulls", numericField, (r, k) => Number(r[k] ?? 0))
  const conversionRate = weightedMean(history, "conversion_rate", "pulls", numericField, (r, k) => Number(r[k] ?? 0))
  const meanDwellMs = weightedMean(history, "dwell_time_ms", "pulls", numericField, (r, k) => Number(r[k] ?? 0))
  const skipRate = weightedMean(history, "skip_rate", "pulls", numericField, (r, k) => Number(r[k] ?? 0))

  return {
    strategy,
    totalPulls,
    meanReward: weightedMeanReward,
    ctr,
    conversionRate,
    meanDwellMs,
    skipRate,
    recentWindows: history.length,
  }
}

// ─── Eligibility Resolution ────────────────────────────────────────────────

/**
 * Determine which active strategies are eligible for a given request.
 * Applies eligibility_rules (simple key=value match for now).
 */
export async function resolveEligibleStrategies(input: {
  context: Record<string, unknown>
  armId?: string
}): Promise<StrategyRecord[]> {
  const filter: { status: StrategyStatus; armId?: string } = { status: "active" }
  if (input.armId) filter.armId = input.armId
  const all = await listStrategies(filter)

  return all.filter((s) => {
    const rules = s.eligibility_rules ?? {}
    for (const [k, expected] of Object.entries(rules)) {
      if (input.context[k] !== expected) return false
    }
    return true
  })
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function weightedMean<T>(
  rows: T[],
  field: keyof T,
  weightField: keyof T,
  extractValue: (row: T, key: keyof T) => number | null,
  extractWeight: (row: T, key: keyof T) => number
): number {
  let sumVal = 0
  let sumWeight = 0
  for (const r of rows) {
    const v = extractValue(r, field)
    const w = extractWeight(r, weightField)
    if (v !== null && w > 0) {
      sumVal += v * w
      sumWeight += w
    }
  }
  return sumWeight > 0 ? sumVal / sumWeight : 0
}

function numericField<T>(row: T, key: keyof T): number | null {
  const v = row[key]
  return typeof v === "number" ? v : null
}
