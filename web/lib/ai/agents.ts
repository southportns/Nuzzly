// =============================================
// AI Agents Pipeline — LLM-powered Product Recommendations
// Feature: Generate recommended product list based on pet profile + user query
// Architecture: Agent pipeline entry for the Recommendation engine
// Calling method: server-side library function (non-streaming), fetch + JSON parsing
//
// ⚠️ returnward Compatibility Note:
// This module is called by lib/timeline/agent-migration.ts,
// which passes parameters in the shape { petId, userId?, sessionId?, query?, filters? }
// and expects each item in recommendations to contain a.product sub-object.
// Therefore this implementation supports two calling modes:
// - Legacy mode (used by agent-migration): { petId, query?, filters? }
// - Full mode (direct call): { petProfile, query, context?, options? }
// =============================================

// ─── Types ──────────────────────────────────────────────────────────────

/** Single product item in RecommendationResult — compatible with agent-migration.ts's.product access pattern */
export interface Recommendation {
product: {
id: string
name: string
brand: string
price_max: number | null
}
score: number
confidence: number
dimensions?: Record<string, number>
explanation: string
}

export interface Warning {
type: string
message: string
severity: "low" | "medium" | "high"
}

export interface PipelineResult {
recommendations: Recommendation[]
warnings: Warning[]
summary: string
}

/** Legacy calling mode — input shape used by agent-migration.ts */
export interface LegacyPipelineInput {
petId: string
userId?: string
sessionId?: string
query?: string
filters?: {
category?: string
maxPrice?: number
}
}

/** Full calling mode — rich input shape for direct usage */
export interface FullPipelineInput {
petProfile: {
id: string
name: string
species: string // "cat" | "dog"
breed?: string | null
age_months?: number | null
weight_kg?: number | null
health_notes?: string | null
allergies?: string[] | null
dietary_restrictions?: string[] | null
}
query: string
context?: {
timeline_events?: Array<{
day: string
event_type: string
status: string
symptom: string | null
severity: number | null
}>
current_product_id?: string | null
current_product_name?: string | null
} | null
options?: {
max_results?: number
include_explanation?: boolean
}
}

/** Union type: supports both calling modes */
export type PipelineInput = LegacyPipelineInput | FullPipelineInput

import { getLLMConfig } from "@/lib/ai/llm-provider"

const SYSTEM_PROMPT = `You are a professional pet food recommendation AI assistant, specializing in providing data-driven product recommendations for cats (and dogs).

## Your Capabilities

1. Analyze needs based on pet characteristics (breed, age, weight, health status, allergy history, dietary restrictions)
2. Match products based on the user's specific query intent (e.g., "food transition", "soft stool", "weight gain", etc.)
3. Understand the pet's reaction patterns to current products using timeline event data (if provided)
4. Output structured recommendation lists with scores, confidence, dimension analysis, and explanations

## Recommendation Principles

- **Safety First**: If the pet has known allergies or contraindicated ingredients, flag them in warnings
- **Evidence-Driven**: Each recommendation must have reasonable explanatory basis (e.g., "suitable for sensitive stomach", "hypoallergenic formula")
- **Honest & Transparent**: Lower confidence for uncertain recommendations, give warnings for high-risk situations
- **No Fabrication**: Only reason based on provided pet info and query — do not fabricate product information

## Scoring (score)

- 0-100 scale
- 90+: High match, strongly recommended
- 70-89: Good match, worth trying
- 50-69: Average match, can serve as a backup option
- <50: Low match, not recommended

## Dimension Analysis (dimensions)

Each recommendation can include sub-scores (0-100) for:
- digestibility: Digestibility match
- palatability: Expected palatability
- safety: Safety (considering allergies/contraindications)
- goal_alignment: Goal alignment (e.g., weight gain, weight loss, improving soft stool)
- value: Value for money

## Output Format

Strictly return a JSON object in this format:
{
"recommendations": [
{
"id": "product_id or'suggested-' + index",
"name": "Product name",
"brand": "Brand name",
"price_max": Max price or null,
"score": 85,
"confidence": 0.8,
"dimensions": { "digestibility": 90, "safety": 95 },
"explanation": "Detailed explanation of why this product is recommended"
}
],
"warnings": [
{ "type": "allergy_risk", "message": "This pet is allergic to chicken, avoid chicken formulas", "severity": "high" }
],
"summary": "A natural language summary of the recommendation logic and key advice"
}

---

Please generate product recommendations based on the following pet info and user query:`

// ─── Type Guards ───────────────────────────────────────────────────────

function isFullInput(input: PipelineInput): input is FullPipelineInput {
return "petProfile" in input && input.petProfile!== undefined && typeof input.petProfile === "object"
}

// ─── Internal Helpers ───────────────────────────────────────────────────

/**
* Call LLM chat completions API (non-streaming).
* Returns the parsed JSON string from response.
*/
async function callLLMApi(messages: Array<{ role: string; content: string }>,
options?: { temperature?: number; max_tokens?: number }): Promise<string> {
const config = getLLMConfig()
if (!config.apiKey) {
throw new Error(`[agents] Missing API key for provider: ${config.provider}`)
}

const response = await fetch(`${config.baseURL}/chat/completions`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${config.apiKey}`,
},
body: JSON.stringify({
model: config.model,
messages,
stream: false,
temperature: options?.temperature?? 0.5,
max_tokens: options?.max_tokens?? 4096,
response_format: { type: "json_object" },
}),
})

if (!response.ok) {
const errText = await response.text().catch(() => "unknown error")
console.error(`[agents] ${config.provider} API error:`, response.status, errText)
throw new Error(`[agents] API returned ${response.status}: ${errText}`)
}

const json = (await response.json()) as {
choices?: Array<{ message?: { content?: string } }>
}
const content = json.choices?.[0]?.message?.content
if (!content || typeof content!== "string") {
throw new Error(`[agents] Empty or invalid response from ${config.provider}`)
}

return content.trim()
}

/**
* Build a human-readable pet profile summary for the prompt.
*/
function formatPetProfile(petProfile: FullPipelineInput["petProfile"]): string {
const parts: string[] = []
parts.push(`Name: ${petProfile.name}`)
parts.push(`Species: ${petProfile.species === "cat"? "Cat": "Dog"}`)
if (petProfile.breed) parts.push(`Breed: ${petProfile.breed}`)
if (petProfile.age_months) parts.push(`Age: ${petProfile.age_months} months (${(petProfile.age_months / 12).toFixed(1)} years)`)
if (petProfile.weight_kg) parts.push(`Weight: ${petProfile.weight_kg}kg`)
if (petProfile.health_notes) parts.push(`Health Notes: ${petProfile.health_notes}`)
if (petProfile.allergies && petProfile.allergies.length > 0) parts.push(`Allergies: ${petProfile.allergies.join(", ")}`)
if (petProfile.dietary_restrictions && petProfile.dietary_restrictions.length > 0) parts.push(`Dietary Restrictions: ${petProfile.dietary_restrictions.join(", ")}`)
return parts.join("\n")
}

/**
* Format timeline events into a readable summary for context.
*/
function formatTimelineContext(events: NonNullable<NonNullable<FullPipelineInput["context"]>["timeline_events"]>): string {
if (!events || events.length === 0) return "(No timeline data)"

return events.map((e) => {
const symptom = e.symptom? ` [Symptom: ${e.symptom}${e.severity? `, severity ${e.severity}/5`: ""}]`: ""
return ` - Day ${e.day}: ${e.event_type} (${e.status})${symptom}`
}).join("\n")
}

/**
* Parse and validate pipeline result from LLM output.
* Returns recommendations in the shape expected by agent-migration.ts (.product sub-object).
*/
function parseAndValidateResult(raw: unknown): PipelineResult {
let obj: Record<string, unknown>

if (typeof raw === "string") {
try {
obj = JSON.parse(raw)
} catch {
console.warn("[agents] failed to parse LLM response as JSON")
return emptyResult()
}
} else if (raw!== null && typeof raw === "object") {
obj = raw as Record<string, unknown>
} else {
return emptyResult()
}

// Parse recommendations — output format is compatible with agent-migration.ts's.product access pattern
const recommendations: Recommendation[] = []
if (Array.isArray(obj.recommendations)) {
for (const item of obj.recommendations) {
if (item && typeof item === "object") {
const rec = item as Record<string, unknown>
const id = typeof rec.id === "string"? rec.id: `suggested-${recommendations.length + 1}`
recommendations.push({
product: {
id,
name: typeof rec.name === "string"? rec.name: "Unknown Product",
brand: typeof rec.brand === "string"? rec.brand: "Unknown Brand",
price_max: typeof rec.price_max === "number"? rec.price_max: null,
},
score: typeof rec.score === "number"? Math.max(0, Math.min(100, Math.round(rec.score))): 50,
confidence: typeof rec.confidence === "number"? Math.max(0, Math.min(1, Number(rec.confidence.toFixed(2)))): 0.5,
dimensions:
typeof rec.dimensions === "object" && rec.dimensions!== null &&!Array.isArray(rec.dimensions)? (rec.dimensions as Record<string, number>): undefined,
explanation: typeof rec.explanation === "string"? rec.explanation: "",
})
}
}
}

// Parse warnings
const warnings: Warning[] = []
if (Array.isArray(obj.warnings)) {
for (const w of obj.warnings) {
if (w && typeof w === "object") {
const warn = w as Record<string, unknown>
warnings.push({
type: typeof warn.type === "string"? warn.type: "general",
message: typeof warn.message === "string"? warn.message: "Unknown warning",
severity: ["low", "medium", "high"].includes(String(warn.severity?? ""))? (String(warn.severity) as "low" | "medium" | "high"): "medium",
})
}
}
}

// Summary
const summary =
typeof obj.summary === "string"? obj.summary: "Unable to generate recommendation summary"

return { recommendations, warnings, summary }
}

/** Return an empty/failed result gracefully. */
function emptyResult(): PipelineResult {
return {
recommendations: [],
warnings: [],
summary: "Sorry, unable to generate recommendations at this time. Please try again later.",
}
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
* Run the AI agent recommendation pipeline using the configured LLM provider.
*
* Supports two calling conventions:
*
* **Legacy mode** (used by agent-migration.ts):
* ```ts
* runAgentPipeline({ petId, query, filters })
* ```
*
* **Full mode** (for direct use with rich pet profile):
* ```ts
* runAgentPipeline({ petProfile: { id, name, species,... }, query, context })
* ```
*
* In legacy mode, only petId and query are sent to the LLM (no detailed pet profile).
* The LLM will generate generic recommendations based on the query alone.
* For best results, use full mode with complete pet profile data.
*
* @param input - Either legacy or full pipeline input
* @returns Structured pipeline result with recommendations, warnings, and summary
*/
export async function runAgentPipeline(input: PipelineInput): Promise<PipelineResult> {
// ── Guard: minimum required fields ──
const petId = "petId" in input? input.petId: isFullInput(input)? input.petProfile.id: ""
const query = "query" in input? (input.query?? ""): ""

if (!petId ||!query.trim()) {
return emptyResult()
}

const maxResults = "options" in input && input.options?.max_results? input.options.max_results: "filters" in input && input.filters? 5: 5

const config = getLLMConfig()
const model = config.model

try {
// ── Build prompt based on input mode ──
let userMessage: string

if (isFullInput(input)) {
// Full mode: rich pet profile + timeline context
const { petProfile, context } = input

let contextSection = ""
if (context) {
const parts: string[] = []
if (context.current_product_name) {
parts.push(`\nCurrent Product: ${context.current_product_name}${context.current_product_id? ` (${context.current_product_id})`: ""}`)
}
if (context.timeline_events && context.timeline_events.length > 0) {
parts.push(`\nTimeline Events:\n${formatTimelineContext(context.timeline_events)}`)
}
if (parts.length > 0) {
contextSection = "\n\n## Additional Context\n" + parts.join("\n")
}
}

userMessage = `${SYSTEM_PROMPT}

---
## Pet Profile
${formatPetProfile(petProfile)}

## User Query
"${query}"
${contextSection}
---

Please return a JSON object with at most ${maxResults} recommendations:`
} else {
// Legacy mode: minimal info (backward compat with agent-migration.ts)
const filters = ("filters" in input && input.filters)? input.filters: {}
const filterParts: string[] = []
if (filters.category) filterParts.push(`Category Filter: ${filters.category}`)
if (filters.maxPrice) filterParts.push(`Max Price: $${filters.maxPrice}`)

userMessage = `${SYSTEM_PROMPT}

---
## Pet ID
${petId}
${filterParts.length > 0? `\n## Filters\n${filterParts.join("\n")}`: ""}

## User Query
"${query}"
---

Please return a JSON object with at most ${maxResults} recommendations:`
}

// ── Call LLM ──
const rawResponse = await callLLMApi([
{ role: "system", content: SYSTEM_PROMPT },
{ role: "user", content: userMessage },
])

// Parse and validate
const result = parseAndValidateResult(rawResponse)

// Trim to requested max results
if (result.recommendations.length > maxResults) {
result.recommendations = result.recommendations.slice(0, maxResults)
}

console.log(`[agents] Pipeline complete (${model}): ${result.recommendations.length} recommendations, ${result.warnings.length} warnings [mode=${isFullInput(input)? "full": "legacy"}]`)

return result
} catch (error) {
// Graceful degradation — returns empty result instead of crashing
console.error("[agents] Pipeline failed:", error)
return emptyResult()
}
}
