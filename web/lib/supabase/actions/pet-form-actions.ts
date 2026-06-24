// =============================================
// Pet Form Server Actions
// Phase 1.2.2: All mutations must run on server (Write Gateway requires service_role)
// Pattern: Submit to Write Gateway (audit) → Execute actual DB write immediately
// =============================================

"use server"

import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/database.types"

type DiseaseRecord = Database["public"]["Tables"]["pet_disease_records"]["Row"]
type MedicationRecord = Database["public"]["Tables"]["pet_medication_records"]["Row"]
type PetAttachment = Database["public"]["Tables"]["pet_attachments"]["Row"]

// ── Disease records ──

export async function insertPetDisease(record: {
  pet_id: string
  name: string
  diagnosed_on?: string | null
  status?: string
  severity?: string
  notes?: string | null
}, userId: string) {
  // 1. Submit to Write Gateway (audit trail)
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_DISEASE_RECORD",
    actor: userId,
    payload: record as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_DISEASE_RECORD", {
      pet_id: record.pet_id,
      name: record.name,
    }),
    source: "api",
  })

  // 2. Execute actual DB write immediately
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pet_disease_records")
    .insert(record)
    .select()
    .single()

  return { data: data as DiseaseRecord | null, error: error ? new Error(error.message) : null }
}

export async function updatePetDisease(id: string, patch: Partial<DiseaseRecord>, userId: string) {
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "UPDATE_DISEASE_RECORD",
    actor: userId,
    payload: { id, ...patch } as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("UPDATE_DISEASE_RECORD", { id }),
    source: "api",
  })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pet_disease_records")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  return { data: data as DiseaseRecord | null, error: error ? new Error(error.message) : null }
}

export async function deletePetDisease(id: string, userId: string) {
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "DELETE_DISEASE_RECORD",
    actor: userId,
    payload: { id },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("DELETE_DISEASE_RECORD", { id }),
    source: "api",
  })

  const admin = createAdminClient()
  const { error } = await admin
    .from("pet_disease_records")
    .delete()
    .eq("id", id)

  return { error: error ? new Error(error.message) : null }
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
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_MEDICATION_RECORD",
    actor: userId,
    payload: record as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_MEDICATION_RECORD", {
      pet_id: record.pet_id,
      name: record.name,
    }),
    source: "api",
  })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pet_medication_records")
    .insert(record)
    .select()
    .single()

  return { data: data as MedicationRecord | null, error: error ? new Error(error.message) : null }
}

export async function updatePetMedication(id: string, patch: Partial<MedicationRecord>, userId: string) {
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "UPDATE_MEDICATION_RECORD",
    actor: userId,
    payload: { id, ...patch } as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("UPDATE_MEDICATION_RECORD", { id }),
    source: "api",
  })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pet_medication_records")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  return { data: data as MedicationRecord | null, error: error ? new Error(error.message) : null }
}

export async function deletePetMedication(id: string, userId: string) {
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "DELETE_MEDICATION_RECORD",
    actor: userId,
    payload: { id },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("DELETE_MEDICATION_RECORD", { id }),
    source: "api",
  })

  const admin = createAdminClient()
  const { error } = await admin
    .from("pet_medication_records")
    .delete()
    .eq("id", id)

  return { error: error ? new Error(error.message) : null }
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
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_PET_ATTACHMENT",
    actor: record.uploaded_by,
    payload: record as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_PET_ATTACHMENT", {
      file_path: record.file_path,
      uploaded_by: record.uploaded_by,
    }),
    source: "api",
  })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("pet_attachments")
    .insert(record)
    .select()
    .single()

  return { data: data as PetAttachment | null, error: error ? new Error(error.message) : null }
}

export async function deletePetAttachmentRecord(id: string, userId: string) {
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "DELETE_PET_ATTACHMENT",
    actor: userId,
    payload: { id },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("DELETE_PET_ATTACHMENT", { id }),
    source: "api",
  })

  const admin = createAdminClient()
  const { error } = await admin
    .from("pet_attachments")
    .delete()
    .eq("id", id)

  return { error: error ? new Error(error.message) : null }
}

// ── Diet logs ──

export async function createDietLog(record: {
  pet_id: string
  food_name: string
  food_type?: string | null
  logged_date?: string | null
  notes?: string | null
  product_id?: string | null
}, userId: string) {
  await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_DIET_LOG",
    actor: userId,
    payload: { ...record, profile_id: userId } as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_DIET_LOG", {
      pet_id: record.pet_id,
      food_name: record.food_name,
      logged_date: record.logged_date,
    }),
    source: "api",
  })

  const admin = createAdminClient()
  const { error } = await admin
    .from("diet_logs")
    .insert({ ...record, profile_id: userId })

  return { error: error ? new Error(error.message) : null }
}

export async function deleteDietLog(id: string, userId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from("diet_logs")
    .delete()
    .eq("id", id)

  return { error: error ? new Error(error.message) : null }
}

// ── Health records (weight / symptoms) ──

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
  try {
    await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "CREATE_HEALTH_RECORD",
      actor: userId,
      payload: record as Record<string, unknown>,
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("CREATE_HEALTH_RECORD", {
        pet_id: record.pet_id,
        record_type: record.record_type,
        record_time: record.record_time ?? new Date().toISOString(),
      }),
      source: "api",
    })
  } catch {
    // Gateway failure should not block the actual DB write
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("health_records")
    .insert(record)

  return { error: error ? new Error(error.message) : null }
}

export async function deleteHealthRecord(id: string, userId: string) {
  try {
    await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "DELETE_HEALTH_RECORD",
      actor: userId,
      payload: { id },
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("DELETE_HEALTH_RECORD", { id }),
      source: "api",
    })
  } catch {
    // Gateway failure should not block the actual DB write
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("health_records")
    .delete()
    .eq("id", id)

  return { error: error ? new Error(error.message) : null }
}

export async function updatePetWeight(petId: string, weightKg: number, userId: string) {
  try {
    await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "UPDATE_PET_WEIGHT",
      actor: userId,
      payload: { id: petId, weight_kg: weightKg },
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("UPDATE_PET_WEIGHT", { id: petId, weight_kg: weightKg }),
      source: "api",
    })
  } catch {
    // Gateway failure should not block the actual DB write
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("pets")
    .update({ weight_kg: weightKg })
    .eq("id", petId)

  return { error: error ? new Error(error.message) : null }
}

// ── Pet allergies ──

export async function createPetAllergy(record: {
  pet_id: string
  allergen: string
  severity?: string | null
  confirmed?: boolean
}, userId: string) {
  try {
    await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "CREATE_PET_ALLERGY",
      actor: userId,
      payload: record as Record<string, unknown>,
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("CREATE_PET_ALLERGY", {
        pet_id: record.pet_id,
        allergen: record.allergen,
      }),
      source: "api",
    })
  } catch {
    // Gateway failure should not block the actual DB write
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("pet_allergies")
    .insert(record)

  return { error: error ? new Error(error.message) : null }
}

export async function deletePetAllergy(id: string, userId: string) {
  try {
    await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "DELETE_PET_ALLERGY",
      actor: userId,
      payload: { id },
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("DELETE_PET_ALLERGY", { id }),
      source: "api",
    })
  } catch {
    // Gateway failure should not block the actual DB write
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("pet_allergies")
    .delete()
    .eq("id", id)

  return { error: error ? new Error(error.message) : null }
}

// ── Environment profile (upsert) ──

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
  // Submit to Write Gateway (audit trail) — best effort, don't block DB write
  try {
    await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "UPSERT_ENVIRONMENT_PROFILE",
      actor: userId,
      payload: record as Record<string, unknown>,
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("UPSERT_ENVIRONMENT_PROFILE", {
        pet_id: record.pet_id,
        region: record.region,
        city: record.city,
        district: record.district,
      }),
      source: "api",
    })
  } catch {
    // Gateway failure should not block the actual DB write
  }

  // Execute actual DB write immediately
  const admin = createAdminClient()
  const { error } = await admin
    .from("environment_profiles")
    .upsert(record, { onConflict: "pet_id" })

  return { error: error ? new Error(error.message) : null }
}

// ── Delete entire pet profile ──

export async function deletePet(petId: string, userId: string) {
  const admin = createAdminClient()

  // Delete all related records first (due to no CASCADE)
  await admin.from("diet_logs").delete().eq("pet_id", petId)
  await admin.from("pet_events").delete().eq("pet_id", petId)
  await admin.from("health_records").delete().eq("pet_id", petId)
  await admin.from("pet_allergies").delete().eq("pet_id", petId)
  await admin.from("pet_disease_records").delete().eq("pet_id", petId)
  await admin.from("pet_medication_records").delete().eq("pet_id", petId)
  await admin.from("pet_attachments").delete().eq("pet_id", petId)
  await admin.from("environment_profiles").delete().eq("pet_id", petId)

  // Finally delete the pet
  const { error } = await admin
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("profile_id", userId) // Ensure user owns this pet

  return { error: error ? new Error(error.message) : null }
}
