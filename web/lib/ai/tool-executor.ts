// =============================================
// AI Tool Executor
// =============================================
// Bridges AI tool calls (from LLM function calling) to actual
// database write operations using the Supabase admin client directly.
// Each tool name maps to a handler that performs the appropriate
// DB operations and returns a result for the AI to narrate.

import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/database.types"

type PetRow = Database["public"]["Tables"]["pets"]["Row"]

export interface ToolCallResult {
success: boolean
message: string
data?: Record<string, unknown>
}

// ── Helper: find pet by name (fuzzy match) ──

async function findPetByName(supabase: ReturnType<typeof createAdminClient>,
userId: string,
petName: string): Promise<{ pet: PetRow | null; ambiguous: boolean; candidates: PetRow[] }> {
// First try exact match (case-insensitive)
const { data: exactMatch } = await supabase.from("pets").select("*").eq("profile_id", userId).eq("is_active", true).ilike("name", petName.trim())

if (exactMatch && exactMatch.length === 1) {
return { pet: exactMatch[0] as PetRow, ambiguous: false, candidates: [] }
}

if (exactMatch && exactMatch.length > 1) {
return { pet: null, ambiguous: true, candidates: exactMatch as PetRow[] }
}

// Try partial match (contains)
const { data: partialMatch } = await supabase.from("pets").select("*").eq("profile_id", userId).eq("is_active", true).ilike("name", `%${petName.trim()}%`).limit(5)

if (partialMatch && partialMatch.length === 1) {
return { pet: partialMatch[0] as PetRow, ambiguous: false, candidates: [] }
}

if (partialMatch && partialMatch.length > 1) {
return { pet: null, ambiguous: true, candidates: partialMatch as PetRow[] }
}

// No match — get all pets to help AI ask which one
const { data: allPets } = await supabase.from("pets").select("name, species, breed").eq("profile_id", userId).eq("is_active", true)

return {
pet: null,
ambiguous: false,
candidates: (allPets?? []) as unknown as PetRow[],
}
}

// ── Helper: format pet not found / ambiguous error message ──

function formatPetNotFoundError(petName: string, candidates: PetRow[]): string {
if (candidates.length > 0) {
const names = candidates.map((p) => p.name).join(", ")
return `Could not find a pet named "${petName}". Your current pets are: ${names}. Please tell Pomi which fur baby you mean~`
}
return `Could not find a pet named "${petName}". Please create a profile first or check if the name is correct.`
}

function formatPetAmbiguousError(petName: string, candidates: PetRow[]): string {
const names = candidates.map((p) => `${p.name} (${p.breed?? p.species})`).join(", ")
return `Found multiple pets named "${petName}": ${names}. Please tell Pomi which one you mean~`
}

// ── Main executor ──

export async function executeToolCall(toolName: string,
args: Record<string, unknown>,
userId: string): Promise<ToolCallResult> {
const supabase = createAdminClient()

switch (toolName) {
// ── Create Pet ──
case "create_pet": {
const { data, error } = await supabase.from("pets").insert({
profile_id: userId,
name: args.name as string,
species: (args.species as "cat" | "dog" | "other")?? "other",
breed: (args.breed as string)?? null,
gender: (args.gender as "male" | "female" | "unknown")?? "unknown",
age_years: (args.age_years as number)?? 0,
weight_kg: (args.weight_kg as number)?? null,
neutered: (args.neutered as boolean)?? null,
stomach_health: (args.stomach_health as "normal" | "sensitive" | "very_sensitive")?? "normal",
birth_date: (args.birth_date as string)?? null,
is_active: true,
}).select().single()

if (error) {
return { success: false, message: `failed to create pet profile: ${error.message}` }
}
return {
success: true,
message: `Successfully created a profile for "${args.name}"!`,
data: data as Record<string, unknown>,
}
}

// ── Update Pet ──
case "update_pet": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) {
return { success: false, message: formatPetNotFoundError(petName, candidates) }
}
if (ambiguous) {
return { success: false, message: formatPetAmbiguousError(petName, candidates) }
}

const update: Record<string, unknown> = {}
const fields = ["breed", "gender", "age_years", "weight_kg", "neutered", "stomach_health", "birth_date", "disease_history", "medication_log"]
for (const f of fields) {
if (args[f]!== undefined) update[f] = args[f]
}
if (Object.keys(update).length === 0) {
return { success: false, message: "No fields to update" }
}
update.updated_at = new Date().toISOString()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (supabase as any).from("pets").update(update).eq("id", pet.id).eq("profile_id", userId).select().single()

if (error) {
return { success: false, message: `failed to update pet info: ${error.message}` }
}
return {
success: true,
message: `Successfully updated "${pet.name}"'s profile!`,
data: data as Record<string, unknown>,
}
}

// ── records Weight ──
case "record_weight": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const weightKg = args.weight_kg as number
const date = (args.date as string)?? new Date().toISOString()

// 1. Update pet's current weight
const { error: weightErr } = await supabase.from("pets").update({ weight_kg: weightKg, updated_at: new Date().toISOString() }).eq("id", pet.id).eq("profile_id", userId)

// 2. Create a health record for the weight measurement
const { data: healthData, error: healthErr } = await supabase.from("health_records").insert({
pet_id: pet.id,
profile_id: userId,
record_type: "weight",
record_time: date,
weight_kg: weightKg,
notes: (args.notes as string)?? null,
}).select().single()

if (weightErr || healthErr) {
const errMsg = weightErr?.message?? healthErr?.message?? "Unknown error"
return { success: false, message: `failed to record weight: ${errMsg}` }
}

return {
success: true,
message: `Successfully recorded "${pet.name}"'s weight: ${weightKg}kg!`,
data: { weight_kg: weightKg, pet_name: pet.name, record: healthData },
}
}

// ── records Diet ──
case "record_diet": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const { data, error } = await supabase.from("diet_logs").insert({
pet_id: pet.id,
profile_id: userId,
food_name: args.food_name as string,
food_type: (args.food_type as string)?? null,
logged_date: (args.date as string)?? new Date().toISOString(),
notes: (args.notes as string)?? null,
}).select().single()

if (error) {
return { success: false, message: `failed to record diet: ${error.message}` }
}
return {
success: true,
message: `Successfully recorded "${pet.name}"'s diet: ${args.food_name}!`,
data: data as Record<string, unknown>,
}
}

// ── records Vaccination/Deworming ──
case "record_vaccination": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const { data, error } = await supabase.from("health_records").insert({
pet_id: pet.id,
profile_id: userId,
record_type: (args.record_type as string)?? "vaccination",
record_time: (args.date as string)?? new Date().toISOString(),
medication_name: args.medication_name as string,
vet_clinic: (args.vet_clinic as string)?? null,
vet_name: (args.vet_name as string)?? null,
notes: (args.notes as string)?? null,
}).select().single()

if (error) {
return { success: false, message: `failed to record vaccination/deworming info: ${error.message}` }
}
const typeLabel = args.record_type === "deworming"? "Deworming": "Vaccine"
return {
success: true,
message: `Successfully recorded "${pet.name}"'s ${typeLabel} info: ${args.medication_name}!`,
data: data as Record<string, unknown>,
}
}

// ── records Disease ──
case "record_disease": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const { data, error } = await supabase.from("pet_disease_records").insert({
pet_id: pet.id,
name: args.name as string,
diagnosed_on: (args.diagnosed_on as string)?? null,
status: (args.status as string)?? "unknown",
severity: (args.severity as string)?? "unknown",
symptoms: (args.symptoms as string)?? null,
notes: (args.notes as string)?? null,
}).select().single()

if (error) {
return { success: false, message: `failed to record disease info: ${error.message}` }
}
return {
success: true,
message: `Successfully recorded "${pet.name}"'s disease info: ${args.name}!`,
data: data as Record<string, unknown>,
}
}

// ── records Medication ──
case "record_medication": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const { data, error } = await supabase.from("pet_medication_records").insert({
pet_id: pet.id,
name: args.name as string,
dosage: (args.dosage as string)?? null,
frequency: (args.frequency as string)?? null,
started_on: (args.started_on as string)?? null,
ended_on: (args.ended_on as string)?? null,
is_ongoing: (args.is_ongoing as boolean)?? true,
notes: (args.notes as string)?? null,
}).select().single()

if (error) {
return { success: false, message: `failed to record medication info: ${error.message}` }
}
return {
success: true,
message: `Successfully recorded "${pet.name}"'s medication info: ${args.name}!`,
data: data as Record<string, unknown>,
}
}

// ── records Allergy ──
case "record_allergy": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const { data, error } = await supabase.from("pet_allergies").insert({
pet_id: pet.id,
allergen: args.allergen as string,
severity: (args.severity as string)?? null,
confirmed: (args.confirmed as boolean)?? false,
}).select().single()

if (error) {
return { success: false, message: `failed to record allergy info: ${error.message}` }
}
return {
success: true,
message: `Successfully recorded "${pet.name}"'s allergy info: ${args.allergen}!`,
data: data as Record<string, unknown>,
}
}

// ── records Symptom ──
case "record_symptom": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const { data, error } = await supabase.from("health_records").insert({
pet_id: pet.id,
profile_id: userId,
record_type: "symptom",
record_time: (args.date as string)?? new Date().toISOString(),
symptom_code: args.symptom_code as string,
severity: (args.severity as number)?? null,
duration_days: (args.duration_days as number)?? null,
notes: (args.notes as string)?? null,
}).select().single()

if (error) {
return { success: false, message: `failed to record symptom info: ${error.message}` }
}
return {
success: true,
message: `Successfully recorded "${pet.name}"'s symptom: ${args.symptom_code}!`,
data: data as Record<string, unknown>,
}
}

// ── records Check-up ──
case "record_checkup": {
const petName = (args.pet_name as string)?.trim?.() || ""
if (!petName) return { success: false, message: "No pet name provided. Please tell Pomi which fur baby~" }
const { pet, ambiguous, candidates } = await findPetByName(supabase, userId, petName)

if (!pet) return { success: false, message: formatPetNotFoundError(petName, candidates) }
if (ambiguous) return { success: false, message: formatPetAmbiguousError(petName, candidates) }

const { data, error } = await supabase.from("health_records").insert({
pet_id: pet.id,
profile_id: userId,
record_type: "checkup",
record_time: (args.date as string)?? new Date().toISOString(),
vet_clinic: (args.vet_clinic as string)?? null,
vet_name: (args.vet_name as string)?? null,
diagnosis: (args.diagnosis as string)?? null,
notes: (args.notes as string)?? null,
}).select().single()

if (error) {
return { success: false, message: `failed to record check-up info: ${error.message}` }
}
return {
success: true,
message: `Successfully recorded "${pet.name}"'s check-up info!`,
data: data as Record<string, unknown>,
}
}

default:
return { success: false, message: `Unknown tool: ${toolName}` }
}
}
