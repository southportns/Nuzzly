// POST /api/ai/health-report — AI 健康报告生成
// 接收: { pet_id, pet_info }
// 流程: 鉴权 → 校验 pet 所有权 → 读取 health_metrics/diet_logs/health_records
//       → 构造 prompt 调用 DeepSeek → 解析 JSON → 写入 ai_health_reports → 返回
// 降级: DeepSeek 不可用时返回模板化报告
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

// 鉴权 helper（参考 /api/ai/chat/route.ts）
async function getAuthUser(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null
  if (bearer) {
    const r = await supabase.auth.getUser(bearer)
    return { user: r.data?.user ?? null, error: r.error ?? null }
  }
  const r = await supabase.auth.getUser()
  return { user: r.data?.user ?? null, error: r.error ?? null }
}

// 校验 pet 归属并返回 pet 基础信息
async function ensurePetOwnership(
  db: ReturnType<typeof createAdminClient>,
  petId: string,
  userId: string,
): Promise<{ id: string; name: string; species: string; breed: string | null; gender: string; age_years: number; age_months: number; weight_kg: number | null; stomach_health: string | null } | null> {
  const { data, error } = await db
    .from("pets")
    .select("id, profile_id, name, species, breed, gender, age_years, age_months, weight_kg, stomach_health, is_active")
    .eq("id", petId)
    .maybeSingle()

  if (error || !data) return null
  if (!data.is_active) return null
  if (data.profile_id !== userId) return null
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
  const { data, error } = await db
    .from("health_metrics")
    .select("date, appetite_score, stool_score, activity_score, weight_delta, symptom_severity_score")
    .eq("pet_id", petId)
    .order("date", { ascending: false })
    .limit(30)
  if (error) throw error
  return data ?? []
}

async function fetchDietLogs(db: ReturnType<typeof createAdminClient>, petId: string) {
  const { data, error } = await db
    .from("diet_logs")
    .select("logged_date, food_name, food_type, notes")
    .eq("pet_id", petId)
    .order("logged_date", { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

async function fetchHealthRecords(db: ReturnType<typeof createAdminClient>, petId: string) {
  const { data, error } = await db
    .from("health_records")
    .select("record_time, record_type, diagnosis, symptom_code, severity, notes, vet_name")
    .eq("pet_id", petId)
    .order("record_time", { ascending: false })
    .limit(10)
  if (error) throw error
  return data ?? []
}

function buildPrompt(petInfo: unknown, metrics: unknown[], dietLogs: unknown[], healthRecords: unknown[]): string {
  const pet = (petInfo ?? {}) as Record<string, unknown>
  const petName = String(pet.name ?? "毛孩子")
  const species = String(pet.species ?? "")
  const breed = String(pet.breed ?? "")
  const ageYears = pet.age_years ?? ""
  const ageMonths = pet.age_months ?? ""
  const gender = pet.gender ?? ""
  const weightKg = pet.weight_kg ?? ""
  const stomach = pet.stomach_health ?? ""

  return `你是"球球"🐱，毛球镇的宠物健康顾问 AI。请基于以下宠物近 30 天的健康数据，生成一份结构化健康报告。

## 宠物基础信息
- 姓名: ${petName}
- 物种: ${species}
- 品种: ${breed}
- 年龄: ${ageYears}岁${ageMonths}月
- 性别: ${gender}
- 体重(kg): ${weightKg}
- 肠胃状况: ${stomach}

## 近 30 天健康指标 (health_metrics, 最多 30 条)
${JSON.stringify(metrics, null, 2)}

## 近期饮食日志 (diet_logs, 最多 20 条)
${JSON.stringify(dietLogs, null, 2)}

## 近期健康记录 (health_records, 最多 10 条)
${JSON.stringify(healthRecords, null, 2)}

## 输出要求
请严格输出一个 JSON 对象（不要包裹 markdown code fence，不要任何额外文字），结构如下：
{
  "health_summary": "一段 100-200 字的健康总结",
  "key_findings": ["关键发现1", "关键发现2", "关键发现3"],
  "recommendations": ["建议1", "建议2", "建议3"],
  "risk_level": "low" | "medium" | "high" | "critical",
  "causes": ["潜在原因1", "潜在原因2"],
  "monitoring_plan": "后续监测建议文本"
}

判定 risk_level 的参考：
- low: 指标平稳，无明显异常
- medium: 个别指标偏离正常范围，需关注
- high: 多项指标异常或持续恶化，建议就医
- critical: 严重异常，建议立即就医

注意：仅输出 JSON，不要任何前后缀。`
}

// 提取 AI 输出中的 JSON（兼容模型偶尔包裹 code fence 的情况）
function parseAIJson(raw: string): HealthReportAI | null {
  let text = raw.trim()
  // 去除可能的 ```json ... ``` 包裹
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    text = fenceMatch[1].trim()
  }
  // 找到第一个 { 与最后一个 }
  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null
  const jsonStr = text.slice(firstBrace, lastBrace + 1)
  try {
    const parsed = JSON.parse(jsonStr) as Partial<HealthReportAI>
    if (typeof parsed.health_summary !== "string" || !Array.isArray(parsed.key_findings) || !Array.isArray(parsed.recommendations)) {
      return null
    }
    const validLevels: RiskLevel[] = ["low", "medium", "high", "critical"]
    const riskLevel = validLevels.includes(parsed.risk_level as RiskLevel) ? (parsed.risk_level as RiskLevel) : "low"
    return {
      health_summary: parsed.health_summary,
      key_findings: parsed.key_findings,
      recommendations: parsed.recommendations,
      risk_level: riskLevel,
      causes: Array.isArray(parsed.causes) ? parsed.causes : [],
      monitoring_plan: typeof parsed.monitoring_plan === "string" ? parsed.monitoring_plan : "",
    }
  } catch {
    return null
  }
}

// 调用 DeepSeek，返回 { report, promptTokens, completionTokens, modelUsed }
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
        { role: "system", content: "你是专业的宠物健康分析助手，只输出 JSON，不输出任何额外文字或 markdown。" },
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
  const content: string = data?.choices?.[0]?.message?.content ?? ""
  const promptTokens: number = data?.usage?.prompt_tokens ?? 0
  const completionTokens: number = data?.usage?.completion_tokens ?? 0

  const report = parseAIJson(content)
  return {
    report,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    model_used: DEEPSEEK_MODEL,
  }
}

// 模板化降级报告（DeepSeek 不可用或返回不可解析时使用）
function buildFallbackReport(metrics: Array<Record<string, unknown>>): HealthReportAI {
  const sampleSize = metrics.length
  let riskLevel: RiskLevel = "low"
  const findings: string[] = []
  const recommendations: string[] = []

  if (sampleSize === 0) {
    riskLevel = "low"
    findings.push("近期暂无足够的健康指标数据")
    recommendations.push("建议每日记录宠物的食欲、便便、活动量等基础指标")
    recommendations.push("坚持记录有助于 AI 更准确地评估宠物健康状态")
  } else {
    const appetites = metrics.map((m) => m.appetite_score).filter((v): v is number => typeof v === "number")
    const stools = metrics.map((m) => m.stool_score).filter((v): v is number => typeof v === "number")
    const activities = metrics.map((m) => m.activity_score).filter((v): v is number => typeof v === "number")
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const avgAppetite = avg(appetites)
    const avgStool = avg(stools)
    const avgActivity = avg(activities)

    findings.push(`近 30 天共记录 ${sampleSize} 条健康指标`)
    if (appetites.length) findings.push(`平均食欲评分: ${avgAppetite.toFixed(1)}`)
    if (stools.length) findings.push(`平均便便评分: ${avgStool.toFixed(1)}`)
    if (activities.length) findings.push(`平均活动评分: ${avgActivity.toFixed(1)}`)

    if (avgAppetite < 40 || avgStool < 40 || avgActivity < 40) {
      riskLevel = avgAppetite < 20 || avgStool < 20 ? "high" : "medium"
      recommendations.push("部分指标偏低，建议密切观察并咨询兽医")
    } else {
      recommendations.push("整体指标平稳，继续保持当前喂养和观察节奏")
    }
    recommendations.push("如发现软便、呕吐、食欲下降等情况请及时记录")
  }

  return {
    health_summary: `AI 服务暂时不可用，以下为基于近期数据的模板化报告。近 30 天共记录 ${sampleSize} 条健康指标，风险评估等级: ${riskLevel}。建议持续记录数据以便获得更精准的 AI 分析。`,
    key_findings: findings,
    recommendations,
    risk_level: riskLevel,
    causes: [],
    monitoring_plan: "建议每日记录食欲、便便、活动量；每周复盘指标趋势；如有异常及时就医。",
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
      return NextResponse.json({ error: "pet_id 必填" }, { status: 400 })
    }

    // 鉴权
    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const db = createAdminClient()

    // 校验 pet 归属（用 admin 查避免 RLS 不一致）
    const pet = await ensurePetOwnership(db, body.pet_id, user.id)
    if (!pet) {
      return NextResponse.json({ error: "宠物不存在或无权限" }, { status: 404 })
    }

    // 合并 pet 基础信息（请求体的 pet_info 优先，回退到 DB 查询结果）
    const petInfo = { ...pet, ...(body.pet_info ?? {}) }

    const startTime = Date.now()

    // 并行读取数据
    const [metrics, dietLogs, healthRecords] = await Promise.all([
      fetchHealthMetrics(db, body.pet_id),
      fetchDietLogs(db, body.pet_id),
      fetchHealthRecords(db, body.pet_id),
    ])

    // 调用 DeepSeek
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

    // 异常快照：筛选出明显异常的指标
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
      causes: report.causes ?? [],
      monitoring_plan: report.monitoring_plan ?? null,
      model_used: modelUsed,
      processing_time_ms: processingTimeMs,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      metrics_snapshot: { health_metrics: metrics, diet_logs: dietLogs, health_records: healthRecords },
      anomaly_snapshot: anomalySnapshot,
      summary_snapshot: { key_findings: report.key_findings, ai_available: aiAvailable },
    }

    const { data: inserted, error: insertErr } = await db
      .from("ai_health_reports")
      .insert(insertRow)
      .select("id, pet_id, report_date, risk_level, summary_text, recommendations, causes, monitoring_plan, model_used, processing_time_ms, generated_at")
      .single()

    if (insertErr) {
      console.error("[ai/health-report] insert error:", insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // 返回 iOS 期望的字段（summary、risk_level、recommendations、causes、monitoring_plan、model_used、processing_time_ms）
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
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
