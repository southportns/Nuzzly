// POST /api/ai/chat — 健康对话(规则引擎版)
// 接收:{ petId, message }
// 流程:鉴权 → 验证宠物归属 → 拉 AI context → 规则生成回复 → 持久化 health_chat_sessions
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// 鉴权 helper:优先读 Authorization: Bearer (mobile 客户端走这条),
// 没有就 fallback 到 cookie(Next.js web 端走这条)。
// 这样同一份 API 既能服务 mobile,也能服务 web 端登录用户。
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

type Ctx = {
  pet: { name: string; species: string; age_years: number; age_months: number } | null
  metrics: Array<{
    date: string
    stool_score: number | null
    appetite_score: number | null
    activity_score: number | null
    weight_delta: number | null
    symptom_severity_score: number | null
  }>
  summary: { date: string; summary_text: string | null; risk_level: string | null; anomaly_flags: unknown[] } | null
  trends: unknown
  anomalies: unknown[]
  history: Array<{ role: string; content: string; created_at: string }>
  memory: Array<{ title: string; description: string | null; severity: string | null }>
}

// 规则引擎:根据 context + user 消息生成回复
function generateReply(userMessage: string, ctx: Ctx): string {
  const lines: string[] = []
  const greeting = ctx.pet
    ? `关于 ${ctx.pet.name} 的情况,我看了下近 7 天的档案 📋`
    : "我已收到你的问题,不过还没找到对应的宠物档案 🐾"

  lines.push(greeting)

  // 1) 最新风险等级
  if (ctx.summary?.risk_level) {
    const riskMap: Record<string, string> = {
      low: "低风险,状态良好 ✅",
      medium: "中等风险,需要观察 👀",
      high: "高风险,建议尽快复诊 ⚠️",
      critical: "紧急!请立即就医 🚨",
    }
    lines.push(`最新风险等级:${riskMap[ctx.summary.risk_level] ?? ctx.summary.risk_level}`)
  }

  // 2) 异常
  if (ctx.anomalies.length > 0) {
    const recent = ctx.anomalies.slice(0, 2)
    const items = recent
      .map((a: any) => `· ${a.type ?? "异常"} (${a.severity ?? "未分级"}):${a.message ?? ""}`)
      .join("\n")
    lines.push(`近期异常:\n${items}`)
  }

  // 3) 长期记忆
  if (ctx.memory.length > 0) {
    const m = ctx.memory[0]
    lines.push(`长期记忆: ${m.title} — ${m.description ?? ""}`)
  }

  // 4) 简单意图匹配
  const msg = userMessage.toLowerCase()
  if (/软便|拉稀|腹泻/.test(userMessage)) {
    lines.push(
      "针对软便的建议:\n1) 暂换低敏粮 24-48h\n2) 记录每餐时间 + 形态评分(1-5)\n3) 持续 3 天未改善 → 复诊",
    )
  } else if (/换粮|换.*粮|新粮/.test(userMessage)) {
    lines.push(
      "换粮 7 天过渡建议:\nDay1-2: 25% 新粮\nDay3-4: 50%\nDay5-6: 75%\nDay7+: 100%\n每餐后观察粪便 + 食欲,出现软便立即回退一档。",
    )
  } else if (/呕吐|吐/.test(userMessage)) {
    lines.push(
      "呕吐观察清单:\n· 单次且精神好:禁食 2h 后少量多次给水\n· 24h 内 ≥3 次:禁食 + 就医\n· 带血/黄绿/异物:立即就医",
    )
  } else if (/推荐|适合|哪款|选.*粮/.test(userMessage)) {
    lines.push("想给你推荐,但需要知道:1) 当前主粮 2) 软便/敏感 3) 预算。回复数字 1/2/3 我会接着分析。")
  } else if (/精神|不活|嗜睡|没劲/.test(userMessage)) {
    lines.push("精神不好可能原因:疼痛/低血糖/脱水/中毒。如果伴随呕吐/腹泻/不食,建议立即就医。")
  } else {
    lines.push("我会结合档案给出建议,你也可以描述更具体:症状 + 持续时间 + 当餐吃了什么。")
  }

  return lines.join("\n\n")
}

export async function POST(request: Request) {
  try {
    const { petId, message } = (await request.json().catch(() => ({}))) as {
      petId?: string
      message?: string
    }

    if (!petId || !message?.trim()) {
      return NextResponse.json(
        { error: "petId 和 message 必填" },
        { status: 400 },
      )
    }

    // 1) 鉴权:优先 Bearer token(mobile 客户端走这条),fallback cookie(web 端)
    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }
    // 后续 DB 调用统一用 admin 客户端,避免 RLS 在 SSR cookie↔Bearer 切换时的不一致
    // 权限边界由我们手动校验:pet.profile_id === user.id
    const db = createAdminClient()

    // 2) 验证 pet 属于当前 user
    const { data: pet, error: petErr } = await db
      .from("pets")
      .select("id, name, species, age_years, age_months, profile_id")
      .eq("id", petId)
      .maybeSingle()

    if (petErr) {
      return NextResponse.json({ error: petErr.message }, { status: 500 })
    }
    if (!pet || (pet as any).profile_id !== user.id) {
      return NextResponse.json({ error: "宠物不存在或无权限" }, { status: 403 })
    }

    // 3) 拉 AI 上下文(走 RPC build_ai_context)
    let ctx: Ctx = {
      pet: { name: pet.name, species: pet.species, age_years: pet.age_years ?? 0, age_months: pet.age_months ?? 0 },
      metrics: [],
      summary: null,
      trends: null,
      anomalies: [],
      history: [],
      memory: [],
    }

    try {
      const { data: rpcData } = await db.rpc("build_ai_context" as any, {
        p_pet_id: petId,
        p_date: new Date().toISOString().slice(0, 10),
        p_range_days: 7,
      })
      if (rpcData && typeof rpcData === "object") {
        const d = rpcData as any
        ctx = {
          pet: ctx.pet,
          metrics: d.metrics ?? [],
          summary: d.summary ?? null,
          trends: d.trends ?? null,
          anomalies: d.anomalies ?? [],
          history: [],
          memory: [],
        }
      }
    } catch {
      // RPC 缺失或失败,降级到直接查表
    }

    // 4) 拉历史 5 条对话(同 pet)
    const { data: historyRows } = await db
      .from("health_chat_sessions")
      .select("user_message, ai_response, created_at")
      .eq("pet_id", petId)
      .order("created_at", { ascending: false })
      .limit(5)
    ctx.history = (historyRows ?? []).map((h) => ({
      role: "user",
      content: h.user_message,
      created_at: h.created_at,
    }))

    // 5) 拉长期记忆
    const { data: memoryRows } = await db
      .from("health_memory")
      .select("title, description, severity")
      .eq("pet_id", petId)
      .eq("is_active", true)
      .order("last_observed", { ascending: false })
      .limit(3)
    ctx.memory = (memoryRows ?? []).map((m) => ({
      title: m.title,
      description: m.description,
      severity: m.severity,
    }))

    // 6) 生成回复
    const reply = generateReply(message, ctx)

    let sessionId: string | null = null
    try {
      const { data: inserted } = await db
        .from("health_chat_sessions")
        .insert({
          pet_id: petId,
          profile_id: user.id,
          user_message: message,
          ai_response: reply,
          context_snapshot: {
            summary: ctx.summary,
            anomalies_count: ctx.anomalies.length,
            memory_count: ctx.memory.length,
            history_count: ctx.history.length,
          },
          model_used: "rule-engine-v1",
        } as any)
        .select("id")
        .single()
      sessionId = (inserted as any)?.id ?? null
    } catch (e) {
      // 持久化失败不影响主流程
      console.error("[ai/chat] persist error:", e)
    }

    return NextResponse.json({
      reply,
      sessionId,
      context: {
        risk_level: ctx.summary?.risk_level ?? null,
        anomalies_count: ctx.anomalies.length,
        memory_count: ctx.memory.length,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// GET /api/ai/chat?petId=xxx — 拉历史对话
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const petId = url.searchParams.get("petId")
    if (!petId) {
      return NextResponse.json({ error: "petId 必填" }, { status: 400 })
    }

    const supabase = await createClient()
    const { user } = await getAuthUser(request, supabase)
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })

    // 用 admin 查所有用户的历史;若需要"只能查自己"再加 profile_id 过滤
    const db = createAdminClient()
    const { data, error } = await db
      .from("health_chat_sessions")
      .select("id, user_message, ai_response, created_at, model_used")
      .eq("pet_id", petId)
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ sessions: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
