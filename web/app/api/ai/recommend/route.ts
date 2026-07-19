// POST /api/ai/recommend — 智能产品推荐
// 流程: 鉴权 → 读取宠物档案 → 候选产品评分(数据库函数+规则fallback) → DeepSeek生成解释 → 记录追踪 → 返回结构化推荐
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

// rollbackRate 10 秒内存缓存，避免每次推荐都查 pflid.rollout_event_log
let rollbackRateCache: { value: number; expiresAt: number } | null = null
const ROLLBACK_CACHE_TTL_MS = 10_000

// SegmentKey 合法值集合（topProduct.segmentKey 可能是 "default" 等非法值，需要归一化）
const VALID_SEGMENT_KEYS: SegmentKey[] = ["global", "new_user", "returning_user", "high_intent", "low_intent"]
function normalizeSegmentKey(sk: string | undefined): SegmentKey {
  return (VALID_SEGMENT_KEYS as string[]).includes(sk ?? "") ? (sk as SegmentKey) : "global"
}

// PII 脱敏正则：发送给第三方 LLM 前剔除用户敏感信息
// 手机号（11位）/身份证（15或18位，含末位X）/邮箱/URL/UUID
const PII_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  { re: /1[3-9]\d{9}/g, replacement: "[手机号]" }, // 手机号
  { re: /[1-9]\d{4}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g, replacement: "[身份证]" }, // 18位身份证
  { re: /[1-9]\d{4}\d{7}\d{3}/g, replacement: "[身份证]" }, // 15位身份证
  { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "[邮箱]" }, // 邮箱
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
  score: number // originalScore，原始评分（保留）
  finalScore: number // 加权融合后用于排序的最终分
  dimensions: DbScoreResult["dimensions"]
  risks: RiskEvent[]
  dbScore: number | null
  effectivenessScore: number | null // 飞轮有效性评分 0-100
  effectivenessSampleCount: number | null // 飞轮样本数
  strategyId?: string // 飞轮 ETL 用：产生此推荐的策略 ID（默认 "default"）
  segmentKey?: string // 飞轮 ETL 用：用户分群 key（默认 "default"）
}

interface RecommendRequest {
  petId: string
  query?: string
}

const BREED_ALIASES: Record<string, string[]> = {
  "布偶猫": ["布偶", "ragdoll"],
  "英国短毛猫": ["英短", "british shorthair"],
  "美国短毛猫": ["美短", "american shorthair"],
  "中国狸花猫": ["狸花", "lihua"],
  "暹罗猫": ["暹罗", "siamese"],
  "波斯猫": ["波斯", "persian"],
  "缅因猫": ["缅因", "maine coon"],
}

function normalizeBreed(breed: string | null): string {
  return breed?.trim() ?? ""
}

function matchesBreed(product: Product, breed: string | null): boolean {
  const b = normalizeBreed(breed)
  if (!b) return false
  const text = `${product.name} ${product.description ?? ""}`.toLowerCase()
  const keywords = BREED_ALIASES[b] ?? [b]
  return keywords.some((k) => text.includes(k.toLowerCase()))
}

function matchesLifeStage(product: Product, pet: Pet): boolean {
  const totalMonths = pet.age_years * 12 + pet.age_months
  if (product.applicable_age === "all") return true
  if (product.applicable_age === "kitten" && totalMonths < 12) return true
  if (product.applicable_age === "adult" && totalMonths >= 12 && totalMonths < 84) return true
  if (product.applicable_age === "senior" && totalMonths >= 84) return true
  return false
}

function isStomachFriendly(ingredients: Ingredient[], pet: Pet): boolean {
  if (!["sensitive", "very_sensitive"].includes(pet.stomach_health)) return false
  const text = ingredients.map((i) => i.ingredient_name).join(" ")
  const friendly = ["低敏", "单一蛋白", "无谷", "益生元", "益生菌", "易消化", "水解蛋白"]
  return friendly.some((k) => text.includes(k))
}

function matchesQuery(product: Product, ingredients: Ingredient[], query?: string): boolean {
  if (!query?.trim()) return false
  const q = query.toLowerCase()
  const text = `${product.name} ${product.brand} ${product.description ?? ""} ${ingredients.map((i) => i.ingredient_name).join(" ")}`.toLowerCase()
  const keywords = q.split(/[\s,，]+/).filter(Boolean)
  return keywords.some((k) => text.includes(k))
}

function calculateRuleFallbackScore(
  product: Product,
  pet: Pet,
  ingredients: Ingredient[],
  query?: string,
): { score: number; dimensions: ScoredProduct["dimensions"] } {
  const dimensions: ScoredProduct["dimensions"] = {
    overall_rating: 0,
    stomach_match: ["sensitive", "very_sensitive"].includes(pet.stomach_health) ? 3 : 4,
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

function mergeScores(
  dbResult: DbScoreResult | null,
  fallback: ReturnType<typeof calculateRuleFallbackScore>,
  pet: Pet,
): { score: number; dimensions: ScoredProduct["dimensions"] } {
  const dbScore = dbResult?.score ?? 0
  const dbDimensions = dbResult?.dimensions ?? fallback.dimensions

  // 数据库评分足够高时直接使用
  if (dbScore >= 30) {
    return { score: dbScore, dimensions: dbDimensions }
  }

  // 冷启动/数据稀疏时，混合数据库评分与规则fallback
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
    pet.age_years * 12 + pet.age_months < 12
      ? "幼猫"
      : pet.age_years * 12 + pet.age_months >= 84
        ? "老年猫"
        : "成猫"
  const breed = pet.breed ?? ""
  const stomach =
    pet.stomach_health === "sensitive"
      ? "肠胃敏感"
      : pet.stomach_health === "very_sensitive"
        ? "极易敏感肠胃"
        : "肠胃正常"
  const count = topProducts.length
  const queryText = query?.trim() ? `，重点考虑「${query.trim()}」` : ""
  return `为 ${breed}${stage}「${pet.name}」(${stomach}) 筛选了 ${count} 款较匹配的产品${queryText}。当前数据仍在积累中，建议结合猫咪实际试吃反馈做最终选择。`
}

function generateFallbackExplanation(item: ScoredProduct): string {
  const reasons: string[] = []
  if (item.dimensions.breed_match >= 4) reasons.push("品种适配度较好")
  if (item.dimensions.stomach_match >= 4) reasons.push("对肠胃敏感猫咪较友好")
  if (item.dimensions.stool_safety >= 4) reasons.push("便便稳定性较好")
  if (item.dimensions.long_term_stability >= 4) reasons.push("长期稳定性得分较高")
  if (item.risks.length > 0) reasons.push(`注意${item.risks.length}项风险提示`)
  if (reasons.length === 0) reasons.push("综合透明度与基础配方匹配")
  return reasons.join("，") + "。"
}

async function generateExplanations(
  pet: Pet,
  topProducts: ScoredProduct[],
  query?: string,
): Promise<{ summary: string; explanations: string[]; confidence: number[] }> {
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
    age: `${pet.age_years}岁${pet.age_months}个月`,
    stomach_health: pet.stomach_health,
    // 注意：disease_history 当前未拼入 prompt，若后续需要加入，必须先过 sanitizePII()
    query: sanitizePII(query) || "无特殊需求",
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

  const prompt = `你是一位宠物营养顾问。请基于以下宠物档案和候选产品，生成一段中文推荐总结，并为每个产品写一句推荐理由（30字以内），最后给出每个推荐的置信度（0-100整数）。

宠物档案：${JSON.stringify(petContext)}
候选产品：${JSON.stringify(productList)}

飞轮可信度提示：若产品包含 effectiveness_score（0-100）与 effectiveness_sample_count 字段，表示该产品有历史推荐有效性追踪数据。在推荐理由中可适当体现"基于 N 次追踪数据"的可信度信号（如"经 X 次追踪验证效果稳定"）；若无该字段则按常规推荐话术。

请严格按以下 JSON 格式返回，不要加 markdown 代码块：
{
  "summary": "一段100字以内的总结",
  "explanations": ["产品1推荐理由", "产品2推荐理由", ...],
  "confidence": [92, 85, 78, ...]
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
    const content = data.choices?.[0]?.message?.content ?? ""
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary ?? generateFallbackSummary(pet, topProducts, query),
        explanations: Array.isArray(parsed.explanations)
          ? parsed.explanations
          : topProducts.map(generateFallbackExplanation),
        confidence: Array.isArray(parsed.confidence)
          ? parsed.confidence.map((c: number) => Math.max(0, Math.min(100, c)))
          : topProducts.map((_, i) => Math.max(60, 95 - i * 8)),
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
  // 使用 crypto.randomUUID（CSPRNG），避免 Math.random 被预测枚举其他用户 trace
  const traceId = `rec-${crypto.randomUUID()}`

  try {
    const { petId, query } = (await request.json().catch(() => ({}))) as RecommendRequest
    if (!petId) {
      return NextResponse.json({ error: "petId 必填" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }
    const profileId = userData.user.id

    // 1. Load pet profile
    const { data: petRow, error: petErr } = await supabase
      .from("pets")
      .select("id,name,species,breed,age_years,age_months,stomach_health,disease_history")
      .eq("id", petId)
      .eq("profile_id", profileId)
      .single()

    if (petErr || !petRow) {
      return NextResponse.json({ error: "宠物档案不存在或无权限" }, { status: 404 })
    }

    const pet = petRow as unknown as Pet

    // 2. Load active products with ingredients and risks
    const [{ data: products }, { data: ingredients }, { data: risks }] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,brand,price_min,price_max,image_url,applicable_species,applicable_age,description,transparency_score")
        .eq("is_active", true),
      supabase.from("product_ingredients").select("product_id,ingredient_name,ingredient_type,is_grain_free,allergen_risk,nutrition_tags"),
      supabase.from("risk_events").select("product_id,title,severity,description").eq("resolved", false),
    ])

    const productList = (products ?? []) as unknown as Product[]
    const ingredientList = (ingredients ?? []) as unknown as Ingredient[]
    const riskList = (risks ?? []) as unknown as RiskEvent[]

    if (productList.length === 0) {
      return NextResponse.json({ error: "暂无可用产品数据" }, { status: 404 })
    }

    // 3. Build lookup maps
    const ingredientsByProduct = new Map<string, Ingredient[]>()
    for (const ing of ingredientList) {
      const list = ingredientsByProduct.get(ing.product_id) ?? []
      list.push(ing)
      ingredientsByProduct.set(ing.product_id, list)
    }

    const risksByProduct = new Map<string, RiskEvent[]>()
    for (const risk of riskList) {
      const list = risksByProduct.get(risk.product_id) ?? []
      list.push(risk)
      risksByProduct.set(risk.product_id, list)
    }

    // 4. Score candidates: database function + rule fallback
    const scored: ScoredProduct[] = []
    for (const product of productList) {
      const productIngredients = ingredientsByProduct.get(product.id) ?? []
      const productRisks = risksByProduct.get(product.id) ?? []

      const { data: scoreData, error: scoreErr } = await supabase.rpc("score_product_for_pet", {
        p_product_id: product.id,
        p_pet_id: petId,
      })

      if (scoreErr) {
        console.error(`[recommend] score_product_for_pet failed for ${product.id}:`, scoreErr)
      }

      const dbResult = (scoreData as DbScoreResult | null) ?? null
      const fallback = calculateRuleFallbackScore(product, pet, productIngredients, query)
      const { score, dimensions } = mergeScores(dbResult, fallback, pet)

      scored.push({
        product,
        score,
        finalScore: score, // 默认等于 originalScore，飞轮融合后会覆盖
        dimensions,
        risks: productRisks,
        dbScore: dbResult?.score ?? null,
        effectivenessScore: null,
        effectivenessSampleCount: null,
      })
    }

    // 4.5 Load flywheel effectiveness scores (best-effort, gracefully degrade on RLS/empty)
    // pflid.effectiveness_scores 仅对 service_role 开 SELECT 策略，普通 anon 会被 RLS 拦截
    // 优先用 createClient() 读，若被拦截则降级到 createAdminClient()
    // 表名 schema-qualified（pflid.effectiveness_scores）不在 database.types.ts 中，
    // 用 as any 绕过 supabase 严格表名重载（项目既有模式，见 effectiveness-scoring.ts 等）
    const effectivenessByProduct = new Map<string, { score: number; sampleCount: number }>()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let effResult = await (supabase as any)
        .from("pflid.effectiveness_scores")
        .select("entity_id,effectiveness_score,sample_count,version")
        .eq("entity_type", "product")
        .order("version", { ascending: false })

      if (effResult.error) {
        // RLS 拦截或其它错误 -> 降级到 admin client
        const admin = createAdminClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effResult = await (admin as any)
          .from("pflid.effectiveness_scores")
          .select("entity_id,effectiveness_score,sample_count,version")
          .eq("entity_type", "product")
          .order("version", { ascending: false })
      }

      if (effResult.error) {
        console.error("[recommend] effectiveness_scores load failed:", effResult.error)
      } else if (effResult.data) {
        // 已按 version desc 排序，每个 entity_id 取首条（最新版本）
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

    // 4.6 加权融合：originalScore 与 effectiveness_score 同为 0-100 量纲
    // finalScore = originalScore * 0.7 + effectiveness_score * 0.3
    // （任务原文公式 effectiveness_score/100 * 0.3 存在量纲不一致：左边 0-100，右边 0-0.3，
    //  会使 finalScore 严重缩水破坏排序语义，故修正为同量纲加权）
    // 飞轮无记录 -> finalScore = originalScore（优雅降级）
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
      score: item.finalScore, // 返回飞轮融合后的最终分（保持 iOS 推荐契约 0-100 量纲）
      original_score: item.score, // 原始评分，便于前端展示飞轮加权影响
      dimensions: item.dimensions,
      explanation: explanations[i] ?? generateFallbackExplanation(item),
      confidence: confidence[i] ?? Math.max(60, 95 - i * 8),
      // 飞轮可信度信号（如有），让前端可展示"基于 X 次长期追踪数据"
      effectiveness_score: item.effectivenessScore,
      effectiveness_sample_count: item.effectivenessSampleCount,
    }))

    const warnings = topProducts
      .flatMap((item) =>
        item.risks.map((r) => ({
          product: { id: item.product.id, name: item.product.name, brand: item.product.brand },
          reason: r.title,
          risk_score: r.severity === "critical" ? 90 : r.severity === "high" ? 75 : r.severity === "medium" ? 50 : 25,
        })),
      )
      .slice(0, 5)

    const ageLabel =
      pet.age_years * 12 + pet.age_months < 12
        ? "幼猫"
        : pet.age_years * 12 + pet.age_months >= 84
          ? "老年猫"
          : "成猫"

    const first = recommendations[0]

    // raw_score is on 0-5 scale; contribution = weighted share of that dimension
    const factorDefs = [
      { factor: "breed_match", label: "品种适配", raw_score: first?.dimensions.breed_match ?? 0, weight_pct: 10 },
      { factor: "stomach_match", label: "肠胃匹配", raw_score: first?.dimensions.stomach_match ?? 0, weight_pct: 25 },
      { factor: "stool_safety", label: "便便安全", raw_score: first?.dimensions.stool_safety ?? 0, weight_pct: 20 },
      { factor: "long_term_stability", label: "长期稳定", raw_score: first?.dimensions.long_term_stability ?? 0, weight_pct: 15 },
      { factor: "repurchase_rate", label: "回购率", raw_score: first?.dimensions.repurchase_rate ?? 0, weight_pct: 10 },
      { factor: "overall_rating", label: "综合评分", raw_score: first?.dimensions.overall_rating ?? 0, weight_pct: 20 },
    ]

    const breakdown = {
      product_id: first?.product.id ?? "",
      pet_id: pet.id,
      total_score: first?.score ?? 0,
      model_attribution: {
        disclaimer: "当前推荐基于现有产品数据、成分标签、风险事件和宠物画像计算，社区评价数据积累中。",
        factors: factorDefs.map((f) => ({
          ...f,
          contribution: Math.round((f.raw_score / 5) * f.weight_pct * 10) / 10,
          max_contribution: f.weight_pct,
        })),
      },
      evidence_support: [
        { data_point: "产品透明度", observed_value: `${first?.product.brand ?? ""} 透明度 ${productList.find((p) => p.id === first?.product.id)?.transparency_score ?? 0} 分`, statistical_note: "来自产品基础信息" },
      ],
      negative_signals: warnings.map((w) => ({
        signal: w.reason,
        severity: w.risk_score >= 75 ? "high" : w.risk_score >= 50 ? "medium" : "low" as const,
        source: "risk_events",
        actionable: true,
      })),
      product_confidence: first?.confidence ?? 70,
    }

    const result = {
      recommendations,
      warnings,
      summary,
      pet_context: {
        breed: pet.breed ?? "未知品种",
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
      query: query ?? null,
      top_product_ids: topProducts.map((p) => p.product.id),
      top_scores: topProducts.map((p) => p.score),
      has_deepseek: !!process.env.DEEPSEEK_API_KEY,
      duration_ms: Date.now() - startTime,
    }

    // feature_snapshot 必须包含 product_id / strategy_id / segment_key 等飞轮 ETL 必需字段
    // 同时写入 input_features 列便于后续 batch job 反查
    const topProduct = topProducts[0]

    // 7.5 飞轮 enrich 字段：banditConfidence / segmentAlignment / rollbackRate / adverseEventRate
    // 所有外部调用 try/catch 降级，绝不让推荐主流程崩溃

    // (1) banditConfidence: Thompson Sampling Beta 后验均值 alpha/(alpha+beta)
    // 调用 selectBanditArm 需要 RolloutDecision，通过 rolloutController.decideEngine 获取
    let banditSelection: ArmSelection | null = null
    try {
      const decision = await rolloutController.decideEngine({ requestId: traceId })
      banditSelection = await selectBanditArm({
        decision,
        requestId: traceId,
        segment: normalizeSegmentKey(topProduct?.segmentKey),
      })
      // 把 bandit arm_id 和 segment 落到 ScoredProduct（覆盖 "default"）
      if (topProduct && banditSelection) {
        topProduct.strategyId = banditSelection.armId
        topProduct.segmentKey = banditSelection.segment
      }
    } catch (e) {
      console.warn("[recommend] bandit selection failed, fallback to default:", (e as Error).message)
    }
    const banditConfidence = banditSelection
      ? banditSelection.alpha / (banditSelection.alpha + banditSelection.beta)
      : 0.5

    // (2) segmentAlignment: 简化版 = explorationCapPct/100（该 segment 的探索配额占比）
    let segmentAlignment = 0.5
    try {
      const adjustment = await computeSegmentAdjustment(
        normalizeSegmentKey(topProduct?.segmentKey),
        DEFAULT_OBJECTIVE_WEIGHTS,
      )
      segmentAlignment = adjustment?.explorationCapPct
        ? Math.max(0, Math.min(1, adjustment.explorationCapPct / 100))
        : 0.5
    } catch (e) {
      console.warn("[recommend] segment adjustment failed:", (e as Error).message)
    }

    // (3) rollbackRate: 近 30 天 pflid.rollout_event_log 中 rollback/auto_rollback 占比
    // 使用 createAdminClient 绕过 RLS，加 10s 内存缓存
    let rollbackRate = 0
    try {
      const now = Date.now()
      if (!rollbackRateCache || rollbackRateCache.expiresAt < now) {
        const admin = createAdminClient()
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rolloutEvents } = await (admin as any)
          .from("pflid.rollout_event_log")
          .select("event_type")
          .gte("created_at", thirtyDaysAgo)
        if (rolloutEvents && rolloutEvents.length > 0) {
          const rollbackCount = rolloutEvents.filter(
            (e: { event_type: string }) =>
              e.event_type === "rollback" || e.event_type === "auto_rollback",
          ).length
          rollbackRate = rollbackCount / rolloutEvents.length
        }
        rollbackRateCache = { value: rollbackRate, expiresAt: now + ROLLBACK_CACHE_TTL_MS }
      } else {
        rollbackRate = rollbackRateCache.value
      }
    } catch (e) {
      console.warn("[recommend] rollback rate fetch failed:", (e as Error).message)
    }

    // (4) adverseEventRate: 近 30 天该 pet 的 health_records 中 severity>=4 的 symptom 占比
    let adverseEventRate = 0
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: healthRecs } = await supabase
        .from("health_records")
        .select("record_type,severity")
        .eq("pet_id", petId)
        .gte("created_at", thirtyDaysAgo)
      if (healthRecs && healthRecs.length > 0) {
        const adverseCount = healthRecs.filter(
          (r: { record_type: string; severity?: number | null }) =>
            r.record_type === "symptom" && (r.severity ?? 0) >= 4,
        ).length
        adverseEventRate = adverseCount / healthRecs.length
      }
    } catch (e) {
      console.warn("[recommend] adverse event rate fetch failed:", (e as Error).message)
    }

    const featureSnapshot = {
      pet: { species: pet.species, breed: pet.breed, stomach_health: pet.stomach_health },
      query: query ?? null,
      // 飞轮 ETL 必需字段（见 flywheel-input-builder.ts:98）
      product_id: topProduct?.product.id ?? null,
      productId: topProduct?.product.id ?? null,
      strategy_id: topProduct?.strategyId ?? "default",
      strategyId: topProduct?.strategyId ?? "default",
      segment_key: topProduct?.segmentKey ?? "default",
      // 飞轮加权融合信息（如已读取到 effectiveness_scores）
      effectiveness_score: topProduct?.effectivenessScore ?? null,
      effectiveness_sample_count: topProduct?.effectivenessSampleCount ?? null,
      final_score: topProduct?.finalScore ?? topProduct?.score ?? null,
      original_score: topProduct?.score ?? null,
      // 决策元数据
      model_version: "pettrust-v4.5",
      request_source: "ai_recommend",
      duration_ms: Date.now() - startTime,
      // 飞轮 enrich 字段（来自 bandit/segment/rollback/adverseEvent 真实数据源）
      banditConfidence,
      bandit_arm_id: banditSelection?.armId ?? null,
      segmentAlignment,
      rollbackRate,
      adverseEventRate,
    }

    supabase
      .from("recommendation_trace_log")
      .insert({
        session_id: traceId,
        profile_id: profileId,
        pet_id: petId,
        model_version: "pettrust-v4.5",
        feature_snapshot: featureSnapshot,
        input_features: {
          pet: { species: pet.species, breed: pet.breed, stomach_health: pet.stomach_health, age_years: pet.age_years },
          query: query ?? null,
          top_product_ids: topProducts.map((p) => p.product.id),
          top_scores: topProducts.map((p) => p.score),
        },
        user_segment: topProduct?.segmentKey ?? "default",
        decision_graph: decisionGraph,
      })
      .then(({ error }) => {
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
    void (supabase as any)
      .from("recommendation_events")
      .insert(impressionRows)
      .then(({ error }: { error: unknown }) => {
        if (error) console.error("[recommend] recommendation_events insert failed:", error)
      })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[recommend] error:", err)
    return NextResponse.json(
      { error: "推荐服务异常，请稍后再试" },
      { status: 500 },
    )
  }
}
