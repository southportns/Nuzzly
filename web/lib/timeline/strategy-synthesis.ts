// =============================================
// Phase 3.9: Strategy Synthesis Engine
// Timeline First Architecture — Automatic strategy evolution
// =============================================
// Combines existing strategies into new hybrid strategies, generates
// candidates from historical performance, and prunes underperformers.
//
// Mechanism:
//   - Mutation: perturb weight_config of an existing strategy
//   - Crossover: blend weight_configs of two parent strategies
//   - Historical best: promote best-performing historical config
//   - Pruning: mark strategies with sustained low performance

import { createClient } from "@/lib/supabase/server"
import { recordBanditEvent } from "@/lib/timeline/bandit-observability"
import type { StrategyRecord } from "@/lib/timeline/strategy-registry"
import { listStrategies, getStrategy } from "@/lib/timeline/strategy-registry"

// ─── Types ──────────────────────────────────────────────────────────────────

export type SynthesisMethod = "mutation" | "crossover" | "historical_best" | "manual"

export interface SynthesisCandidate {
  synthesisId: string
  method: SynthesisMethod
  parentStrategyIds: string[]
  proposedWeightConfig: { timeline: number; review: number; [k: string]: number }
  expectedUplift: number | null
}

export interface SynthesisResult {
  candidate: SynthesisCandidate
  newStrategyId: string | null
  status: "candidate" | "approved" | "rejected" | "deployed" | "pruned"
}

// ─── Mutation ───────────────────────────────────────────────────────────────

/**
 * Mutate a strategy's weight_config by applying small random perturbations.
 * Mutation strength controls the magnitude of change (0.0–1.0).
 */
export function mutateStrategy(
  parent: StrategyRecord,
  mutationStrength = 0.1
): SynthesisCandidate {
  const weights = { ...parent.weight_config }
  const keys = Object.keys(weights)

  // Perturb each weight by ±mutationStrength
  for (const key of keys) {
    const delta = (Math.random() - 0.5) * 2 * mutationStrength
    weights[key] = clamp01(weights[key] + delta)
  }

  // Re-normalize to sum to 1.0
  const total = Object.values(weights).reduce((s, w) => s + w, 0)
  if (total > 0) {
    for (const key of keys) {
      weights[key] = weights[key] / total
    }
  }

  return {
    synthesisId: `synth-mut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: "mutation",
    parentStrategyIds: [parent.strategy_id],
    proposedWeightConfig: weights,
    expectedUplift: null,
  }
}

// ─── Crossover ──────────────────────────────────────────────────────────────

/**
 * Crossover two parent strategies by blending their weight_configs.
 * Alpha controls the blend ratio (0.0 = all parent1, 1.0 = all parent2).
 */
export function crossoverStrategies(
  parent1: StrategyRecord,
  parent2: StrategyRecord,
  alpha = 0.5
): SynthesisCandidate {
  const allKeys = new Set([
    ...Object.keys(parent1.weight_config),
    ...Object.keys(parent2.weight_config),
  ])

  const blended: Record<string, number> = {}
  for (const key of allKeys) {
    const w1 = parent1.weight_config[key] ?? 0
    const w2 = parent2.weight_config[key] ?? 0
    blended[key] = clamp01((1 - alpha) * w1 + alpha * w2)
  }

  // Re-normalize
  const total = Object.values(blended).reduce((s, w) => s + w, 0)
  if (total > 0) {
    for (const key of Object.keys(blended)) {
      blended[key] = blended[key] / total
    }
  }

  return {
    synthesisId: `synth-cross-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: "crossover",
    parentStrategyIds: [parent1.strategy_id, parent2.strategy_id],
    proposedWeightConfig: blended,
    expectedUplift: null,
  }
}

// ─── Historical Best ────────────────────────────────────────────────────────

/**
 * Identify the best-performing strategy from historical data.
 * Uses mean_reward as the primary metric.
 */
export async function findHistoricalBest(options: {
  windowHours?: number
  minPulls?: number
  armId?: string
}): Promise<StrategyRecord | null> {
  const supabase = await createClient()
  const windowHours = options.windowHours ?? 168 // 7 days
  const minPulls = options.minPulls ?? 50
  const cutoff = new Date(Date.now() - windowHours * 3600_000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from("strategy_performance_history")
    .select("strategy_id, arm_id, mean_reward, pulls")
    .gte("recorded_at", cutoff)
    .gte("pulls", minPulls)
    .order("mean_reward", { ascending: false })
    .limit(1)

  if (options.armId) q = q.eq("arm_id", options.armId)

  const { data } = await q
  if (!data || data.length === 0) return null

  return getStrategy(data[0].strategy_id)
}

// ─── Pruning ────────────────────────────────────────────────────────────────

/**
 * Identify underperforming strategies for pruning.
 * A strategy is underperforming if its mean_reward is below
 * threshold for the last N windows.
 */
export async function identifyPruneCandidates(input: {
  rewardThreshold: number
  consecutiveWindows: number
  windowHours?: number
}): Promise<StrategyRecord[]> {
  const supabase = await createClient()
  const windowHours = input.windowHours ?? 24
  const cutoff = new Date(Date.now() - input.consecutiveWindows * windowHours * 3600_000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("strategy_performance_history")
    .select("strategy_id, arm_id, mean_reward, pulls, recorded_at")
    .gte("recorded_at", cutoff)
    .gte("pulls", 10)
    .order("recorded_at", { ascending: false })

  if (!data || data.length === 0) return []

  // Group by strategy_id and check if ALL recent windows are below threshold
  const grouped = new Map<string, Array<{ mean_reward: number; recorded_at: string }>>()
  for (const row of data) {
    const arr = grouped.get(row.strategy_id) ?? []
    arr.push({ mean_reward: Number(row.mean_reward), recorded_at: row.recorded_at })
    grouped.set(row.strategy_id, arr)
  }

  const underperformingIds: string[] = []
  for (const [strategyId, windows] of grouped) {
    if (windows.length < input.consecutiveWindows) continue
    const allBelow = windows.every((w) => w.mean_reward < input.rewardThreshold)
    if (allBelow) underperformingIds.push(strategyId)
  }

  // Fetch full strategy records
  const strategies = await listStrategies({ limit: 500 })
  return strategies.filter((s) => underperformingIds.includes(s.strategy_id))
}

// ─── Persistence ────────────────────────────────────────────────────────────

/**
 * Log a synthesis event to the database.
 */
export async function logSynthesis(input: {
  candidate: SynthesisCandidate
  newStrategyId?: string | null
  status?: SynthesisResult["status"]
}): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("strategy_synthesis_log").insert({
    synthesis_id: input.candidate.synthesisId,
    parent_strategies: input.candidate.parentStrategyIds,
    new_strategy_id: input.newStrategyId ?? null,
    synthesis_method: input.candidate.method,
    parameter_changes: {
      weight_config: input.candidate.proposedWeightConfig,
    },
    expected_uplift: input.candidate.expectedUplift,
    status: input.status ?? "candidate",
  })
}

/**
 * Batch generate synthesis candidates from all active strategies.
 */
export async function generateSynthesisCandidates(options: {
  mutationCount?: number
  crossoverCount?: number
  mutationStrength?: number
}): Promise<SynthesisCandidate[]> {
  const activeStrategies = await listStrategies({ status: "active" })
  const candidates: SynthesisCandidate[] = []

  // Generate mutations
  const mutationCount = options.mutationCount ?? 3
  for (let i = 0; i < Math.min(mutationCount, activeStrategies.length); i++) {
    const parent = activeStrategies[i]
    candidates.push(mutateStrategy(parent, options.mutationStrength ?? 0.1))
  }

  // Generate crossovers
  const crossoverCount = options.crossoverCount ?? 2
  for (let i = 0; i < crossoverCount && i + 1 < activeStrategies.length; i++) {
    candidates.push(crossoverStrategies(activeStrategies[i], activeStrategies[i + 1]))
  }

  return candidates
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(1, v))
}
