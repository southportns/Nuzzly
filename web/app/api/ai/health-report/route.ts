// POST /api/ai/health-report — AI HealthReport生成
// 接收: { pet_id, pet_info }
// Process: 鉴权 → 校验 pet all权 → 读取 health_metrics/diet_logs/health_records
// → 构造 prompt 调use DeepSeek → 解析 JSON → 写 ai_health_reports → return
// Downgrade: DeepSeek not canuse 时returntemplatedReport
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/database.types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEEPSEEK_BASE = "https://api.deepseek.com"
const DEEPSEEK_MODEL = "deepseek-chat"

type RiskLevel = Database["public"]["Enums"]["risk_level_t"]

interface HealthReportAI {
health_summary: string
key_findings: string[]
recommendations: string[]
risk_level: RiskLevel
causes?: string[]
monitoring_plan?: string
}

// 鉴权 helper(reference /api/ai/chat/route.ts)
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

// 校验 pet 归属and return pet based on basic info
async function ensurePetOwnership(db: ReturnType<typeof createAdminClient>,
petId: string,
userId: string,): Promise<{ id: string; name: string; species: string; breed: string | null; gender: string; age_years: number; age_months: number; weight_kg: number | null; stomach_health: string | null } | null> {
const { data, error } = await db.from("pets").select("id, profile_id, name, species, breed, gender, age_years, age_months, weight_kg, stomach_health, is_active").eq("id", petId).maybeSingle()

if (error ||!data) return null
if (!data.is_active) return null
if (data.profile_id!== userId) return null
return {
id: data.id,
name: data.name,
species: data.species,
breed: data.breed,
gender: data.gender,
age_years: data.age_years,
age_months: data.age_months,
weight_kg: data.weight_kg,
stomach_health: data.stomach_health,
}
}

async function fetchHealthMetrics(db: ReturnType<typeof createAdminClient>, petId: string) {
const { data, error } = await db.from("health_metrics").select("date, appetite_score, stool_score, activity_score, weight_delta, symptom_severity_score").eq("pet_id", petId).order("date", { ascending: false }).limit(30)
if (error) throw error
return data?? []
}

async function fetchDietLogs(db: ReturnType<typeof createAdminClient>, petId: string) {
const { data, error } = await db.from("diet_logs").select("logged_date, food_name, food_type, notes").eq("pet_id", petId).order("logged_date", { ascending: false }).limit(20)
if (error) throw error
return data?? []
}

async function fetchHealthRecords(db: ReturnType<typeof createAdminClient>, petId: string) {
const { data, error } = await db.from("health_records").select("record_time, record_type, diagnosis, symptom_code, severity, notes, vet_name").eq("pet_id", petId).order("record_time", { ascending: false }).limit(10)
if (error) throw error
return data?? []
}

function buildPrompt(petInfo: unknown, metrics: unknown[], dietLogs: unknown[], healthRecords: unknown[]): string {
const pet = (petInfo?? {}) as Record<string, unknown>
const petName = String(pet.name?? "Fur Baby")
const species = String(pet.species?? "")
const breed = String(pet.breed?? "")
const ageYears = pet.age_years?? ""
const ageMonths = pet.age_months?? ""
const gender = pet.gender?? ""
const weightKg = pet.weight_kg?? ""
const stomach = pet.stomach_health?? ""

return `You are"Pomi"🐱,Town PetHealth AI.please based on on PetLast 30 days HealthData,a structureHealthReport.

## Pet based on basic info
- Name: ${petName}
- Species: ${species}
- Breed: ${breed}
- Age: ${ageYears}years old${ageMonths}months
- Gender: ${gender}
- Weight(kg): ${weightKg}
- StomachCondition: ${stomach}

## Last 30 daysHealthMetric (health_metrics, max 30)
${JSON.stringify(metrics, null, 2)}

## RecentDietLogs (diet_logs, max 20)
${JSON.stringify(dietLogs, null, 2)}

## RecentHealthrecords (health_records, max 10)
${JSON.stringify(healthRecords, null, 2)}

## Output Requirements
Please strictlyoutput a JSON for object(do not wrap markdown code fence,do notextra text chars),structureif:
{
"health_summary": "a 100-200 chars Healthsummary",
"key_findings": ["key findings1", "key findings2", "key findings3"],
"recommendations": ["Advice1", "Advice2", "Advice3"],
"risk_level": "low" | "medium" | "high" | "critical",
"causes": ["potential cause1", "potential cause2"],
"monitoring_plan": " follow-upadvice text"
}

Determine risk_level reference:
- low: Metricstable,Noobvious anomalies
- medium: someMetricdeviate from normal range,needs follow-up
- high: multipleMetricAbnormal or ongoing deterioration,consult a vet
- critical: severe anomalies,seek immediate veterinary care

Note: output only JSON,no prefix/suffix.`
}

// 提取 AI output JSON(兼容模型偶尔包裹 code fence 情况)
function parseAIJson(raw: string): HealthReportAI | null {
let text = raw.trim()
// 去除cancan ```json... ``` 包裹
const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
if (fenceMatch) {
text = fenceMatch[1].trim()
}
// 找to the first { and 最 after a }
const firstBrace = text.indexOf("{")
const lastBrace = text.lastIndexOf("}")
if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null
const jsonStr = text.slice(firstBrace, lastBrace + 1)
try {
const parsed = JSON.parse(jsonStr) as Partial<HealthReportAI>
if (typeof parsed.health_summary!== "string" ||!Array.isArray(parsed.key_findings) ||!Array.isArray(parsed.recommendations)) {
return null
}
const validLevels: RiskLevel[] = ["low", "medium", "high", "critical"]
const riskLevel = validLevels.includes(parsed.risk_level as RiskLevel)? (parsed.risk_level as RiskLevel): "low"
return {
health_summary: parsed.health_summary,
key_findings: parsed.key_findings,
recommendations: parsed.recommendations,
risk_level: riskLevel,
causes: Array.isArray(parsed.causes)? parsed.causes: [],
monitoring_plan: typeof parsed.monitoring_plan === "string"? parsed.monitoring_plan: "",
}
} catch {
return null
}
}

// 调use DeepSeek,return { report, promptTokens, completionTokens, modelUsed }
async function callDeepSeek(prompt: string): Promise<{
report: HealthReportAI | null
prompt_tokens: number
completion_tokens: number
model_used: string
} | null> {
const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) return null

const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${apiKey}`,
},
body: JSON.stringify({
model: DEEPSEEK_MODEL,
messages: [
{ role: "system", content: "You areprofessional PetHealthAnalysis,only output JSON,not output extra text chars or markdown." },
{ role: "user", content: prompt },
],
temperature: 0.3,
max_tokens: 1500,
stream: false,
}),
})

if (!response.ok) {
console.error("[ai/health-report] deepseek error:", response.status, await response.text().catch(() => ""))
return null
}

const data = await response.json()
const content: string = data?.choices?.[0]?.message?.content?? ""
const promptTokens: number = data?.usage?.prompt_tokens?? 0
const completionTokens: number = data?.usage?.completion_tokens?? 0

const report = parseAIJson(content)
return {
report,
prompt_tokens: promptTokens,
completion_tokens: completionTokens,
model_used: DEEPSEEK_MODEL,
}
}

// templatedDowngradeReport(DeepSeek not canuse or returnnot can解析时used)
function buildFallbackReport(metrics: Array<Record<string, unknown>>): HealthReportAI {
const sampleSize = metrics.length
let riskLevel: RiskLevel = "low"
const findings: string[] = []
const recommendations: string[] = []

if (sampleSize === 0) {
riskLevel = "low"
findings.push("insufficient recent HealthMetricData")
recommendations.push("We recommend daily recording of pet Appetite,Stool,activity level etc. based on basic Metric")
recommendations.push("consistent recording helps AI more accurately assessPetHealthStatus")
} else {
const appetites = metrics.map((m) => m.appetite_score).filter((v): v is number => typeof v === "number")
const stools = metrics.map((m) => m.stool_score).filter((v): v is number => typeof v === "number")
const activities = metrics.map((m) => m.activity_score).filter((v): v is number => typeof v === "number")
const avg = (arr: number[]) => (arr.length? arr.reduce((a, b) => a + b, 0) / arr.length: 0)
const avgAppetite = avg(appetites)
const avgStool = avg(stools)
const avgActivity = avg(activities)

findings.push(`Last 30 daysrecords ${sampleSize} HealthMetric`)
if (appetites.length) findings.push(`AverageAppetiteRating: ${avgAppetite.toFixed(1)}`)
if (stools.length) findings.push(`AverageStoolRating: ${avgStool.toFixed(1)}`)
if (activities.length) findings.push(`AverageActivityRating: ${avgActivity.toFixed(1)}`)

if (avgAppetite < 40 || avgStool < 40 || avgActivity < 40) {
riskLevel = avgAppetite < 20 || avgStool < 20? "high": "medium"
recommendations.push("someMetricbelow normal,Adviceclosely monitorand consult a vet")
} else {
recommendations.push("Metricstable,continuewhen and observation routine")
}
recommendations.push("if you noticeSoft Stool,Vomiting,decreased appetite etc.please and Record")
}

return {
health_summary: `AI is temporarily unavailable, for based on onRecentData templatedReport.Last 30 daysrecords ${sampleSize} HealthMetric,risk assessment grade: ${riskLevel}.AdviceOngoingRecordData AI Analysis.`,
key_findings: findings,
recommendations,
risk_level: riskLevel,
causes: [],
monitoring_plan: "We recommend daily recording ofAppetite,Stool,activity level;weekly reviewMetricTrends;ifhasAbnormal and.",
}
}

type InsertRow = Database["public"]["Tables"]["ai_health_reports"]["Insert"]

export async function POST(request: Request) {
try {
const body = (await request.json().catch(() => ({}))) as {
pet_id?: string
pet_info?: Record<string, unknown>
}

if (!body.pet_id) {
return NextResponse.json({ error: "pet_id Required" }, { status: 400 })
}

// 鉴权
const supabase = await createClient()
const { user, error: userErr } = await getAuthUser(request, supabase)
if (userErr ||!user) {
return NextResponse.json({ error: "notSign In" }, { status: 401 })
}

const db = createAdminClient()

// 校验 pet 归属(use admin 查避免 RLS not a致)
const pet = await ensurePetOwnership(db, body.pet_id, user.id)
if (!pet) {
return NextResponse.json({ error: "Petdoes not exist or NoPermissions" }, { status: 404 })
}

// 合and pet based on basic info(please求体 pet_info 优先,回退to DB 查询Result)
const petInfo = {...pet,...(body.pet_info?? {}) }

const startTime = Date.now()

// and 行读取Data
const [metrics, dietLogs, healthRecords] = await Promise.all([
fetchHealthMetrics(db, body.pet_id),
fetchDietLogs(db, body.pet_id),
fetchHealthRecords(db, body.pet_id),
])

// 调use DeepSeek
let report: HealthReportAI
let promptTokens: number | null = null
let completionTokens: number | null = null
let modelUsed: string | null = null
let aiAvailable = false

try {
const aiResult = await callDeepSeek(buildPrompt(petInfo, metrics, dietLogs, healthRecords))
if (aiResult?.report) {
report = aiResult.report
promptTokens = aiResult.prompt_tokens
completionTokens = aiResult.completion_tokens
modelUsed = aiResult.model_used
aiAvailable = true
} else {
report = buildFallbackReport(metrics as Array<Record<string, unknown>>)
}
} catch (err) {
console.error("[ai/health-report] deepseek call failed:", err)
report = buildFallbackReport(metrics as Array<Record<string, unknown>>)
}

const processingTimeMs = Date.now() - startTime
const today = new Date().toISOString().split("T")[0]

// Abnormal快照:Filter obvious anomalies Metric
const anomalySnapshot = metrics.filter((m) => {
const row = m as Record<string, unknown>
const app = row.appetite_score
const stool = row.stool_score
const act = row.activity_score
return (typeof app === "number" && app < 40) || (typeof stool === "number" && stool < 40) || (typeof act === "number" && act < 40)
})

const insertRow: InsertRow = {
pet_id: body.pet_id,
report_date: today,
date_range: "last_30d",
risk_level: report.risk_level,
summary_text: report.health_summary,
recommendations: report.recommendations,
causes: report.causes?? [],
monitoring_plan: report.monitoring_plan?? null,
model_used: modelUsed,
processing_time_ms: processingTimeMs,
prompt_tokens: promptTokens,
completion_tokens: completionTokens,
metrics_snapshot: { health_metrics: metrics, diet_logs: dietLogs, health_records: healthRecords },
anomaly_snapshot: anomalySnapshot,
summary_snapshot: { key_findings: report.key_findings, ai_available: aiAvailable },
}

const { data: inserted, error: insertErr } = await db.from("ai_health_reports").insert(insertRow).select("id, pet_id, report_date, risk_level, summary_text, recommendations, causes, monitoring_plan, model_used, processing_time_ms, generated_at").single()

if (insertErr) {
console.error("[ai/health-report] insert error:", insertErr)
return NextResponse.json({ error: insertErr.message }, { status: 500 })
}

// return iOS 期望 fields(summary,risk_level,recommendations,causes,monitoring_plan,model_used,processing_time_ms)
return NextResponse.json({
id: inserted.id,
pet_id: inserted.pet_id,
report_date: inserted.report_date,
generated_at: inserted.generated_at,
summary: inserted.summary_text,
risk_level: inserted.risk_level,
recommendations: inserted.recommendations,
causes: inserted.causes,
monitoring_plan: inserted.monitoring_plan,
model_used: inserted.model_used,
processing_time_ms: inserted.processing_time_ms,
key_findings: report.key_findings,
health_summary: report.health_summary,
ai_available: aiAvailable,
})
} catch (err) {
const message = err instanceof Error? err.message: String(err)
return NextResponse.json({ error: message }, { status: 500 })
}
}
