// POST /api/ai/recommend — 智能产品推荐
// 流程: 鉴权 → 读取宠物档案 → 候选产品评分(数据库函数+规则fallback) → DeepSeek生成解释 → 记录追踪 → 返回结构化推荐
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEEPSEEK_BASE = "https://api.deepseek.com"

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
  score: number
  dimensions: DbScoreResult["dimensions"]
  risks: RiskEvent[]
  dbScore: number | null
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
    dimensions: item.dimensions,
    risks: item.risks.map((r) => ({ title: r.title, severity: r.severity })),
  }))

  const prompt = `你是一位宠物营养顾问。请基于以下宠物档案和候选产品，生成一段中文推荐总结，并为每个产品写一句推荐理由（30字以内），最后给出每个推荐的置信度（0-100整数）。

宠物档案：${JSON.stringify(petContext)}
候选产品：${JSON.stringify(productList)}

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
        dimensions,
        risks: productRisks,
        dbScore: dbResult?.score ?? null,
      })
    }

    // 5. Sort and take top 5
    scored.sort((a, b) => b.score - a.score)
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
      score: item.score,
      dimensions: item.dimensions,
      explanation: explanations[i] ?? generateFallbackExplanation(item),
      confidence: confidence[i] ?? Math.max(60, 95 - i * 8),
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

    supabase
      .from("recommendation_trace_log")
      .insert({
        session_id: traceId,
        profile_id: profileId,
        pet_id: petId,
        model_version: "pettrust-v4.5",
        feature_snapshot: {
          pet: { species: pet.species, breed: pet.breed, stomach_health: pet.stomach_health },
          query: query ?? null,
        },
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

    supabase
      .from("recommendation_events")
      .insert(impressionRows)
      .then(({ error }) => {
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
