// POST /api/ai/recommend — SmartProductRecommended
// Process: 鉴权 → 读取pet profile → candidate productsRating(Data库函数+Rulefallback) → DeepSeek生成解释 → RecordTracking → returnstructure化Recommended
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { selectBanditArm, type ArmSelection, type SegmentKey } from "@/lib/timeline/bandit-policy"
import { computeSegmentAdjustment } from "@/lib/timeline/cross-segment-policy"
import { rolloutController } from "@/lib/timeline/rollout-controller"
import { DEFAULT_OBJECTIVE_WEIGHTS } from "@/lib/timeline/multi-objective"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEEPSEEK_BASE = "https://api.deepseek.com"

// rollbackRate 10 秒 存缓存,避免每次Recommendedall 查 pflid.rollout_event_log
let rollbackRateCache: { value: number; expiresAt: number } | null = null
const ROLLBACK_CACHE_TTL_MS = 10_000

// SegmentKey 合法值集合(topProduct.segmentKey cancan Yes "default" etc.非法值,need to 归a化)
const VALID_SEGMENT_KEYS: SegmentKey[] = ["global", "new_user", "returning_user", "high_intent", "low_intent"]
function normalizeSegmentKey(sk: string | undefined): SegmentKey {
return (VALID_SEGMENT_KEYS as string[]).includes(sk?? "")? (sk as SegmentKey): "global"
}

// PII 脱敏正:Sendto 第三方 LLM 剔除UserSensitive信息
// Phone Number(11位)/ID number(15 or 18-digit,含末位X)/Email/URL/UUID
const PII_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
{ re: /1[3-9]\d{9}/g, replacement: "[Phone Number]" }, // Phone Number
{ re: /[1-9]\d{4}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g, replacement: "[ID number]" }, // 18-digitID number
{ re: /[1-9]\d{4}\d{7}\d{3}/g, replacement: "[ID number]" }, // 15-digitID number
{ re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "[Email]" }, // Email
{ re: /https?:\/\/[^\s<>"']+/g, replacement: "[URL]" }, // URL
{ re: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: "[UUID]" }, // UUID
]

function sanitizePII(text: string | null | undefined): string {
if (!text) return ""
let result = text
for (const { re, replacement } of PII_PATTERNS) {
result = result.replace(re, replacement)
}
return result
}

interface Product {
id: string
name: string
brand: string
price_min: number | null
price_max: number | null
image_url: string | null
applicable_species: string
applicable_age: string
description: string | null
transparency_score: number
}

interface Ingredient {
product_id: string
ingredient_name: string
ingredient_type: string
is_grain_free: boolean
allergen_risk: string[]
nutrition_tags: string[]
}

interface RiskEvent {
product_id: string
title: string
severity: string
description: string
}

interface Pet {
id: string
name: string
species: string
breed: string | null
age_years: number
age_months: number
stomach_health: string
disease_history: string | null
}

interface DbScoreResult {
product_id: string
pet_id: string
score: number
dimensions: {
overall_rating: number
stomach_match: number
stool_safety: number
long_term_stability: number
repurchase_rate: number
breed_match: number
}
risk_count: number
breed: string
stomach_health: string
}

interface ScoredProduct {
product: Product
score: number // original score,original rating(retained)
finalScore: number // weighted fusion for onSort final score
dimensions: DbScoreResult["dimensions"]
risks: RiskEvent[]
dbScore: number | null
effectivenessScore: number | null // flywheeleffectivenessRating 0-100
effectivenessSampleCount: number | null // flywheel sample count
strategyId?: string // flywheel ETL use:produces thisRecommended Strategy ID(default "default")
segmentKey?: string // flywheel ETL use:Usersegment key(default "default")
}

interface RecommendRequest {
petId: string
query?: string
}

const BREED_ALIASES: Record<string, string[]> = {
"Ragdoll": ["Ragdoll", "ragdoll"],
"British Shorthair": ["British Shorthair", "british shorthair"],
"American Shorthair": ["American Shorthair", "american shorthair"],
" Li Hua": ["Li Hua", "lihua"],
"Siamese": ["Siamese", "siamese"],
"Persian": ["Persian", "persian"],
"Maine Coon": ["Maine Coon", "maine coon"],
}

function normalizeBreed(breed: string | null): string {
return breed?.trim()?? ""
}

function matchesBreed(product: Product, breed: string | null): boolean {
const b = normalizeBreed(breed)
if (!b) return false
const text = `${product.name} ${product.description?? ""}`.toLowerCase()
const keywords = BREED_ALIASES[b]?? [b]
return keywords.some((k) => text.includes(k.toLowerCase()))
}

function matchesLifeStage(product: Product, pet: Pet): boolean {
const totalMonths = pet.age_years * 12 + pet.age_months
if (product.applicable_age === "all") return true
if (product.applicable_age === "kitten" && totalMonths < 7) return true
if (product.applicable_age === "young_adult" && totalMonths >= 7 && totalMonths < 36) return true
if (product.applicable_age === "adult" && totalMonths >= 36 && totalMonths < 132) return true
if (product.applicable_age === "senior" && totalMonths >= 132) return true
return false
}

function isStomachFriendly(ingredients: Ingredient[], pet: Pet): boolean {
if (!["sensitive", "very_sensitive"].includes(pet.stomach_health)) return false
const text = ingredients.map((i) => i.ingredient_name).join(" ")
const friendly = ["hypoallergenic", "single protein", "grain-free", "probiotics", "Probiotics", "easy to digest", "hydrolyzed protein"]
return friendly.some((k) => text.includes(k))
}

function matchesQuery(product: Product, ingredients: Ingredient[], query?: string): boolean {
if (!query?.trim()) return false
const q = query.toLowerCase()
const text = `${product.name} ${product.brand} ${product.description?? ""} ${ingredients.map((i) => i.ingredient_name).join(" ")}`.toLowerCase()
const keywords = q.split(/[\s,,]+/).filter(Boolean)
return keywords.some((k) => text.includes(k))
}

function calculateRuleFallbackScore(product: Product,
pet: Pet,
ingredients: Ingredient[],
query?: string,): { score: number; dimensions: ScoredProduct["dimensions"] } {
const dimensions: ScoredProduct["dimensions"] = {
overall_rating: 0,
stomach_match: ["sensitive", "very_sensitive"].includes(pet.stomach_health)? 3: 4,
stool_safety: 3,
long_term_stability: 0,
repurchase_rate: 0,
breed_match: 0,
}

let score = (product.transparency_score || 0) * 0.6

if (matchesBreed(product, pet.breed)) {
dimensions.breed_match = 5
score += 10
} else {
dimensions.breed_match = 3
score += 6
}

if (isStomachFriendly(ingredients, pet)) {
dimensions.stomach_match = Math.max(dimensions.stomach_match, 4)
score += 15
}

if (matchesLifeStage(product, pet)) {
score += 10
}

if (matchesQuery(product, ingredients, query)) {
score += 12
}

return { score: Math.max(0, Math.min(100, score)), dimensions }
}

function mergeScores(dbResult: DbScoreResult | null,
fallback: ReturnType<typeof calculateRuleFallbackScore>,
pet: Pet,): { score: number; dimensions: ScoredProduct["dimensions"] } {
const dbScore = dbResult?.score?? 0
const dbDimensions = dbResult?.dimensions?? fallback.dimensions

// Data库Rating足够high 时直接used
if (dbScore >= 30) {
return { score: dbScore, dimensions: dbDimensions }
}

// 冷启动/Data稀疏时,混合Data库Rating and Rulefallback
const ruleScore = fallback.score
const mergedScore = Math.max(dbScore, ruleScore * 0.8)

const dimensions: ScoredProduct["dimensions"] = {
overall_rating: dbDimensions.overall_rating || fallback.dimensions.overall_rating,
stomach_match: Math.max(dbDimensions.stomach_match, fallback.dimensions.stomach_match),
stool_safety: dbDimensions.stool_safety || fallback.dimensions.stool_safety,
long_term_stability: dbDimensions.long_term_stability || fallback.dimensions.long_term_stability,
repurchase_rate: dbDimensions.repurchase_rate || fallback.dimensions.repurchase_rate,
breed_match: Math.max(dbDimensions.breed_match, fallback.dimensions.breed_match),
}

return { score: Math.max(0, Math.min(100, mergedScore)), dimensions }
}

function generateFallbackSummary(pet: Pet, topProducts: ScoredProduct[], query?: string): string {
const stage =
pet.age_years * 12 + pet.age_months < 12? "Kitten": pet.age_years * 12 + pet.age_months >= 84? "Senior Cat": "Adult Cat"
const breed = pet.breed?? ""
const stomach =
pet.stomach_health === "sensitive"? "StomachSensitive": pet.stomach_health === "very_sensitive"? "very sensitive stomach": "StomachNormal"
const count = topProducts.length
const queryText = query?.trim()? `,focus on"${query.trim()}"`: ""
return ` for ${breed}${stage}"${pet.name}"(${stomach}) Filter ${count} matching Product${queryText}.when Datais still accumulating,we recommend combiningine with actualFeedbackSelect.`
}

function generateFallbackExplanation(item: ScoredProduct): string {
const reasons: string[] = []
if (item.dimensions.breed_match >= 4) reasons.push("Good breed match")
if (item.dimensions.stomach_match >= 4) reasons.push("Friendly for sensitive-stomach cats")
if (item.dimensions.stool_safety >= 4) reasons.push("Good stool stability")
if (item.dimensions.long_term_stability >= 4) reasons.push("High long-term stability score")
if (item.risks.length > 0) reasons.push(`Note${item.risks.length}risk notices`)
if (reasons.length === 0) reasons.push("overall transparency and based on basic ")
return reasons.join(",") + "."
}

async function generateExplanations(pet: Pet,
topProducts: ScoredProduct[],
query?: string,): Promise<{ summary: string; explanations: string[]; confidence: number[] }> {
const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
return {
summary: generateFallbackSummary(pet, topProducts, query),
explanations: topProducts.map(generateFallbackExplanation),
confidence: topProducts.map((_, i) => Math.max(60, 95 - i * 8)),
}
}

const petContext = {
name: pet.name,
species: pet.species,
breed: pet.breed,
age: `${pet.age_years}years old${pet.age_months}months`,
stomach_health: pet.stomach_health,
// Note:disease_history when not拼 prompt,若 follow-upneed to 加,Must先past sanitizePII()
query: sanitizePII(query) || "no specific requirements",
}

const productList = topProducts.map((item, i) => ({
rank: i + 1,
name: item.product.name,
brand: item.product.brand,
score: item.score,
final_score: item.finalScore,
dimensions: item.dimensions,
risks: item.risks.map((r) => ({ title: r.title, severity: r.severity })),
effectiveness_score: item.effectivenessScore,
effectiveness_sample_count: item.effectivenessSampleCount,
}))

const prompt = `You areapet nutrition advisor.please based on on pet profile and candidate products,generate a recommendation summaryary,and for productsarecommendation reasons(30 chars), after to Recommended Confidence(0-100Integer).

pet profile:${JSON.stringify(petContext)}
candidate products:${JSON.stringify(productList)}

flywheelconfidence note:if products contain effectiveness_score(0-100) and effectiveness_sample_count fields,indicating the product hasHistoryRecommendedeffectivenessTrackingData. recommendation reasons canwhen " based on on N TrackingData" can(if" X TrackingStable");No fields GeneralRecommended.

Please strictlyin JSON return,do not add markdown code block:
{
"summary": "a 100 chars summary",
"explanations": ["Product1recommendation reasons", "Product2recommendation reasons",...],
"confidence": [92, 85, 78,...]
}`

try {
const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${apiKey}`,
},
body: JSON.stringify({
model: "deepseek-chat",
messages: [{ role: "user", content: prompt }],
temperature: 0.5,
max_tokens: 1024,
}),
})

if (!response.ok) {
throw new Error(`DeepSeek error: ${response.status}`)
}

const data = await response.json()
const content = data.choices?.[0]?.message?.content?? ""
const jsonMatch = content.match(/\{[\s\S]*\}/)
if (jsonMatch) {
const parsed = JSON.parse(jsonMatch[0])
return {
summary: parsed.summary?? generateFallbackSummary(pet, topProducts, query),
explanations: Array.isArray(parsed.explanations)? parsed.explanations: topProducts.map(generateFallbackExplanation),
confidence: Array.isArray(parsed.confidence)? parsed.confidence.map((c: number) => Math.max(0, Math.min(100, c))): topProducts.map((_, i) => Math.max(60, 95 - i * 8)),
}
}
} catch (err) {
console.error("[recommend] explanation generation failed:", err)
}

return {
summary: generateFallbackSummary(pet, topProducts, query),
explanations: topProducts.map(generateFallbackExplanation),
confidence: topProducts.map((_, i) => Math.max(60, 95 - i * 8)),
}
}

export async function POST(request: Request) {
const startTime = Date.now()
// used crypto.randomUUID(CSPRNG),避免 Math.random 预测枚举OtherUser trace
const traceId = `rec-${crypto.randomUUID()}`

try {
const { petId, query } = (await request.json().catch(() => ({}))) as RecommendRequest
if (!petId) {
return NextResponse.json({ error: "petId Required" }, { status: 400 })
}

const supabase = await createClient()
const { data: userData, error: userErr } = await supabase.auth.getUser()
if (userErr ||!userData.user) {
return NextResponse.json({ error: "notSign In" }, { status: 401 })
}
const profileId = userData.user.id

// 1. Load pet profile
const { data: petRow, error: petErr } = await supabase.from("pets").select("id,name,species,breed,age_years,age_months,stomach_health,disease_history").eq("id", petId).eq("profile_id", profileId).single()

if (petErr ||!petRow) {
return NextResponse.json({ error: "pet profiledoes not exist or NoPermissions" }, { status: 404 })
}

const pet = petRow as unknown as Pet

// 2. Load active products with ingredients and risks
const [{ data: products }, { data: ingredients }, { data: risks }] = await Promise.all([
supabase.from("products").select("id,name,brand,price_min,price_max,image_url,applicable_species,applicable_age,description,transparency_score").eq("is_active", true),
supabase.from("product_ingredients").select("product_id,ingredient_name,ingredient_type,is_grain_free,allergen_risk,nutrition_tags"),
supabase.from("risk_events").select("product_id,title,severity,description").eq("resolved", false),
])

const productList = (products?? []) as unknown as Product[]
const ingredientList = (ingredients?? []) as unknown as Ingredient[]
const riskList = (risks?? []) as unknown as RiskEvent[]

if (productList.length === 0) {
return NextResponse.json({ error: "No availableproduct data" }, { status: 404 })
}

// 3. Build lookup maps
const ingredientsByProduct = new Map<string, Ingredient[]>()
for (const ing of ingredientList) {
const list = ingredientsByProduct.get(ing.product_id)?? []
list.push(ing)
ingredientsByProduct.set(ing.product_id, list)
}

const risksByProduct = new Map<string, RiskEvent[]>()
for (const risk of riskList) {
const list = risksByProduct.get(risk.product_id)?? []
list.push(risk)
risksByProduct.set(risk.product_id, list)
}

// 4. Score candidates: database function + rule fallback
const scored: ScoredProduct[] = []
for (const product of productList) {
const productIngredients = ingredientsByProduct.get(product.id)?? []
const productRisks = risksByProduct.get(product.id)?? []

const { data: scoreData, error: scoreErr } = await supabase.rpc("score_product_for_pet", {
p_product_id: product.id,
p_pet_id: petId,
})

if (scoreErr) {
console.error(`[recommend] score_product_for_pet failed for ${product.id}:`, scoreErr)
}

const dbResult = (scoreData as DbScoreResult | null)?? null
const fallback = calculateRuleFallbackScore(product, pet, productIngredients, query)
const { score, dimensions } = mergeScores(dbResult, fallback, pet)

scored.push({
product,
score,
finalScore: score, // default equalson original score,flywheel will overwrite
dimensions,
risks: productRisks,
dbScore: dbResult?.score?? null,
effectivenessScore: null,
effectivenessSampleCount: null,
})
}

// 4.5 Load flywheel effectiveness scores (best-effort, gracefully degrade on RLS/empty)
// pflid.effectiveness_scores 仅for service_role open SELECT Strategy,普通 anon will RLS 拦截
// 优先use createClient() 读,若 拦截 Downgradeto createAdminClient()
// 表名 schema-qualified(pflid.effectiveness_scores)not database.types.ts,
// use as any 绕past supabase 严格表名重载(项目既has模式,见 effectiveness-scoring.ts etc.)
const effectivenessByProduct = new Map<string, { score: number; sampleCount: number }>()
try {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let effResult = await (supabase as any).from("pflid.effectiveness_scores").select("entity_id,effectiveness_score,sample_count,version").eq("entity_type", "product").order("version", { ascending: false })

if (effResult.error) {
// RLS 拦截 or OtherError -> Downgradeto admin client
const admin = createAdminClient()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
effResult = await (admin as any).from("pflid.effectiveness_scores").select("entity_id,effectiveness_score,sample_count,version").eq("entity_type", "product").order("version", { ascending: false })
}

if (effResult.error) {
console.error("[recommend] effectiveness_scores load failed:", effResult.error)
} else if (effResult.data) {
// already按 version desc Sort,每 entity_id 取首 (LatestVersion)
for (const row of effResult.data as Array<{
entity_id: string
effectiveness_score: number | string
sample_count: number | string
}>) {
const eid = row.entity_id
if (!eid || effectivenessByProduct.has(eid)) continue
effectivenessByProduct.set(eid, {
score: Number(row.effectiveness_score) || 0,
sampleCount: Number(row.sample_count) || 0,
})
}
}
} catch (err) {
console.error("[recommend] effectiveness_scores load exception:", err)
}

// 4.6 weighted fusion:original score and effectiveness_score 同 for 0-100 scale
// finalScore = original score * 0.7 + effectiveness_score * 0.3
// (Task原文Male式 effectiveness_score/100 * 0.3 存 scalenot a致:左边 0-100,右边 0-0.3,
// will 使 finalScore Severe缩水破坏Sort语义,故修正 for 同scale加权)
// flywheelNorecords -> finalScore = original score(优雅Downgrade)
for (const item of scored) {
const eff = effectivenessByProduct.get(item.product.id)
if (eff) {
const fused = item.score * 0.7 + eff.score * 0.3
item.finalScore = Math.max(0, Math.min(100, fused))
item.effectivenessScore = eff.score
item.effectivenessSampleCount = eff.sampleCount
} else {
item.finalScore = item.score
}
}

// 5. Sort and take top 5
scored.sort((a, b) => b.finalScore - a.finalScore)
const topProducts = scored.slice(0, 5)

// 6. Generate explanations
const { summary, explanations, confidence } = await generateExplanations(pet, topProducts, query)

// 7. Build response
const recommendations = topProducts.map((item, i) => ({
product: {
id: item.product.id,
name: item.product.name,
brand: item.product.brand,
price_min: item.product.price_min,
price_max: item.product.price_max,
image_url: item.product.image_url,
},
score: item.finalScore, // returns flywheel after final score(iOS Recommended 0-100 scale)
original_score: item.score, // original rating, on frontend displayflywheelweighting impact
dimensions: item.dimensions,
explanation: explanations[i]?? generateFallbackExplanation(item),
confidence: confidence[i]?? Math.max(60, 95 - i * 8),
// flywheelcan信度信号(ifhas),let 端can展示" based on on X 次long 期TrackingData"
effectiveness_score: item.effectivenessScore,
effectiveness_sample_count: item.effectivenessSampleCount,
}))

const warnings = topProducts.flatMap((item) =>
item.risks.map((r) => ({
product: { id: item.product.id, name: item.product.name, brand: item.product.brand },
reason: r.title,
risk_score: r.severity === "critical"? 90: r.severity === "high"? 75: r.severity === "medium"? 50: 25,
})),).slice(0, 5)

const ageLabel =
pet.age_years * 12 + pet.age_months < 12? "Kitten": pet.age_years * 12 + pet.age_months >= 84? "Senior Cat": "Adult Cat"

const first = recommendations[0]

// raw_score is on 0-5 scale; contribution = weighted share of that dimension
const factorDefs = [
{ factor: "breed_match", label: "Breed Match", raw_score: first?.dimensions.breed_match?? 0, weight_pct: 10 },
{ factor: "stomach_match", label: "Stomach Match", raw_score: first?.dimensions.stomach_match?? 0, weight_pct: 25 },
{ factor: "stool_safety", label: "StoolSecurity", raw_score: first?.dimensions.stool_safety?? 0, weight_pct: 20 },
{ factor: "long_term_stability", label: "Long-term Stability", raw_score: first?.dimensions.long_term_stability?? 0, weight_pct: 15 },
{ factor: "repurchase_rate", label: "Repurchase Rate", raw_score: first?.dimensions.repurchase_rate?? 0, weight_pct: 10 },
{ factor: "overall_rating", label: "Overall Rating", raw_score: first?.dimensions.overall_rating?? 0, weight_pct: 20 },
]

const breakdown = {
product_id: first?.product.id?? "",
pet_id: pet.id,
total_score: first?.score?? 0,
model_attribution: {
disclaimer: "when Recommended based on onexistingproduct data,ingredient tags,risk events and pet profile,CommunityReviewDataaccumulated.",
factors: factorDefs.map((f) => ({...f,
contribution: Math.round((f.raw_score / 5) * f.weight_pct * 10) / 10,
max_contribution: f.weight_pct,
})),
},
evidence_support: [
{ data_point: "Producttransparency", observed_value: `${first?.product.brand?? ""} transparency ${productList.find((p) => p.id === first?.product.id)?.transparency_score?? 0} `, statistical_note: "Product based on basic info" },
],
negative_signals: warnings.map((w) => ({
signal: w.reason,
severity: w.risk_score >= 75? "high": w.risk_score >= 50? "medium": "low" as const,
source: "risk_events",
actionable: true,
})),
product_confidence: first?.confidence?? 70,
}

const result = {
recommendations,
warnings,
summary,
pet_context: {
breed: pet.breed?? "UnknownBreed",
stomach_health: pet.stomach_health,
age: ageLabel,
},
breakdown,
trace_id: traceId,
}

// 8. Persist recommendation trace (non-blocking)
const decisionGraph = {
source: "ai_recommend",
pet_id: petId,
query: query?? null,
top_product_ids: topProducts.map((p) => p.product.id),
top_scores: topProducts.map((p) => p.score),
has_deepseek:!!process.env.DEEPSEEK_API_KEY,
duration_ms: Date.now() - startTime,
}

// feature_snapshot Must包含 product_id / strategy_id / segment_key etc.flywheel ETL 必need to fields
// 同时写 input_features 列 on follow-up batch job 反查
const topProduct = topProducts[0]

// 7.5 flywheel enrich fields:banditConfidence / segmentAlignment / rollbackRate / adverseEventRate
// all 部调use try/catch Downgrade,绝not let Recommended主Process崩溃

// (1) banditConfidence: Thompson Sampling Beta after 验均值 alpha/(alpha+beta)
// 调use selectBanditArm need to RolloutDecision,通past rolloutController.decideEngine 获取
let banditSelection: ArmSelection | null = null
try {
const decision = await rolloutController.decideEngine({ requestId: traceId })
banditSelection = await selectBanditArm({
decision,
requestId: traceId,
segment: normalizeSegmentKey(topProduct?.segmentKey),
})
// bandit arm_id and segment 落to ScoredProduct(覆盖 "default")
if (topProduct && banditSelection) {
topProduct.strategyId = banditSelection.armId
topProduct.segmentKey = banditSelection.segment
}
} catch (e) {
console.warn("[recommend] bandit selection failed, fallback to default:", (e as Error).message)
}
const banditConfidence = banditSelection? banditSelection.alpha / (banditSelection.alpha + banditSelection.beta): 0.5

// (2) segmentAlignment: 简化版 = explorationCapPct/100(该 segment 探索配额Percentage)
let segmentAlignment = 0.5
try {
const adjustment = await computeSegmentAdjustment(normalizeSegmentKey(topProduct?.segmentKey),
DEFAULT_OBJECTIVE_WEIGHTS,)
segmentAlignment = adjustment?.explorationCapPct? Math.max(0, Math.min(1, adjustment.explorationCapPct / 100)): 0.5
} catch (e) {
console.warn("[recommend] segment adjustment failed:", (e as Error).message)
}

// (3) rollbackRate: Last 30 days pflid.rollout_event_log rollback/auto_rollback Percentage
// used createAdminClient 绕past RLS,加 10s 存缓存
let rollbackRate = 0
try {
const now = Date.now()
if (!rollbackRateCache || rollbackRateCache.expiresAt < now) {
const admin = createAdminClient()
const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data: rolloutEvents } = await (admin as any).from("pflid.rollout_event_log").select("event_type").gte("created_at", thirtyDaysAgo)
if (rolloutEvents && rolloutEvents.length > 0) {
const rollbackCount = rolloutEvents.filter((e: { event_type: string }) =>
e.event_type === "rollback" || e.event_type === "auto_rollback",).length
rollbackRate = rollbackCount / rolloutEvents.length
}
rollbackRateCache = { value: rollbackRate, expiresAt: now + ROLLBACK_CACHE_TTL_MS }
} else {
rollbackRate = rollbackRateCache.value
}
} catch (e) {
console.warn("[recommend] rollback rate fetch failed:", (e as Error).message)
}

// (4) adverseEventRate: Last 30 days该 pet health_records severity>=4 symptom Percentage
let adverseEventRate = 0
try {
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
const { data: healthRecs } = await supabase.from("health_records").select("record_type,severity").eq("pet_id", petId).gte("created_at", thirtyDaysAgo)
if (healthRecs && healthRecs.length > 0) {
const adverseCount = healthRecs.filter((r: { record_type: string; severity?: number | null }) =>
r.record_type === "symptom" && (r.severity?? 0) >= 4,).length
adverseEventRate = adverseCount / healthRecs.length
}
} catch (e) {
console.warn("[recommend] adverse event rate fetch failed:", (e as Error).message)
}

const featureSnapshot = {
pet: { species: pet.species, breed: pet.breed, stomach_health: pet.stomach_health },
query: query?? null,
// flywheel ETL 必need to fields(见 flywheel-input-builder.ts:98)
product_id: topProduct?.product.id?? null,
productId: topProduct?.product.id?? null,
strategy_id: topProduct?.strategyId?? "default",
strategyId: topProduct?.strategyId?? "default",
segment_key: topProduct?.segmentKey?? "default",
// flywheelweighted fusion信息(ifread取to effectiveness_scores)
effectiveness_score: topProduct?.effectivenessScore?? null,
effectiveness_sample_count: topProduct?.effectivenessSampleCount?? null,
final_score: topProduct?.finalScore?? topProduct?.score?? null,
original_score: topProduct?.score?? null,
// 决策SGDData
model_version: "pettrust-v4.5",
request_source: "ai_recommend",
duration_ms: Date.now() - startTime,
// flywheel enrich fields(来自 bandit/segment/rollback/adverseEvent true实Data源)
banditConfidence,
bandit_arm_id: banditSelection?.armId?? null,
segmentAlignment,
rollbackRate,
adverseEventRate,
}

supabase.from("recommendation_trace_log").insert({
session_id: traceId,
profile_id: profileId,
pet_id: petId,
model_version: "pettrust-v4.5",
feature_snapshot: featureSnapshot,
input_features: {
pet: { species: pet.species, breed: pet.breed, stomach_health: pet.stomach_health, age_years: pet.age_years },
query: query?? null,
top_product_ids: topProducts.map((p) => p.product.id),
top_scores: topProducts.map((p) => p.score),
},
user_segment: topProduct?.segmentKey?? "default",
decision_graph: decisionGraph,
}).then(({ error }) => {
if (error) console.error("[recommend] trace log insert failed:", error)
})

// 9. Persist recommendation impressions (non-blocking)
const impressionRows = recommendations.map((r, idx) => ({
profile_id: profileId,
pet_id: petId,
product_id: r.product.id,
session_id: traceId,
event_type: "impression" as const,
position: idx + 1,
source: "ai_recommend",
score: r.score,
metadata: { confidence: r.confidence, trace_id: traceId },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
void (supabase as any).from("recommendation_events").insert(impressionRows).then(({ error }: { error: unknown }) => {
if (error) console.error("[recommend] recommendation_events insert failed:", error)
})

return NextResponse.json(result)
} catch (err) {
console.error("[recommend] error:", err)
return NextResponse.json({ error: "Recommendation service error,please try again later" },
{ status: 500 },)
}
}
