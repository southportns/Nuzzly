// =============================================
// Pet RWD Query Functions
// =============================================

import { createClient as createServerClient } from "@/lib/supabase/server"
import type {
  PetEvent,
  SymptomOntology,
  EnvironmentProfile,
  FoodUsagePeriod,
  HealthRecord,
  LifeStageHistory,
  CausalEventChain,
  StableSample,
  DataTrustScore,
  NLPExtraction,
  PetEventType,
  HealthRecordType,
} from "@/lib/supabase/types"

// ── Pet Events ──

export async function queryPetEvents(
  petId: string,
  filter?: {
    eventType?: PetEventType | PetEventType[]
    productId?: string
    symptomCode?: string
    dateFrom?: string
    dateTo?: string
    minTrustScore?: number
    limit?: number
  }
) {
  const supabase = await createServerClient()
  let query = supabase
    .from("pet_events")
    .select("*")
    .eq("pet_id", petId)
    .order("event_time", { ascending: false })

  if (filter?.eventType) {
    if (Array.isArray(filter.eventType)) {
      query = query.in("event_type", filter.eventType)
    } else {
      query = query.eq("event_type", filter.eventType)
    }
  }

  if (filter?.productId) {
    query = query.eq("product_id", filter.productId)
  }

  if (filter?.symptomCode) {
    query = query.eq("symptom_code", filter.symptomCode)
  }

  if (filter?.dateFrom) {
    query = query.gte("event_time", filter.dateFrom)
  }

  if (filter?.dateTo) {
    query = query.lte("event_time", filter.dateTo)
  }

  if (filter?.minTrustScore) {
    query = query.gte("trust_score", filter.minTrustScore)
  }

  if (filter?.limit) {
    query = query.limit(filter.limit)
  }

  const { data, error } = await query
  return { data: data as PetEvent[] | null, error }
}

export async function queryRecentEvents(profileId: string, limit = 20) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("pet_events")
    .select("*, pets!inner(name, breed), products(name, brand)")
    .eq("profile_id", profileId)
    .order("event_time", { ascending: false })
    .limit(limit)
  return { data, error }
}

// ── Symptom Ontology ──

export async function querySymptoms(category?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from("symptom_ontology")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("display_name")

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  return { data: data as SymptomOntology[] | null, error }
}

export async function searchSymptoms(searchTerm: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("symptom_ontology")
    .select("*")
    .or(`canonical_name.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
    .eq("is_active", true)
  return { data: data as SymptomOntology[] | null, error }
}

export async function findSymptomByAlias(alias: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("symptom_ontology")
    .select("*")
    .contains("aliases", [alias])
    .eq("is_active", true)
    .maybeSingle()
  return { data: data as SymptomOntology | null, error }
}

// ── Environment Profiles ──

export async function queryEnvironmentProfile(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("environment_profiles")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle()
  return { data: data as EnvironmentProfile | null, error }
}

export async function upsertEnvironmentProfile(petId: string, profileId: string, profile: Partial<EnvironmentProfile>) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("environment_profiles")
    .upsert({
      pet_id: petId,
      profile_id: profileId,
      ...profile,
    })
    .select()
    .single()
  return { data: data as EnvironmentProfile | null, error }
}

// ── Food Usage Periods ──

export async function queryFoodUsagePeriods(petId: string, currentOnly = false) {
  const supabase = await createServerClient()
  let query = supabase
    .from("food_usage_periods")
    .select("*, products(name, brand, image_url)")
    .eq("pet_id", petId)
    .order("start_date", { ascending: false })

  if (currentOnly) {
    query = query.eq("is_current", true)
  }

  const { data, error } = await query
  return { data: data as (FoodUsagePeriod & { products: { name: string; brand: string; image_url: string | null } | null })[] | null, error }
}

export async function createFoodUsagePeriod(
  petId: string,
  profileId: string,
  productId: string,
  startDate: string,
  options?: {
    dailyAmount?: string
    feedingFrequency?: number
    switchReason?: string
  }
) {
  const supabase = await createServerClient()

  await supabase
    .from("food_usage_periods")
    .update({ is_current: false, end_date: new Date().toISOString().split("T")[0] })
    .eq("pet_id", petId)
    .eq("is_current", true)

  const { data, error } = await supabase
    .from("food_usage_periods")
    .insert({
      pet_id: petId,
      profile_id: profileId,
      product_id: productId,
      start_date: startDate,
      is_current: true,
      daily_amount: options?.dailyAmount,
      feeding_frequency: options?.feedingFrequency || 2,
      switch_reason: options?.switchReason,
    })
    .select()
    .single()
  return { data: data as FoodUsagePeriod | null, error }
}

export async function endFoodUsagePeriod(
  periodId: string,
  options?: {
    outcomeSummary?: string
    wouldContinue?: boolean
    stabilityScore?: number
  }
) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from("food_usage_periods")
    .update({
      is_current: false,
      end_date: new Date().toISOString().split("T")[0],
      outcome_summary: options?.outcomeSummary,
      would_continue: options?.wouldContinue,
      stability_score: options?.stabilityScore,
    })
    .eq("id", periodId)
  return { error }
}

// ── Health Records ──

export async function queryHealthRecords(petId: string, recordType?: HealthRecordType) {
  const supabase = await createServerClient()
  let query = supabase
    .from("health_records")
    .select("*")
    .eq("pet_id", petId)
    .order("record_time", { ascending: false })

  if (recordType) {
    query = query.eq("record_type", recordType)
  }

  const { data, error } = await query
  return { data: data as HealthRecord[] | null, error }
}

export async function createHealthRecord(
  petId: string,
  profileId: string,
  record: Omit<Partial<HealthRecord>, 'record_type'> & { record_type: string }
) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("health_records")
    .insert({
      pet_id: petId,
      profile_id: profileId,
      ...record,
    })
    .select()
    .single()
  return { data: data as HealthRecord | null, error }
}

// ── Life Stage History ──

export async function queryLifeStageHistory(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("life_stage_history")
    .select("*")
    .eq("pet_id", petId)
    .order("start_date", { ascending: false })
  return { data: data as LifeStageHistory[] | null, error }
}

// ── Causal Event Chains ──

export async function queryCausalEventChains(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("causal_event_chains")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
  return { data: data as CausalEventChain[] | null, error }
}

// ── Stable Samples ──

export async function queryStableSamples(productId: string, minDays?: number) {
  const supabase = await createServerClient()
  let query = supabase
    .from("stable_samples")
    .select("*")
    .eq("product_id", productId)
    .order("stable_days", { ascending: false })

  if (minDays) {
    query = query.gte("stable_days", minDays)
  }

  const { data, error } = await query
  return { data: data as StableSample[] | null, error }
}

export async function queryProductStableSamplesSummary(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("stable_samples")
    .select("stable_days, stability_score, sample_quality")
    .eq("product_id", productId)
    .order("stable_days", { ascending: false })

  if (error || !data) return { data: null, error }

  const summary = {
    totalSamples: data.length,
    avgStableDays: data.reduce((sum, s) => sum + s.stable_days, 0) / data.length,
    avgStabilityScore: data.reduce((sum, s) => sum + s.stability_score, 0) / data.length,
    qualityBreakdown: data.reduce((acc, s) => {
      const key = s.sample_quality || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }

  return { data: summary, error: null }
}

// ── Data Trust Scores ──

export async function queryTrustScore(entityType: string, entityId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("data_trust_scores")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle()
  return { data: data as DataTrustScore | null, error }
}

// ── NLP Extractions ──

export async function queryNLPExtractions(sourceType?: string, status?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from("nlp_extractions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (sourceType) {
    query = query.eq("source_type", sourceType)
  }

  if (status) {
    query = query.eq("processing_status", status)
  }

  const { data, error } = await query
  return { data: data as NLPExtraction[] | null, error }
}

// ── Views ──

export async function queryPetCompleteTimeline(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("pet_complete_timeline")
    .select("*")
    .eq("pet_id", petId)
    .order("event_time", { ascending: false })
    .limit(100)
  return { data, error }
}

export async function queryBreedRiskAnalysis(breed?: string, species?: 'cat' | 'dog' | 'other') {
  const supabase = await createServerClient()
  let query = supabase
    .from("breed_risk_analysis")
    .select("*")
    .order("occurrence_count", { ascending: false })

  if (breed) {
    query = query.eq("breed", breed)
  }

  if (species) {
    query = query.eq("species", species)
  }

  const { data, error } = await query
  return { data, error }
}

export async function queryFoodLongTermOutcomes(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("food_long_term_outcomes")
    .select("*")
    .eq("product_id", productId)
    .order("start_date", { ascending: false })
  return { data, error }
}
