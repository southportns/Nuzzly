// =============================================
// AI Chat Tool Definitions (LLM function calling schema)
// =============================================
// These definitions tell the LLM what tools are available for
// managing pet data through natural conversation.
// Each tool maps to a handler in tool-executor.ts

export interface ChatTool {
type: "function"
function: {
name: string
description: string
parameters: {
type: "object"
properties: Record<string, {
type: string
description: string
enum?: string[]
}>
required: string[]
}
}
}

export const TOOLS: ChatTool[] = [
// ── Create Pet ──────────────────────────────────────────
{
type: "function",
function: {
name: "create_pet",
description: "Create a new pet profile. Call this when the user wants to add a new pet.",
parameters: {
type: "object",
properties: {
name: { type: "string", description: "Pet name" },
species: { type: "string", description: "Species", enum: ["cat", "dog", "other"] },
breed: { type: "string", description: "Breed, e.g.'Ragdoll','Golden Retriever'" },
gender: { type: "string", description: "Gender", enum: ["male", "female", "unknown"] },
age_years: { type: "number", description: "Age in years" },
weight_kg: { type: "number", description: "Weight in kg" },
neutered: { type: "boolean", description: "Whether neutered" },
stomach_health: { type: "string", description: "Stomach health condition", enum: ["normal", "sensitive", "very_sensitive"] },
birth_date: { type: "string", description: "Birth date in ISO format, e.g. 2023-05-01" },
},
required: ["name", "species"],
},
},
},
{
type: "function",
function: {
name: "update_pet",
description: "Update an existing pet's profile information. Call this when the user wants to modify breed, age, weight, neuter status, etc.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
breed: { type: "string", description: "Breed" },
gender: { type: "string", description: "Gender", enum: ["male", "female", "unknown"] },
age_years: { type: "number", description: "Age in years" },
weight_kg: { type: "number", description: "Weight in kg" },
neutered: { type: "boolean", description: "Whether neutered" },
stomach_health: { type: "string", description: "Stomach health condition", enum: ["normal", "sensitive", "very_sensitive"] },
birth_date: { type: "string", description: "Birth date in ISO format" },
disease_history: { type: "string", description: "Disease history notes" },
medication_log: { type: "string", description: "Medication notes" },
},
required: ["pet_name"],
},
},
},

// ── records Weight ──────────────────────────────────────────
{
type: "function",
function: {
name: "record_weight",
description: "records a pet's weight. Call this when the user says something like'my cat weighed X kg today' or'help me record weight'. This will update the pet's basic info and create a health record.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
weight_kg: { type: "number", description: "Weight in kg" },
date: { type: "string", description: "records date in ISO format, defaults to today" },
notes: { type: "string", description: "Notes" },
},
required: ["pet_name", "weight_kg"],
},
},
},

// ── records Diet ──────────────────────────────────────────
{
type: "function",
function: {
name: "record_diet",
description: "records a pet's diet log. Call this when the user describes what food the pet ate.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
food_name: { type: "string", description: "Food name" },
food_type: { type: "string", description: "Food type, e.g.'Staple Food','Treats','Canned Food','Freeze-Dried','Homemade'" },
notes: { type: "string", description: "Notes, e.g. portion size, reaction" },
date: { type: "string", description: "records date in ISO format, defaults to today" },
},
required: ["pet_name", "food_name"],
},
},
},

// ── records Vaccination/Deworming ─────────────────────────────────────
{
type: "function",
function: {
name: "record_vaccination",
description: "records a pet's vaccination or deworming info. Call this when the user says'got vaccinated today' or'did deworming'.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
medication_name: { type: "string", description: "Vaccine or deworming medication name, e.g.'FVRCP','Rabies','Revolution','Bravecto'" },
record_type: { type: "string", description: "records type", enum: ["vaccination", "deworming"] },
vet_clinic: { type: "string", description: "Vet clinic name" },
vet_name: { type: "string", description: "Vet name" },
date: { type: "string", description: "records date in ISO format, defaults to today" },
notes: { type: "string", description: "Notes" },
},
required: ["pet_name", "medication_name", "record_type"],
},
},
},

// ── records Disease ──────────────────────────────────────────
{
type: "function",
function: {
name: "record_disease",
description: "records a pet's disease information. Call this when the user describes the pet being sick or diagnosed with a disease.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
name: { type: "string", description: "Disease name" },
diagnosed_on: { type: "string", description: "Diagnosis date in ISO format" },
status: { type: "string", description: "Disease status", enum: ["active", "recovering", "recovered", "chronic", "unknown"] },
severity: { type: "string", description: "Severity level", enum: ["mild", "moderate", "severe", "unknown"] },
symptoms: { type: "string", description: "Symptom description" },
notes: { type: "string", description: "Notes" },
},
required: ["pet_name", "name"],
},
},
},

// ── records Medication ──────────────────────────────────────────
{
type: "function",
function: {
name: "record_medication",
description: "records a pet's medication information. Call this when the user describes the pet taking medication or starting a new medication.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
name: { type: "string", description: "Medication name" },
dosage: { type: "string", description: "Dosage, e.g.'0.5ml','1 tablet'" },
frequency: { type: "string", description: "Medication frequency, e.g.'twice daily','every other day'" },
started_on: { type: "string", description: "Start date in ISO format" },
ended_on: { type: "string", description: "End date in ISO format" },
is_ongoing: { type: "boolean", description: "Whether the medication is ongoing" },
notes: { type: "string", description: "Notes" },
},
required: ["pet_name", "name"],
},
},
},

// ── records Allergy ──────────────────────────────────────────
{
type: "function",
function: {
name: "record_allergy",
description: "records a pet's allergy information. Call this when the user describes the pet being allergic to a food or substance.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
allergen: { type: "string", description: "Allergen, e.g.'chicken','beef','grains'" },
severity: { type: "string", description: "Severity level", enum: ["mild", "moderate", "severe"] },
confirmed: { type: "boolean", description: "Whether confirmed (true = confirmed, false = suspected)" },
},
required: ["pet_name", "allergen"],
},
},
},

// ── records Symptom ──────────────────────────────────────────
{
type: "function",
function: {
name: "record_symptom",
description: "records a pet's symptom. Call this when the user describes the pet showing symptoms (e.g. vomiting, soft stool, loss of appetite).",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
symptom_code: { type: "string", description: "Symptom code or description, e.g.'vomiting','diarrhea','loss_of_appetite','lethargy'" },
severity: { type: "number", description: "Severity level 1-5, 5 being most severe" },
duration_days: { type: "number", description: "Number of days the symptom has lasted" },
notes: { type: "string", description: "Notes" },
date: { type: "string", description: "records date in ISO format, defaults to today" },
},
required: ["pet_name", "symptom_code"],
},
},
},

// ── records Check-up ──────────────────────────────────────────
{
type: "function",
function: {
name: "record_checkup",
description: "records a pet's check-up information. Call this when the user describes taking the pet for a vet check-up.",
parameters: {
type: "object",
properties: {
pet_name: { type: "string", description: "Pet name (used to find the pet)" },
vet_clinic: { type: "string", description: "Vet clinic name" },
vet_name: { type: "string", description: "Vet name" },
diagnosis: { type: "string", description: "Diagnosis result" },
notes: { type: "string", description: "Notes" },
date: { type: "string", description: "records date in ISO format, defaults to today" },
},
required: ["pet_name"],
},
},
},
]

export const TOOL_NAMES = new Set(TOOLS.map((t) => t.function.name))
