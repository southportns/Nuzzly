// POST /api/analytics/trust-score — 计算某实体的信任分
// 接收: { entity_type, entity_id, metadata? }
// 鉴权: Bearer token 优先 (mobile), fallback cookie (web)
// 业务逻辑:
//   - entity_type='user'    → 读 profiles.trust_score
//   - entity_type='product' → 读 product_reviews.overall_rating 平均分
//   - entity_type='pet'     → 读 health_metrics 关联样本计算
// 返回: { trust_score, confidence, sample_size, ... }
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

// 限制可信的 entity_type 白名单
const ALLOWED_ENTITY_TYPES = new Set(["user", "product", "pet"])

interface TrustResult {
  trust_score: number
  confidence: number
  sample_size: number
  confidence_score: number
  factor_scores: Record<string, number> | null
  has_photos: boolean
  has_voucher: boolean
  has_long_term_data: boolean
  is_continuous: boolean
  is_anomaly: boolean
  suspicious_level: number
}

// user: 直接读 profiles.trust_score，由 calculate_trust_score RPC 维护
async function calcUserTrust(db: ReturnType<typeof createAdminClient>, entityId: string): Promise<TrustResult> {
  const { data, error } = await db
    .from("profiles")
    .select("trust_score, review_count, long_term_review_count, verified_purchase_count, pet_profile_completeness")
    .eq("id", entityId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    return baseResult(0, 0, 0)
  }

  const sampleSize = data.review_count ?? 0
  const longTerm = data.long_term_review_count ?? 0
  const verified = data.verified_purchase_count ?? 0
  const trustScore = data.trust_score ?? 0

  // confidence: 0-1，基于样本量和长期数据
  const confidence = Math.min(1, sampleSize / 10)
  const completeness = data.pet_profile_completeness ?? 0

  return {
    trust_score: trustScore,
    confidence,
    sample_size: sampleSize,
    confidence_score: confidence,
    factor_scores: {
      review_count: sampleSize,
      long_term_review_count: longTerm,
      verified_purchase_count: verified,
      pet_profile_completeness: completeness,
    },
    has_photos: false,
    has_voucher: verified > 0,
    has_long_term_data: longTerm > 0,
    is_continuous: sampleSize >= 3,
    is_anomaly: false,
    suspicious_level: 0,
  }
}

// product: 基于 product_reviews.overall_rating 平均评分映射到信任分
async function calcProductTrust(db: ReturnType<typeof createAdminClient>, entityId: string): Promise<TrustResult> {
  const { data, error } = await db
    .from("product_reviews")
    .select("overall_rating, has_voucher, verified_purchase, review_trust_score")
    .eq("product_id", entityId)

  if (error) throw error
  if (!data || data.length === 0) {
    return baseResult(0, 0, 0)
  }

  const sampleSize = data.length
  const ratings = data
    .map((r) => r.overall_rating)
    .filter((r): r is number => typeof r === "number" && r > 0)
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  // 把 1-5 星评分映射到 0-100 信任分
  const trustScore = Math.round((avgRating / 5) * 100)

  const voucherCount = data.filter((r) => r.has_voucher).length
  const verifiedCount = data.filter((r) => r.verified_purchase).length
  const confidence = Math.min(1, sampleSize / 5)
  const isAnomaly = sampleSize >= 3 && avgRating > 0 && avgRating < 2

  return {
    trust_score: trustScore,
    confidence,
    sample_size: sampleSize,
    confidence_score: confidence,
    factor_scores: {
      avg_overall_rating: Number(avgRating.toFixed(2)),
      voucher_count: voucherCount,
      verified_purchase_count: verifiedCount,
    },
    has_photos: false,
    has_voucher: voucherCount > 0,
    has_long_term_data: sampleSize >= 5,
    is_continuous: sampleSize >= 3,
    is_anomaly: isAnomaly,
    suspicious_level: isAnomaly ? 1 : 0,
  }
}

// pet: 基于 health_metrics 样本量与稳定性计算
async function calcPetTrust(db: ReturnType<typeof createAdminClient>, entityId: string): Promise<TrustResult> {
  const { data, error } = await db
    .from("health_metrics")
    .select("appetite_score, stool_score, activity_score, weight_delta, date")
    .eq("pet_id", entityId)
    .order("date", { ascending: false })
    .limit(30)

  if (error) throw error
  if (!data || data.length === 0) {
    return baseResult(0, 0, 0)
  }

  const sampleSize = data.length
  const appetites = data.map((r) => r.appetite_score).filter((v): v is number => typeof v === "number")
  const stools = data.map((r) => r.stool_score).filter((v): v is number => typeof v === "number")
  const activities = data.map((r) => r.activity_score).filter((v): v is number => typeof v === "number")
  const weightDeltas = data.map((r) => r.weight_delta).filter((v): v is number => typeof v === "number")

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const std = (arr: number[]) => {
    if (arr.length < 2) return 0
    const m = avg(arr)
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
  }

  const avgAppetite = avg(appetites)
  const avgStool = avg(stools)
  const avgActivity = avg(activities)
  const weightStd = std(weightDeltas)

  // 综合 trust_score: 三项评分均值（假设 0-100）+ 权重稳定性奖励
  const baseScore = (avgAppetite + avgStool + avgActivity) / 3
  const stabilityBonus = Math.max(0, 10 - weightStd * 10)
  const trustScore = Math.round(Math.max(0, Math.min(100, baseScore + stabilityBonus)))

  const confidence = Math.min(1, sampleSize / 10)
  const isContinuous = sampleSize >= 5
  // 简单异常检测：评分过低或波动过大
  const isAnomaly = baseScore < 40 || weightStd > 1

  return {
    trust_score: trustScore,
    confidence,
    sample_size: sampleSize,
    confidence_score: confidence,
    factor_scores: {
      avg_appetite_score: Number(avgAppetite.toFixed(2)),
      avg_stool_score: Number(avgStool.toFixed(2)),
      avg_activity_score: Number(avgActivity.toFixed(2)),
      weight_delta_std: Number(weightStd.toFixed(3)),
    },
    has_photos: false,
    has_voucher: false,
    has_long_term_data: sampleSize >= 14,
    is_continuous: isContinuous,
    is_anomaly: isAnomaly,
    suspicious_level: isAnomaly ? 1 : 0,
  }
}

function baseResult(trust_score: number, confidence: number, sample_size: number): TrustResult {
  return {
    trust_score,
    confidence,
    sample_size,
    confidence_score: confidence,
    factor_scores: null,
    has_photos: false,
    has_voucher: false,
    has_long_term_data: false,
    is_continuous: false,
    is_anomaly: false,
    suspicious_level: 0,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      entity_type?: string
      entity_id?: string
      metadata?: unknown
    }

    if (!body.entity_type || !body.entity_id) {
      return NextResponse.json({ error: "entity_type 和 entity_id 必填" }, { status: 400 })
    }
    if (!ALLOWED_ENTITY_TYPES.has(body.entity_type)) {
      return NextResponse.json(
        { error: `entity_type 必须为 ${Array.from(ALLOWED_ENTITY_TYPES).join("/")}` },
        { status: 400 },
      )
    }

    // 鉴权
    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 用 admin 查（避免 RLS 在 cookie↔Bearer 切换时的不一致）
    const db = createAdminClient()

    let result: TrustResult
    switch (body.entity_type) {
      case "user":
        result = await calcUserTrust(db, body.entity_id)
        break
      case "product":
        result = await calcProductTrust(db, body.entity_id)
        break
      case "pet":
        result = await calcPetTrust(db, body.entity_id)
        break
      default:
        return NextResponse.json({ error: "不支持的 entity_type" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
