// =============================================
// Phase 3.95: Pet Health Benchmark Dataset
// Timeline First Architecture — Aggregated outcome performance by health category
// =============================================

import { createClient } from "@/lib/supabase/server"
import { recordOutcomeEvent } from "@/lib/timeline/outcome-observability"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HealthBenchmark {
  id: string
  category: string
  subcategory: string
  sampleSize: number
  medianImprovement: number | null
  meanImprovement: number | null
  stdDeviation: number | null
  confidenceLevel: number
  confidenceIntervalLower: number | null
  confidenceIntervalUpper: number | null
  medianDaysToImprovement: number | null
  p75DaysToImprovement: number | null
  version: number
  computedAt: string
  validFrom: string
  validTo: string | null
}

export interface BenchmarkUpdate {
  category: string
  subcategory?: string
  improvements: number[]  // individual improvement scores
  daysToImprovement: number[]  // days until improvement observed
}

// ─── Benchmark Computation ──────────────────────────────────────────────────

/**
 * Compute benchmark statistics from raw improvement data.
 * Uses simple median, mean, and standard deviation.
 * Confidence interval uses t-distribution approximation for small samples.
 */
export function computeBenchmarkStats(input: BenchmarkUpdate): {
  sampleSize: number
  medianImprovement: number | null
  meanImprovement: number | null
  stdDeviation: number | null
  confidenceIntervalLower: number | null
  confidenceIntervalUpper: number | null
  medianDaysToImprovement: number | null
  p75DaysToImprovement: number | null
} {
  const n = input.improvements.length
  if (n === 0) {
    return {
      sampleSize: 0,
      medianImprovement: null,
      meanImprovement: null,
      stdDeviation: null,
      confidenceIntervalLower: null,
      confidenceIntervalUpper: null,
      medianDaysToImprovement: null,
      p75DaysToImprovement: null,
    }
  }

  const sorted = [...input.improvements].sort((a, b) => a - b)
  const mean = sorted.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  // Standard deviation
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1)
  const stdDev = Math.sqrt(variance)

  // 95% confidence interval (using z=1.96 approximation)
  const marginOfError = n >= 30
    ? 1.96 * stdDev / Math.sqrt(n)
    : 2.045 * stdDev / Math.sqrt(n)  // t-value for small samples

  // Days to improvement percentiles
  const daysSorted = [...input.daysToImprovement].sort((a, b) => a - b)
  const medianDays = daysSorted.length > 0
    ? daysSorted[Math.floor(daysSorted.length / 2)]
    : null
  const p75Days = daysSorted.length > 0
    ? daysSorted[Math.floor(daysSorted.length * 0.75)]
    : null

  return {
    sampleSize: n,
    medianImprovement: round2(median),
    meanImprovement: round2(mean),
    stdDeviation: round2(stdDev),
    confidenceIntervalLower: round2(mean - marginOfError),
    confidenceIntervalUpper: round2(mean + marginOfError),
    medianDaysToImprovement: medianDays,
    p75DaysToImprovement: p75Days,
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

export async function updateBenchmark(input: BenchmarkUpdate): Promise<HealthBenchmark | null> {
  const supabase = await createClient()
  const stats = computeBenchmarkStats(input)

  // Archive previous version
  await supabase
    .from("pflid.health_benchmarks")
    .update({ valid_to: new Date().toISOString() })
    .eq("category", input.category)
    .eq("subcategory", input.subcategory ?? "")
    .is("valid_to", null)

  // Get next version
  const { data: existing } = await supabase
    .from("pflid.health_benchmarks")
    .select("version")
    .eq("category", input.category)
    .eq("subcategory", input.subcategory ?? "")
    .order("version", { ascending: false })
    .limit(1)

  const nextVersion = (existing?.[0]?.version ?? 0) + 1

  const { data, error } = await supabase
    .from("pflid.health_benchmarks")
    .insert({
      category: input.category,
      subcategory: input.subcategory ?? "",
      sample_size: stats.sampleSize,
      median_improvement: stats.medianImprovement,
      mean_improvement: stats.meanImprovement,
      std_deviation: stats.stdDeviation,
      confidence_interval_lower: stats.confidenceIntervalLower,
      confidence_interval_upper: stats.confidenceIntervalUpper,
      median_days_to_improvement: stats.medianDaysToImprovement,
      p75_days_to_improvement: stats.p75DaysToImprovement,
      version: nextVersion,
    })
    .select()
    .single()

  if (error || !data) return null

  recordOutcomeEvent({
    type: "BENCHMARK_UPDATED",
    entityId: input.category,
    segment: "global",
    sampledValue: stats.meanImprovement ?? 0,
    requestId: `bench-${Date.now()}`,
    metadata: {
      sample_size: stats.sampleSize,
      version: nextVersion,
    },
  })

  return mapBenchmarkRow(data)
}

export async function getBenchmarks(params?: {
  category?: string
  version?: number
}): Promise<HealthBenchmark[]> {
  const supabase = await createClient()

  let query = supabase
    .from("pflid.health_benchmarks")
    .select("*")
    .is("valid_to", null)  // Only current versions
    .order("category")

  if (params?.category) query = query.eq("category", params.category)
  if (params?.version) query = query.eq("version", params.version)

  const { data, error } = await query

  if (error || !data) return []
  return data.map(mapBenchmarkRow)
}

export async function getBenchmarkConfidence(category: string): Promise<{
  sampleSize: number
  confidenceLevel: number
  hasSignificantResult: boolean
} | null> {
  const benchmarks = await getBenchmarks({ category })
  if (benchmarks.length === 0) return null

  const latest = benchmarks[0]
  const hasSignificantResult = latest.confidenceIntervalLower !== null
    && latest.confidenceIntervalLower > 0

  return {
    sampleSize: latest.sampleSize,
    confidenceLevel: latest.confidenceLevel,
    hasSignificantResult,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapBenchmarkRow(row: Record<string, unknown>): HealthBenchmark {
  return {
    id: row.id as string,
    category: row.category as string,
    subcategory: row.subcategory as string,
    sampleSize: row.sample_size as number,
    medianImprovement: row.median_improvement as number | null,
    meanImprovement: row.mean_improvement as number | null,
    stdDeviation: row.std_deviation as number | null,
    confidenceLevel: row.confidence_level as number,
    confidenceIntervalLower: row.confidence_interval_lower as number | null,
    confidenceIntervalUpper: row.confidence_interval_upper as number | null,
    medianDaysToImprovement: row.median_days_to_improvement as number | null,
    p75DaysToImprovement: row.p75_days_to_improvement as number | null,
    version: row.version as number,
    computedAt: row.computed_at as string,
    validFrom: row.valid_from as string,
    validTo: row.valid_to as string | null,
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
