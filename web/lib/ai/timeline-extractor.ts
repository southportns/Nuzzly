// =============================================
// AI Timeline Extractor — LLM-powered Review Text Structuring
// Feature: Structurize user review text into timeline event sequences
// Architecture: Front-end of the Timeline-First Architecture
// Calling method: server-side library function (non-streaming), fetch + JSON parsing
// =============================================

import { getLLMConfig } from "@/lib/ai/llm-provider"

// ─── Types ──────────────────────────────────────────────────────────────

export interface TimelineEvent {
day: string
event_type: string
status: string
symptom: string | null
severity: number | null
sentiment: string | null
sentiment_score: number | null
confidence: number
extracted_text: string | null
}

export interface TimelineExtraction {
events: TimelineEvent[]
model: string
}

// ─── Constants ──────────────────────────────────────────────────────────

// Valid pet_event_type values (aligned with lib/supabase/types.ts PetEventType)
const VALID_EVENT_TYPES = new Set([
// Diet events
"food_start", "food_stop", "food_switch", "food_amount_change",
// Health events
"symptom_observed", "symptom_resolved", "weight_change",
"energy_change", "appetite_change",
// Medical events
"vet_visit", "diagnosis", "medication_start", "medication_stop", "vaccination",
// Behavior events
"behavior_change", "environment_change",
// Data events
"review_posted", "followup_completed", "photo_uploaded",
])

const SYSTEM_PROMPT = `You are a professional pet food review timeline extraction engine. Your task is to extract structured timeline event sequences from user-written pet food review text.

## Extraction Rules

1. Identify all events related to pet diet, health, and behavior from the text
2. Each event must include:
- day: When the event occurred (relative days, e.g. "Day 1", "Day 3", "About 2 weeks later"; use "Unknown" if the exact day cannot be determined)
- event_type: Event type (must select the best match from the valid types below)
- status: Event nature ("positive" / "negative" / "neutral")
- symptom: Symptom name involved (e.g. "Soft Stool", "Vomiting", "Black Chin", "Shedding", "Loss of Appetite", etc.; null if no symptom)
- severity: Severity 1-5 (1=very minor, 5=very severe; null if not applicable)
- sentiment: Sentimentto ("positive" / "negative" / "neutral")
- sentiment_score: Sentiment score -1.0 to 1.0 (negative=negative, positive=positive, 0=neutral)
- confidence: Extraction confidence 0.0 to 1.0 (how certain you are about this extraction)
- extracted_text: Supporting quote from the original text (null if no explicit quote)

3. Valid event types (event_type):
- Diet events: food_start (started eating), food_stop (stopped eating), food_switch (food transition), food_amount_change (amount change)
- Health events: symptom_observed (symptom observed), symptom_resolved (symptom resolved), weight_change (weight change), energy_change (energy level change), appetite_change (appetite change)
- Medical events: vet_visit (vet visit), diagnosis (diagnosis), medication_start (started medication), medication_stop (stopped medication), vaccination (vaccination)
- Behavior events: behavior_change (behavior change), environment_change (environment change)
- Data events: review_posted (review posted), followup_completed (followup completed), photo_uploaded (photo uploaded)

4. Notes:
- Only extract events explicitly mentioned in the text; do not speculate or fabricate
- Timeline should be arranged in logical order
- If the user mentions "developed symptom Y after eating X for N days", this should be split into food_start and symptom_observed events
- Symptom resolution should be recorded separately as symptom_resolved
- Food transition process should be recorded as food_switch + possible food_start/food_stop
- Even if the text is short, attempt extraction (may only have 1 event)
- If no events can be extracted at all, return an empty array

## Output Format

Strictly return a JSON array, without any additional text, markdown, or explanation.
Format: [{ "day": "...", "event_type": "...",... }]`

// ─── Internal Helpers ───────────────────────────────────────────────────

/**
* Call LLM chat completions API (non-streaming).
* Returns the parsed JSON from response.
*/
async function callLLM(messages: Array<{ role: string; content: string }>,
options?: { temperature?: number; max_tokens?: number }): Promise<string> {
const config = getLLMConfig()
if (!config.apiKey) {
throw new Error(`[timeline-extractor] Missing API key for provider: ${config.provider}`)
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
temperature: options?.temperature?? 0.3, // Low temperature for stable structured output
max_tokens: options?.max_tokens?? 4096,
response_format: { type: "json_object" },
}),
})

if (!response.ok) {
const errText = await response.text().catch(() => "unknown error")
console.error(`[timeline-extractor] ${config.provider} API error:`, response.status, errText)
throw new Error(`[timeline-extractor] ${config.provider} API returned ${response.status}: ${errText}`)
}

const json = (await response.json()) as {
choices?: Array<{ message?: { content?: string } }>
}
const content = json.choices?.[0]?.message?.content
if (!content || typeof content!== "string") {
throw new Error(`[timeline-extractor] Empty or invalid response from ${config.provider}`)
}

return content.trim()
}

/**
* Parse and validate extracted timeline events from LLM output.
* Filters out invalid event types and normalizes fields.
*/
function parseAndValidateEvents(raw: unknown): TimelineEvent[] {
let parsed: unknown[]

if (Array.isArray(raw)) {
parsed = raw
} else if (typeof raw === "string") {
try {
const obj = JSON.parse(raw)
if (Array.isArray(obj)) {
parsed = obj
} else if (obj && typeof obj === "object" && "events" in obj && Array.isArray(obj.events)) {
parsed = obj.events
} else {
console.warn("[timeline-extractor] Unexpected JSON structure, returning empty")
return []
}
} catch {
console.warn("[timeline-extractor] failed to parse LLM response as JSON")
return []
}
} else {
return []
}

return parsed.filter((item): item is Record<string, unknown> =>
item!== null && typeof item === "object" && "event_type" in item && typeof (item as Record<string, unknown>).event_type === "string").map((item): TimelineEvent => {
const eventType = String(item.event_type?? "unknown")
// Map unknown event types to closest valid type, or keep as-is if not in allowlist
const normalizedType = VALID_EVENT_TYPES.has(eventType)? eventType: "symptom_observed"

return {
day: typeof item.day === "string"? item.day: "Unknown",
event_type: normalizedType,
status: ["positive", "negative", "neutral"].includes(String(item.status?? ""))? (String(item.status) as "positive" | "negative" | "neutral"): "neutral",
symptom: typeof item.symptom === "string" && item.symptom.length > 0? item.symptom: null,
severity: typeof item.severity === "number" && item.severity >= 1 && item.severity <= 5? Math.round(item.severity): null,
sentiment: ["positive", "negative", "neutral"].includes(String(item.sentiment?? ""))? (String(item.sentiment) as "positive" | "negative" | "neutral"): null,
sentiment_score: typeof item.sentiment_score === "number"? Math.max(-1, Math.min(1, Number(item.sentiment_score.toFixed(2)))): null,
confidence: typeof item.confidence === "number"? Math.max(0, Math.min(1, Number(item.confidence.toFixed(2)))): 0.5,
extracted_text: typeof item.extracted_text === "string" && item.extracted_text.length > 0? item.extracted_text: null,
}
}).filter((evt) => evt.day!== null) // filter out completely invalid entries
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
* Extract timeline events from a raw review text using the configured LLM.
*
* This is the core data ingestion point for the Timeline-First Architecture.
* It converts unstructured user reviews into structured timeline events
* that feed into context-builder → metrics-engine → recommendation pipeline.
*
* @param input - The review text and date to analyze
* @returns Structured timeline extraction with events array and model info
*
* @example
* ```ts
* const result = await extractTimeline({
* review_text: "Started getting soft stool after 3 days of eating, vomited once on day 5, switched back and it got better",
* review_date: new Date().toISOString(),
* })
* // result.events = [
* // { day: "Day 1", event_type: "food_start", status: "positive",... },
* // { day: "Day 3", event_type: "symptom_observed", symptom: "Soft Stool", severity: 2,... },
* // { day: "Day 5", event_type: "symptom_observed", symptom: "Vomiting", severity: 3,... },
* // { day: "After Day 5", event_type: "food_switch", status: "positive",... },
* // { day: "After Day 5", event_type: "symptom_resolved", symptom: "Soft Stool",... },
* // ]
* ```
*/
export async function extractTimeline(_input: {
review_text: string
review_date: string
}): Promise<TimelineExtraction> {
const { review_text, review_date } = _input

const config = getLLMConfig()
const model = config.model

// Guard: empty or too-short input
if (!review_text || review_text.trim().length < 5) {
return { events: [], model: `${model}-skipped` }
}

let events: TimelineEvent[] = []

try {
const userMessage = `${SYSTEM_PROMPT}

---
Review Date: ${review_date}
Review Content:
"""${review_text}"""

Please return the extraction result as a JSON array:`

const rawResponse = await callLLM([
{ role: "system", content: SYSTEM_PROMPT },
{ role: "user", content: userMessage },
])

// Parse LLM response
let parsedRaw: unknown
try {
parsedRaw = JSON.parse(rawResponse)
} catch {
// If direct parse fails, try to extract JSON array from the response
const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
if (jsonMatch) {
try {
parsedRaw = JSON.parse(jsonMatch[0])
} catch {
console.warn("[timeline-extractor] Could not extract JSON array from response")
parsedRaw = []
}
} else {
parsedRaw = []
}
}

events = parseAndValidateEvents(parsedRaw)

console.log(`[timeline-extractor] Extracted ${events.length} events from review (${review_text.length} chars)`)
} catch (error) {
// Graceful degradation: return empty events rather than crashing
console.error("[timeline-extractor] Extraction failed:", error)
events = []
}

return { events, model }
}
