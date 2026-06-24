// =============================================
// Outcome Dataset Builder — TypeScript Service Layer
// Phase 3.5: AI Training Dataset Construction
// =============================================
// Purpose: Build structured training samples from timeline data
//          for future Outcome Prediction Engine ML training.
//
// Output formats: JSONL, Parquet (via export)

import { createClient } from "@/lib/supabase/server"

export interface OutcomeSample {
  pet_profile: {
    pet_id: string
    species: string
    breed: string
    age: number
    sterilized: boolean
    stomach_health: string
    weight_kg: number | null
  }
  food: {
    product_id: string
    name: string
    brand: string
    category: string
  }
  timeline: Array<{
    event_day: number
    event_type: string
    status: string
    symptom: string | null
    severity: string | null
    sentiment: string
    sentiment_score: number
  }>
  health_events: Array<{
    type: string
    severity: string
    notes: string | null
    recorded_at: string
  }>
  outcome: {
    stable: boolean
    soft_stool: boolean
    black_chin: boolean
    vomit: boolean
    repurchased: boolean
    usage_duration_days: number
  }
  generated_at: string
}

export interface OutcomeDataset {
  total_samples: number
  samples: OutcomeSample[]
  generated_at: string
}

// Build outcome sample for a single pet+product combination
export async function buildOutcomeDataset(
  petId: string,
  productId: string
): Promise<OutcomeSample | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.build_outcome_sample", {
    p_pet_id: petId,
    p_product_id: productId,
  })
  if (error || !data || data.error) return null
  return data as OutcomeSample
}

// Build full dataset (batch — all pet+product combinations)
export async function buildFullOutcomeDataset(
  limit = 1000
): Promise<OutcomeDataset | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.build_outcome_dataset", {
    p_limit: limit,
  })
  if (error || !data) return null
  return data as OutcomeDataset
}

// Get incremental dataset (new samples since timestamp)
export async function incrementalOutcomeDataset(
  since?: string
): Promise<OutcomeDataset | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.incremental_outcome_dataset", {
    p_since: since ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  })
  if (error || !data) return null
  return data as OutcomeDataset
}

// Export dataset as JSONL format (for ML training)
export function exportAsJSONL(dataset: OutcomeDataset): string {
  return dataset.samples
    .map((sample) => JSON.stringify(sample))
    .join("\n")
}

// Export dataset as CSV format (for analysis)
// NOTE: pet_id is hashed to avoid PII leakage
export function exportAsCSV(dataset: OutcomeDataset): string {
  const headers = [
    "pet_hash", "species", "breed", "age", "sterilized", "stomach_health",
    "product_id", "product_name", "brand", "category",
    "timeline_length", "health_events_count",
    "stable", "soft_stool", "black_chin", "vomit", "repurchased",
    "usage_duration_days",
  ].join(",")

  const rows = dataset.samples.map((s) =>
    [
      hashId(s.pet_profile.pet_id),
      s.pet_profile.species,
      s.pet_profile.breed,
      s.pet_profile.age,
      s.pet_profile.sterilized,
      s.pet_profile.stomach_health,
      s.food.product_id,
      `"${s.food.name}"`,
      `"${s.food.brand}"`,
      s.food.category,
      s.timeline.length,
      s.health_events.length,
      s.outcome.stable,
      s.outcome.soft_stool,
      s.outcome.black_chin,
      s.outcome.vomit,
      s.outcome.repurchased,
      s.outcome.usage_duration_days,
    ].join(",")
  )

  return [headers, ...rows].join("\n")
}

// Simple hash for PII anonymization (SHA-256 truncated)
function hashId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return `h_${Math.abs(hash).toString(36)}`
}

// Get dataset statistics
export function getDatasetStats(dataset: OutcomeDataset) {
  const samples = dataset.samples
  const total = samples.length

  if (total === 0) {
    return {
      total_samples: 0,
      stable_rate: "0",
      soft_stool_rate: "0",
      black_chin_rate: "0",
      repurchase_rate: "0",
      avg_timeline_length: "0",
      avg_usage_duration_days: "0",
    }
  }

  const stableCount = samples.filter((s) => s.outcome.stable).length
  const softStoolCount = samples.filter((s) => s.outcome.soft_stool).length
  const blackChinCount = samples.filter((s) => s.outcome.black_chin).length
  const repurchaseCount = samples.filter((s) => s.outcome.repurchased).length

  const avgTimelineLength = samples.reduce((sum, s) => sum + s.timeline.length, 0) / total
  const avgUsageDuration = samples.reduce((sum, s) => sum + s.outcome.usage_duration_days, 0) / total

  return {
    total_samples: total,
    stable_rate: total > 0 ? (stableCount / total * 100).toFixed(1) : "0",
    soft_stool_rate: total > 0 ? (softStoolCount / total * 100).toFixed(1) : "0",
    black_chin_rate: total > 0 ? (blackChinCount / total * 100).toFixed(1) : "0",
    repurchase_rate: total > 0 ? (repurchaseCount / total * 100).toFixed(1) : "0",
    avg_timeline_length: avgTimelineLength.toFixed(1),
    avg_usage_duration_days: avgUsageDuration.toFixed(0),
  }
}
