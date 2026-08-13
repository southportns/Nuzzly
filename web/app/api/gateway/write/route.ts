// POST /api/gateway/write — client-side write gateway entry point
// Clients POST write intents here; server-side executes through WriteGateway.
import { getWriteGateway, generateIdempotencyKey, type WriteIntent, type WriteResult } from "@/lib/gateway/write-gateway"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/lib/database.types"

// Direct DB write types (bypass EventBus, execute directly)
const DIRECT_WRITE_TYPES: Record<string, (payload: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) => Promise<{ error: string | null; data: Record<string, unknown> | null }>> = {
// ── Dietrecords ────────────────────────────────────────────
CREATE_DIET_LOG: async (payload, admin) => {
const { data, error } = await admin.from("diet_logs").insert({
pet_id: payload.pet_id as string,
food_name: payload.food_name as string,
food_type: (payload.food_type as string)?? null,
logged_date: (payload.logged_date as string)?? new Date().toISOString(),
notes: (payload.notes as string)?? null,
product_id: (payload.product_id as string)?? null,
profile_id: payload.profile_id as string,
}).select().single()
return { error: error?.message?? null, data }
},

DELETE_DIET_LOG: async (payload, admin) => {
const { data, error } = await admin.from("diet_logs").delete().eq("id", payload.id as string).eq("profile_id", payload.profile_id as string).select().single()
return { error: error?.message?? null, data }
},

// ── Weight ────────────────────────────────────────────────
UPDATE_PET_WEIGHT: async (payload, admin) => {
const { data, error } = await admin.from("pets").update({ weight_kg: payload.weight_kg as number }).eq("id", payload.id as string).eq("profile_id", payload.profile_id as string).select().single()
return { error: error?.message?? null, data }
},

// ── Allergy信息 ────────────────────────────────────────────
CREATE_PET_ALLERGY: async (payload, admin) => {
const { data, error } = await admin.from("pet_allergies").insert({
pet_id: payload.pet_id as string,
allergen: payload.allergen as string,
severity: (payload.severity as string)?? null,
confirmed: (payload.confirmed as boolean)?? false,
}).select().single()
return { error: error?.message?? null, data }
},

DELETE_PET_ALLERGY: async (payload, admin) => {
const { data, error } = await admin.from("pet_allergies").delete().eq("id", payload.id as string).eq("pet_id", payload.pet_id as string).select().single()
return { error: error?.message?? null, data }
},

// ── 环境信息 ────────────────────────────────────────────
UPSERT_ENVIRONMENT_PROFILE: async (payload, admin) => {
const { data, error } = await admin.from("environment_profiles").upsert({
pet_id: payload.pet_id as string,
profile_id: payload.profile_id as string,
region: (payload.region as string)?? null,
city: (payload.city as string)?? null,
district: (payload.district as string)?? null,
climate_type: (payload.climate_type as "tropical" | "subtropical" | "temperate" | "continental" | "arid" | "cold")?? null,
indoor_outdoor: (payload.indoor_outdoor as string)?? null,
living_space: (payload.living_space as string)?? null,
has_children: (payload.has_children as boolean)?? null,
multi_pet_household: (payload.multi_pet_household as boolean)?? null,
pet_count: (payload.pet_count as number)?? null,
activity_level: (payload.activity_level as "low" | "medium" | "high" | "very_low" | "very_high")?? null,
water_source: (payload.water_source as string)?? null,
}, { onConflict: "pet_id" }).select().single()
return { error: error?.message?? null, data }
},

DELETE_ENVIRONMENT_PROFILE: async (payload, admin) => {
const { data, error } = await admin.from("environment_profiles").delete().eq("pet_id", payload.pet_id as string).eq("profile_id", payload.profile_id as string).select().single()
return { error: error?.message?? null, data }
},

// ── Healthrecords (Weight/Symptom/Vaccine/Check-up etc.) ─────────────────────
CREATE_HEALTH_RECORD: async (payload, admin) => {
const { data, error } = await admin.from("health_records").insert({
pet_id: payload.pet_id as string,
profile_id: payload.profile_id as string,
record_type: payload.record_type as string,
record_time: (payload.record_time as string)?? new Date().toISOString(),
weight_kg: (payload.weight_kg as number)?? null,
notes: (payload.notes as string)?? null,
symptom_code: (payload.symptom_code as string)?? null,
severity: (payload.severity as number)?? null,
diagnosis: (payload.diagnosis as string)?? null,
diagnosis_code: (payload.diagnosis_code as string)?? null,
medication_name: (payload.medication_name as string)?? null,
medication_dosage: (payload.medication_dosage as string)?? null,
medication_frequency: (payload.medication_frequency as string)?? null,
medication_start: (payload.medication_start as string)?? null,
medication_end: (payload.medication_end as string)?? null,
vet_clinic: (payload.vet_clinic as string)?? null,
vet_name: (payload.vet_name as string)?? null,
body_part: (payload.body_part as string)?? null,
duration_days: (payload.duration_days as number)?? null,
metadata: (payload.metadata as unknown as Json)?? null,
}).select().single()
return { error: error?.message?? null, data }
},

DELETE_HEALTH_RECORD: async (payload, admin) => {
const { data, error } = await admin.from("health_records").delete().eq("id", payload.id as string).eq("profile_id", payload.profile_id as string).select().single()
return { error: error?.message?? null, data }
},

// ── Diseaserecords ────────────────────────────────────────────
CREATE_DISEASE_RECORD: async (payload, admin) => {
const { data, error } = await admin.from("pet_disease_records").insert({
pet_id: payload.pet_id as string,
name: payload.name as string,
diagnosed_on: (payload.diagnosed_on as string)?? null,
status: (payload.status as string)?? "unknown",
severity: (payload.severity as string)?? "unknown",
notes: (payload.notes as string)?? null,
symptoms: (payload.symptoms as string)?? null,
recovered_on: (payload.recovered_on as string)?? null,
}).select().single()
return { error: error?.message?? null, data }
},

UPDATE_DISEASE_RECORD: async (payload, admin) => {
const id = payload.id as string
if (!id) return { error: "id required", data: null }
const update: Record<string, unknown> = {}
const allowed = ["name", "diagnosed_on", "status", "severity", "notes", "symptoms", "recovered_on"] as const
for (const k of allowed) {
if (payload[k]!== undefined) update[k] = payload[k]
}
if (Object.keys(update).length === 0) return { error: "no fields to update", data: null }
update.updated_at = new Date().toISOString()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (admin as any).from("pet_disease_records").update(update).eq("id", id).select().single()
return { error: error?.message?? null, data }
},

DELETE_DISEASE_RECORD: async (payload, admin) => {
const { data, error } = await admin.from("pet_disease_records").delete().eq("id", payload.id as string).select().single()
return { error: error?.message?? null, data }
},

// ── Medicationrecords ────────────────────────────────────────────
CREATE_MEDICATION_RECORD: async (payload, admin) => {
const { data, error } = await admin.from("pet_medication_records").insert({
pet_id: payload.pet_id as string,
name: payload.name as string,
dosage: (payload.dosage as string)?? null,
frequency: (payload.frequency as string)?? null,
started_on: (payload.started_on as string)?? null,
ended_on: (payload.ended_on as string)?? null,
is_ongoing: (payload.is_ongoing as boolean)?? true,
notes: (payload.notes as string)?? null,
}).select().single()
return { error: error?.message?? null, data }
},

UPDATE_MEDICATION_RECORD: async (payload, admin) => {
const id = payload.id as string
if (!id) return { error: "id required", data: null }
const update: Record<string, unknown> = {}
const allowed = ["name", "dosage", "frequency", "started_on", "ended_on", "is_ongoing", "notes"] as const
for (const k of allowed) {
if (payload[k]!== undefined) update[k] = payload[k]
}
if (Object.keys(update).length === 0) return { error: "no fields to update", data: null }
update.updated_at = new Date().toISOString()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (admin as any).from("pet_medication_records").update(update).eq("id", id).select().single()
return { error: error?.message?? null, data }
},

DELETE_MEDICATION_RECORD: async (payload, admin) => {
const { data, error } = await admin.from("pet_medication_records").delete().eq("id", payload.id as string).select().single()
return { error: error?.message?? null, data }
},

// ── pet profile(M1.7)────────────────────────────────────────
CREATE_PET: async (payload, admin) => {
// profile_id Must由 gateway 端from session 注,Cannot信任 client payload
const profileId = payload.profile_id as string
if (!profileId) return { error: "profile_id missing", data: null }
const { data, error } = await admin.from("pets").insert({
profile_id: profileId,
name: payload.name as string,
species: (payload.species as "cat" | "dog" | "other")?? "other",
breed: (payload.breed as string)?? null,
age_years: (payload.age_years as number)?? 0,
age_months: (payload.age_months as number)?? 0,
gender: (payload.gender as "male" | "female" | "unknown")?? "unknown",
weight_kg: (payload.weight_kg as number)?? null,
stomach_health: (payload.stomach_health as "normal" | "sensitive" | "very_sensitive")?? "normal",
photo_url: (payload.photo_url as string)?? null,
is_active: true,
}).select().single()
return { error: error?.message?? null, data }
},

UPDATE_PET: async (payload, admin) => {
const id = payload.id as string
const profileId = payload.profile_id as string
if (!id ||!profileId) return { error: "id and profile_id required", data: null }
// only AllowedUpdatethis fields(防止 client 篡改 profile_id/is_active)
const update: Record<string, unknown> = {}
const allowed = [
"name", "species", "breed", "age_years", "age_months",
"gender", "weight_kg", "stomach_health", "photo_url",
"neutered", "birth_date", "disease_history", "medication_log",
"life_stage", "pet_source", "home_date", "avatar_url",
] as const
for (const k of allowed) {
if (payload[k]!== undefined) update[k] = payload[k]
}
if (Object.keys(update).length === 0) return { error: "no fields to update", data: null }
update.updated_at = new Date().toISOString()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (admin as any).from("pets").update(update).eq("id", id).eq("profile_id", profileId) // owner.select().single()
return { error: error?.message?? null, data }
},

SOFT_DELETE_PET: async (payload, admin) => {
const id = payload.id as string
const profileId = payload.profile_id as string
if (!id ||!profileId) return { error: "id and profile_id required", data: null }
const { data, error } = await admin.from("pets").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("profile_id", profileId).select().single()
return { error: error?.message?? null, data }
},

// ── UserProfile ────────────────────────────────────────────
CREATE_PROFILE: async (payload, admin) => {
const { data, error } = await admin.from("profiles").insert({
id: payload.id as string,
username: payload.username as string,
display_name: payload.display_name as string,
user_number: (payload.user_number as number)?? null,
avatar_url: (payload.avatar_url as string)?? null,
bio: (payload.bio as string)?? null,
}).select().single()
return { error: error?.message?? null, data }
},

SOFT_DELETE_PROFILE: async (payload, admin) => {
const userId = payload.profile_id as string
const { data, error } = await admin.from("profiles").update({ is_deleted: true, deleted_at: new Date().toISOString() } as never).eq("id", payload.id as string).eq("id", userId).select().single()
return { error: error?.message?? null, data }
},

// ── HealthMetric ────────────────────────────────────────────
CREATE_HEALTH_METRIC: async (payload, admin) => {
const { data, error } = await admin.from("health_metrics").insert({
pet_id: payload.pet_id as string,
date: payload.date as string,
appetite_score: (payload.appetite_score as number)?? null,
activity_score: (payload.activity_score as number)?? null,
stool_score: (payload.stool_score as number)?? null,
symptom_severity_score: (payload.symptom_severity_score as number)?? null,
weight_delta: (payload.weight_delta as number)?? null,
calculation_method: (payload.calculation_method as string)?? null,
}).select().single()
return { error: error?.message?? null, data }
},

DELETE_HEALTH_METRIC: async (payload, admin) => {
const { data, error } = await admin.from("health_metrics").delete().eq("id", payload.id as string).eq("pet_id", payload.pet_id as string).select().single()
return { error: error?.message?? null, data }
},

// ── HealthReminder ────────────────────────────────────────────
CREATE_HEALTH_REMINDER: async (payload, admin) => {
const { data, error } = await admin.from("health_reminders").insert({
pet_id: payload.pet_id as string,
profile_id: payload.profile_id as string,
reminder_type: payload.reminder_type as string,
title: payload.title as string,
description: (payload.description as string)?? null,
due_date: payload.due_date as string,
repeat_interval: (payload.repeat_interval as string)?? null,
repeat_end_date: (payload.repeat_end_date as string)?? null,
}).select().single()
return { error: error?.message?? null, data }
},

UPDATE_HEALTH_REMINDER: async (payload, admin) => {
const id = payload.id as string
const profileId = payload.profile_id as string
if (!id ||!profileId) return { error: "id and profile_id required", data: null }
const update: Record<string, unknown> = {}
const allowed = [
"reminder_type", "title", "description", "due_date",
"repeat_interval", "repeat_end_date", "is_completed",
] as const
for (const k of allowed) {
if (payload[k]!== undefined) update[k] = payload[k]
}
if (Object.keys(update).length === 0) return { error: "no fields to update", data: null }
// 标记Done时自动填充 completed_at
if (update.is_completed === true) {
update.completed_at = new Date().toISOString()
}
update.updated_at = new Date().toISOString()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (admin as any).from("health_reminders").update(update).eq("id", id).eq("profile_id", profileId).select().single()
return { error: error?.message?? null, data }
},

DELETE_HEALTH_REMINDER: async (payload, admin) => {
const { data, error } = await admin.from("health_reminders").delete().eq("id", payload.id as string).eq("profile_id", payload.profile_id as string).select().single()
return { error: error?.message?? null, data }
},
}

export async function POST(request: Request) {
try {
const { type, payload, metadata } = await request.json()

if (!type ||!payload) {
return Response.json({ error: "type and payload required" }, { status: 400 })
}

// Get authenticated user from session cookie or Bearer token
const supabase = await createClient()
const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
const bearer = authHeader?.toLowerCase().startsWith("bearer ")? authHeader.slice(7).trim(): null

let user: { id: string } | null = null
let authError: { message: string } | null = null
if (bearer) {
const r = await supabase.auth.getUser(bearer)
user = r.data?.user?? null
authError = r.error?? null
} else {
const r = await supabase.auth.getUser()
user = r.data?.user?? null
authError = r.error?? null
}

if (authError ||!user) {
return Response.json({ error: "Unauthorized" }, { status: 401 })
}

const intent: WriteIntent = {
id: crypto.randomUUID(),
type,
actor: user.id,
payload,
timestamp: Date.now(),
idempotencyKey: generateIdempotencyKey(type, payload),
source: "api",
metadata,
}

// 服务端注 身 文,客户端not can覆盖(防越权)
const enrichedPayload: Record<string, unknown> = {...payload,
profile_id: user.id,
}

// For direct-write types, bypass EventBus and execute DB directly
const directHandler = DIRECT_WRITE_TYPES[type]
if (directHandler) {
const admin = createAdminClient()
const { error, data } = await directHandler(enrichedPayload, admin)
if (error) {
return Response.json({ error }, { status: 400 })
}
const result: WriteResult = {
intentId: intent.id,
eventId: null,
jobId: null,
status: "accepted",
}
return Response.json({ success: true, intentId: result.intentId, eventId: result.eventId, status: result.status, data: data?? null })
}

// For domain event types, go through WriteGateway + EventBus
const result = await getWriteGateway().submit(intent)

if (result.status === "rejected") {
return Response.json({ error: result.reason }, { status: 400 })
}

return Response.json({ success: true, intentId: result.intentId, eventId: result.eventId, status: result.status })
} catch (error) {
return Response.json({ error: error instanceof Error? error.message: "Gateway write failed" }, { status: 500 })
}
}
