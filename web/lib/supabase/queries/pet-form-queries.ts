// =============================================
// Pet Form Records (client-side mutations)
// =============================================
// NOTE: Read queries (queryPetDiseases / queryPetMedications / queryPetAttachments)
// live directly in server components to avoid pulling `next/headers` into the
// client bundle. Only mutation helpers are exported from here.

// Phase 1.2.2: Migrated to Write Gateway via API route
import type { Database } from "@/lib/database.types"

type DiseaseRecord = Database["public"]["Tables"]["pet_disease_records"]["Row"]
type MedicationRecord = Database["public"]["Tables"]["pet_medication_records"]["Row"]
type PetAttachment = Database["public"]["Tables"]["pet_attachments"]["Row"]

// ── Helper: call gateway API ──

async function gatewayCall(type: string, payload: Record<string, unknown>, metadata?: Record<string, unknown>) {
  const res = await fetch("/api/gateway/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload, metadata }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    return { error: new Error(data.error || "Gateway request failed") }
  }
  return { data, error: null }
}

// ── Disease records ──

export async function insertPetDisease(record: {
  pet_id: string
  name: string
  diagnosed_on?: string | null
  status?: string
  severity?: string
  notes?: string | null
}, userId: string) {
  return gatewayCall("CREATE_DISEASE_RECORD", record as Record<string, unknown>)
}

export async function updatePetDisease(id: string, patch: Partial<DiseaseRecord>, userId: string) {
  return gatewayCall("UPDATE_DISEASE_RECORD", { id, ...patch } as Record<string, unknown>)
}

export async function deletePetDisease(id: string, userId: string) {
  return gatewayCall("DELETE_DISEASE_RECORD", { id })
}

// ── Medication records ──

export async function insertPetMedication(record: {
  pet_id: string
  name: string
  dosage?: string | null
  frequency?: string | null
  started_on?: string | null
  ended_on?: string | null
  is_ongoing?: boolean
  notes?: string | null
}, userId: string) {
  return gatewayCall("CREATE_MEDICATION_RECORD", record as Record<string, unknown>)
}

export async function updatePetMedication(id: string, patch: Partial<MedicationRecord>, userId: string) {
  return gatewayCall("UPDATE_MEDICATION_RECORD", { id, ...patch } as Record<string, unknown>)
}

export async function deletePetMedication(id: string, userId: string) {
  return gatewayCall("DELETE_MEDICATION_RECORD", { id })
}

// ── Attachments ──

export async function insertPetAttachment(record: {
  pet_id?: string | null
  owner_type: string
  owner_id?: string | null
  category: string
  file_name: string
  file_path: string
  file_url: string
  file_type?: string | null
  file_size?: number | null
  uploaded_by: string
}) {
  return gatewayCall("CREATE_PET_ATTACHMENT", record as Record<string, unknown>)
}

export async function deletePetAttachmentRecord(id: string, userId: string) {
  return gatewayCall("DELETE_PET_ATTACHMENT", { id })
}

// ── Phase 1.2.2 (P1): Client-side mutations migrated to Write Gateway ──

// ── Diet logs ──
// Schema columns: food_name, food_type, logged_date, notes, pet_id, product_id, profile_id
export async function createDietLog(record: {
  pet_id: string
  food_name: string
  food_type?: string | null
  logged_date?: string | null
  notes?: string | null
  product_id?: string | null
}, userId: string) {
  return gatewayCall("CREATE_DIET_LOG", { ...record, profile_id: userId } as Record<string, unknown>)
}

// ── Health records (weight / symptoms) ──
// Used by weight-tracker and symptom-tracker.
export async function createPetHealthRecord(record: {
  pet_id: string
  profile_id: string
  record_type: string
  weight_kg?: number | null
  record_time?: string | null
  notes?: string | null
  symptom_code?: string | null
  severity?: number | null
}, userId: string) {
  return gatewayCall("CREATE_HEALTH_RECORD", record as Record<string, unknown>)
}

// ── Pet weight (update pets.weight_kg) ──

export async function updatePetWeight(petId: string, weightKg: number, userId: string) {
  return gatewayCall("UPDATE_PET_WEIGHT", { id: petId, weight_kg: weightKg })
}

// ── Pet allergies ──

export async function createPetAllergy(record: {
  pet_id: string
  allergen: string
  severity?: string | null
  confirmed?: boolean
}, userId: string) {
  return gatewayCall("CREATE_PET_ALLERGY", record as Record<string, unknown>)
}

export async function deletePetAllergy(id: string, userId: string) {
  return gatewayCall("DELETE_PET_ALLERGY", { id })
}

// ── Environment profile (upsert) ──
// Schema columns: pet_id, profile_id, region, city, district, climate_type, indoor_outdoor,
//                 living_space, has_children, multi_pet_household, pet_count, activity_level, water_source
export async function upsertEnvironmentProfile(record: {
  pet_id: string
  profile_id: string
  region?: string | null
  city?: string | null
  district?: string | null
  climate_type?: string | null
  indoor_outdoor?: string | null
  living_space?: string | null
  has_children?: boolean | null
  multi_pet_household?: boolean | null
  pet_count?: number | null
  activity_level?: string | null
  water_source?: string | null
}, userId: string) {
  return gatewayCall("UPSERT_ENVIRONMENT_PROFILE", record as Record<string, unknown>)
}
