// POST /api/ai/ingredient-vision — Ingredient Analysis Image Recognition (multimodal vision, streaming)
// Receives: { image: string (base64 data URL), note?: string, petId?: string }
// Process: auth → (optional) fetch pet info → build system prompt → call Vision LLM streaming API → SSE push
//
// Provider switch via VISION_PROVIDER env var:
// - "openai" (Primary, Singapore market — GPT-4o vision)
// - "glm" (Testing, free — China only, GLM-4V-Flash)
// - "volcengine" (China production — doubao-seed-1.6-vision)
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============== Provider Configuration ==============
type VisionProvider = "openai" | "glm" | "volcengine"

interface ProviderConfig {
baseURL: string
model: string
apiKeyEnv: string
modelEnv: string
defaultModel: string
label: string
}

const PROVIDERS: Record<VisionProvider, ProviderConfig> = {
// OpenAI GPT-4o (Primary — Singapore market, works globally)
openai: {
baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
model: "",
apiKeyEnv: "OPENAI_API_KEY",
modelEnv: "OPENAI_VISION_MODEL",
defaultModel: "gpt-4o",
label: "OpenAI GPT-4o Vision",
},
// Zhipu GLM-4V-Flash (Testing phase, free — China only)
glm: {
baseURL: "https://open.bigmodel.cn/api/paas/v4",
model: "",
apiKeyEnv: "ZHIPU_API_KEY",
modelEnv: "ZHIPU_VL_MODEL",
defaultModel: "glm-4v-flash",
label: "Zhipu GLM-4V-Flash",
},
// Volcengine Ark doubao-seed-1.6-vision (China production)
volcengine: {
baseURL: "https://ark.cn-beijing.volces.com/api/v3",
model: "",
apiKeyEnv: "VOLCENGINE_ARK_API_KEY",
modelEnv: "VOLCENGINE_VL_MODEL",
defaultModel: "doubao-seed-1.6-vision",
label: "Volcengine Ark doubao-seed-1.6-vision",
},
}

function getProvider(): VisionProvider {
const raw = (process.env.VISION_PROVIDER || "openai").toLowerCase().trim()
if (raw === "glm") return "glm"
if (raw === "volcengine") return "volcengine"
return "openai"
}

function resolveProviderConfig() {
const key = getProvider()
const cfg = {...PROVIDERS[key] }
cfg.model = process.env[cfg.modelEnv] || cfg.defaultModel
return { key, cfg }
}

const BASE_SYSTEM_PROMPT = `You are "Pomi" 🐱, the super cute and intelligent pet care consultant of Nuzzly Town, now focusing on pet food ingredient analysis.

## Your Task
The user will upload an image of a cat/dog food packaging ingredient label. The label typically contains three sections: "Ingredients", "Additives", and "Guaranteed Analysis". You need to recognize the key information and provide a structured analysis.

## Output Template (Must strictly follow these sections)

Meow~ Pomi is here to analyze this ingredient label for you! 🐾

### 1. Formula Overview
Summarize in 2-3 sentences: main ingredient categories, protein source quality, grain/carb status, additive safety.

### 2. Key Ingredient Analysis
List ingredients in their actual order on the label, grouped into these 4 categories (do not list every trace mineral individually — summarize by category):

**Animal Protein Sources** (meat/meat meal/fish meal in the top 5 ingredients):
- **Ingredient name**: role and review (Risk level: **Low/Medium/High**)

**Grain/Carb Sources** (e.g. rice, wheat flour, corn — if none, write "No obvious grain sources"):
- **Ingredient name**: role and review (Risk level)

**Fat & Oil Sources** (e.g. chicken fat, fish oil, beef tallow):
- **Ingredient name**: role and review (Risk level)

**Functional Additives** (e.g. probiotics, enzymes, cellulose, taurine — can be grouped, do not list every vitamin and mineral individually):
- **Category name**: role and review (Risk level)

### 3. Nutritional Metrics Review
Based on the "Guaranteed Analysis" values in the image, review:
- Whether Crude Protein meets standards (Cat food ≥30% excellent, ≥25% acceptable; Dog food ≥25% excellent)
- Whether Crude Fat is appropriate (Cats 10-25%, Dogs 10-20%)
- Whether crude fiber, calcium-phosphorus ratio, etc. are healthy

### 4. Suitable For
- Suitable for: life stage, breed, special needs (e.g. kittens, adult cats, senior cats, cats with sensitive stomachs)
- Not suitable for: which situations to avoid

### 5. Warnings
Only list ingredients or situations that genuinely warrant caution (max 3 items). If none, write "No obvious risk ingredients found."

## Strict Rules (Must Follow)
1. **Group and summarize**: Vitamins and minerals should be combined into a single "Vitamin & Mineral Premix" entry — do not list individually (this prevents duplicate looping)
2. **No duplicates**: Each ingredient appears only once, never repeat
3. **No fabrication**: Skip ingredients that are unclear — do not use "***" or "unknown ingredient" as placeholders
4. **Be concise**: Each bullet point should not exceed 30 words
5. **Use English**: Ingredient names should be in English
6. **Format**: Use Markdown, bold the risk levels, start with "Meow~" or "Woof~", and use appropriate emojis`

// Build pet context text (injected into system prompt)
// Note: all fields enter the LLM context; sensitive info should be sanitized
function buildPetContext(pet: {
name: string
breed: string | null
species: string
stomach_health: string
age_years: number | null
weight_kg: number | null
life_stage: string | null
disease_history: string | null
}): string {
const parts: string[] = [`Name: ${pet.name}`]

parts.push(`Species: ${pet.species === "cat"? "Cat": pet.species === "dog"? "Dog": pet.species}`)
parts.push(`Breed: ${pet.breed?? "Unknown"}`)

if (pet.life_stage) {
const lifeStageMap: Record<string, string> = {
puppy: "Puppy",
kitten: "Kitten",
adult: "Adult",
senior: "Senior",
}
parts.push(`Life Stage: ${lifeStageMap[pet.life_stage]?? pet.life_stage}`)
}

if (pet.age_years!= null) {
parts.push(`Age: ~${pet.age_years} years`)
}

if (pet.weight_kg!= null) {
parts.push(`Weight: ${pet.weight_kg} kg`)
}

// Stomach condition
const stomachMap: Record<string, string> = {
sensitive: "Sensitive (needs hypoallergenic formula, easily digestible protein)",
normal: "Normal",
very_sensitive: "Very Sensitive (needs special care)",
}
if (pet.stomach_health) {
parts.push(`Stomach Condition: ${stomachMap[pet.stomach_health]?? pet.stomach_health}`)
}

// Disease history (truncated to prevent prompt overflow)
if (pet.disease_history && pet.disease_history.trim()) {
const history = pet.disease_history.trim().slice(0, 500)
parts.push(`Disease History: ${history}`)
}

return parts.join("; ")
}

// Auth helper (reused from chat/route.ts)
async function getAuthUser(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
const auth = request.headers.get("authorization") || request.headers.get("Authorization")
const bearer = auth?.toLowerCase().startsWith("bearer ")? auth.slice(7).trim(): null
if (bearer) {
const r = await supabase.auth.getUser(bearer)
return { user: r.data?.user?? null, error: r.error?? null }
}
const r = await supabase.auth.getUser()
return { user: r.data?.user?? null, error: r.error?? null }
}

const MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8MB base64 string limit
const MAX_NOTE_LENGTH = 1000

export async function POST(request: Request) {
try {
const { image, note, petId } = (await request.json().catch(() => ({}))) as {
image?: string
note?: string
petId?: string
}

if (!image || typeof image!== "string") {
return NextResponse.json({ error: "Image is required (base64 data URL)" }, { status: 400 })
}

if (!image.startsWith("data:image/")) {
return NextResponse.json({ error: "Image must be in data URL format" }, { status: 400 })
}

if (image.length > MAX_IMAGE_SIZE) {
return NextResponse.json({ error: "Image too large, please compress before uploading" }, { status: 400 })
}

if (note && typeof note === "string" && note.length > MAX_NOTE_LENGTH) {
return NextResponse.json({ error: "Note text too long" }, { status: 400 })
}

if (petId && typeof petId!== "string") {
return NextResponse.json({ error: "Invalid petId format" }, { status: 400 })
}

// Auth
const supabase = await createClient()
const { user, error: userErr } = await getAuthUser(request, supabase)
if (userErr ||!user) {
return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
}

// Resolve provider config
const { key, cfg } = resolveProviderConfig()
const apiKey = process.env[cfg.apiKeyEnv]
if (!apiKey) {
console.error(`[ai/ingredient-vision] Environment variable ${cfg.apiKeyEnv} not configured (provider=${key})`)
return NextResponse.json({ error: `Vision service not configured (${cfg.label})` },
{ status: 503 },)
}

// Fetch pet info (if petId is provided)
// Use service_role client to bypass RLS, since we already verified auth and ownership
let petContextText = ""
if (petId) {
const { data: petData, error: petErr } = await supabase.from("pets").select("id,name,breed,species,stomach_health,age_years,weight_kg,life_stage,disease_history,profile_id").eq("id", petId).eq("is_active", true).single()

if (petErr ||!petData) {
return NextResponse.json({ error: "failed to fetch pet info" }, { status: 404 })
}

// Security check: ensure the pet belongs to the current authenticated user
if (petData.profile_id!== user.id) {
return NextResponse.json({ error: "Unauthorized access to this pet" }, { status: 403 })
}

petContextText = buildPetContext(petData)
}

// Customize system prompt based on whether pet info is available
const systemPrompt = petContextText? `${BASE_SYSTEM_PROMPT}\n\n## Current Analysis Target Pet\n${petContextText}\n\nPlease provide a targeted analysis based on this pet's specific situation (breed, age, stomach condition, disease history, etc.), paying special attention to:\n- Whether it suits the breed's nutritional needs\n- Whether it may worsen existing stomach issues\n- Whether it conflicts with disease history (e.g. allergens)\n- Provide specific advice for this pet`: BASE_SYSTEM_PROMPT

// Build messages (OpenAI vision format, compatible across all providers)
const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
{
type: "text",
text:
note && note.trim()? `Please analyze this pet food ingredient label image. User note: ${note.trim()}`: "Please analyze this pet food ingredient label image, identify all ingredients, and provide a risk assessment.",
},
{ type: "image_url", image_url: { url: image } },
]

const apiMessages = [
{ role: "system", content: systemPrompt },
{ role: "user", content: userContent },
]

// Call Vision streaming API (OpenAI-compatible format)
const response = await fetch(`${cfg.baseURL}/chat/completions`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${apiKey}`,
},
body: JSON.stringify({
model: cfg.model,
messages: apiMessages,
stream: true,
// Tuning notes:
// - temperature 0.5 balances stability and avoids looping
// - top_p 0.82 limits candidate token range, reducing low-quality tokens
// - frequency_penalty 0.5 strongly penalizes duplicate tokens
// - presence_penalty 0.4 encourages introducing new topics
temperature: 0.5,
top_p: 0.82,
frequency_penalty: 0.5,
presence_penalty: 0.4,
max_tokens: 1024,
}),
})

if (!response.ok) {
const err = await response.text()
console.error(`[ai/ingredient-vision] ${cfg.label} error:`, err)
return NextResponse.json({ error: "AI service temporarily unavailable" }, { status: 502 })
}

// Stream SSE response (same logic as chat/route.ts)
const encoder = new TextEncoder()
const stream = new ReadableStream({
async start(controller) {
const reader = response.body?.getReader()
if (!reader) {
controller.close()
return
}

const decoder = new TextDecoder()
try {
while (true) {
const { done, value } = await reader.read()
if (done) break

const chunk = decoder.decode(value, { stream: true })
const lines = chunk.split("\n").filter((l) => l.trim())
for (const line of lines) {
controller.enqueue(encoder.encode(`${line}\n`))
}
}
} catch (e) {
console.error(`[ai/ingredient-vision] ${cfg.label} stream error:`, e)
} finally {
controller.close()
}
},
})

return new Response(stream, {
headers: {
"Content-Type": "text/event-stream",
"Cache-Control": "no-cache",
Connection: "keep-alive",
},
})
} catch (err) {
console.error("[ai/ingredient-vision POST] unhandled:", err)
return NextResponse.json({ error: "Server error, please try again later" },
{ status: 500 },)
}
}
