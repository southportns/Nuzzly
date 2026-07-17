import type { Database } from "@/lib/database.types"

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]

// ===== Original Tables =====
export type Profile = Tables<"profiles">
export type Pet = Tables<"pets">
export type Product = Tables<"products">
export type ProductCategory = Tables<"product_categories">
export type ProductIngredient = Tables<"product_ingredients">
export type ProductVersion = Tables<"product_versions">
export type ProductReview = Tables<"product_reviews">
export type RiskEvent = Tables<"risk_events">
export type ProductMetricsDaily = Tables<"product_metrics_daily">
export type DietLog = Tables<"diet_logs">
export type ReviewVoucher = Tables<"review_vouchers">
export type ReviewFollowupSchedule = Tables<"review_followup_schedules">
export type ReviewFollowupEntry = Tables<"review_followup_entries">
export type Notification = Tables<"notifications">
export type PetAllergy = Tables<"pet_allergies">
export type ProductBookmark = Tables<"product_bookmarks">
export type ProductImage = Tables<"product_images">

// ===== Pet RWD Tables =====
// Note: These types require running migration_v2_pet_rwd.sql first
// After running the migration, regenerate database.types.ts with: supabase gen types typescript

export type PetEvent = Tables<"pet_events">
export type SymptomOntology = Tables<"symptom_ontology">
export type EnvironmentProfile = Tables<"environment_profiles">
export type FoodUsagePeriod = Tables<"food_usage_periods">
export type HealthRecord = Tables<"health_records">
export type LifeStageHistory = Tables<"life_stage_history">
export type CausalEventChain = Tables<"causal_event_chains">
export type StableSample = Tables<"stable_samples">
export type DataTrustScore = Tables<"data_trust_scores">
export type NLPExtraction = Tables<"nlp_extractions">

// ===== RWD Enum Types =====
export type PetEventType =
  | 'food_start'
  | 'food_stop'
  | 'food_switch'
  | 'food_amount_change'
  | 'symptom_observed'
  | 'symptom_resolved'
  | 'weight_change'
  | 'energy_change'
  | 'appetite_change'
  | 'vet_visit'
  | 'diagnosis'
  | 'medication_start'
  | 'medication_stop'
  | 'vaccination'
  | 'behavior_change'
  | 'environment_change'
  | 'review_posted'
  | 'followup_completed'
  | 'photo_uploaded'

export type EventSource = 'user_input' | 'ai_extraction' | 'system_generated' | 'imported'

export type LifeStage = 'kitten' | 'young_adult' | 'adult' | 'senior' | 'geriatric'

export type ActivityLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

export type ClimateType = 'tropical' | 'subtropical' | 'temperate' | 'continental' | 'arid' | 'cold'

export type HealthRecordType = 'weight' | 'symptom' | 'diagnosis' | 'medication' | 'vaccination' | 'checkup'

export type CausalChainType = 'food_reaction' | 'health_progression' | 'treatment_outcome' | 'custom'

export type SampleQuality = 'excellent' | 'good' | 'fair' | 'poor'

// ===== Health Reminders =====
export type HealthReminder = Tables<"health_reminders">
export type HealthReminderType = 'vaccination' | 'medication' | 'checkup' | 'custom'
export type RepeatInterval = 'none' | 'monthly' | 'quarterly' | 'yearly'
