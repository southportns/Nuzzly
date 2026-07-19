// =============================================
// Phase 3.95: Flywheel Input ETL Builder
// 自动从生产数据库表构造 FlywheelInput，触发 data flywheel cycle
// =============================================
// 数据来源映射：
//   recommendation_trace_log  → FlywheelInput.recommendations
//   recommendation_feedback   → outcomes[recId].ownerAdherence
//   health_metrics            → outcomes[recId].healthScoreDelta + benchmarkUpdates + baselineMetrics
//   pet_events                → outcomes[recId].timelineEventCount + dataFreshnessDays
//   pets                      → cohortData

import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { FlywheelInput } from "@/lib/timeline/data-flywheel"
import type { BenchmarkUpdate } from "@/lib/timeline/health-benchmarks"

// ─── Constants ──────────────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_CONFIDENCE = 0.5
const DEFAULT_RATE = 0
const DEFAULT_FRESHNESS_DAYS = 30

// recommendation_feedback.action 取值: 'accept' | 'reject' | 'purchased' | 'bookmarked'
// 旧数据可能还有 'accepted'，兼容两种
const ADHERENCE_ACTIONS = new Set(["accept", "accepted", "purchased"])

// ─── Row Types (loose typing for JSONB fields) ──────────────────────────────

interface TraceLogRow {
  id: string
  pet_id: string
  model_version: string
  user_segment: string | null
  feature_snapshot: Record<string, unknown> | null
  input_features: Record<string, unknown> | null
  created_at: string
}

interface FeedbackRow {
  recommendation_id: string | null
  action: string
  pet_id: string
  product_id: string
}

interface HealthMetricRow {
  pet_id: string
  date: string
  appetite_score: number | null
  stool_score: number | null
  activity_score: number | null
}

interface PetEventRow {
  pet_id: string
  event_time: string
  event_type: string
}

interface PetRow {
  id: string
  species: string
  life_stage: string | null
  stomach_health: string
  breed: string | null
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 从生产数据库构造 FlywheelInput。
 * 默认使用 createClient() (server.ts)；对 RLS 限制为 owner-only 的表
 * (recommendation_trace_log / recommendation_feedback) 回退到 admin client。
 */
export async function buildFlywheelInput(): Promise<FlywheelInput> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const now = Date.now()
  const thirtyDaysAgoIso = new Date(now - THIRTY_DAYS_MS).toISOString()
  const thirtyDaysAgoDate = thirtyDaysAgoIso.slice(0, 10)

  // 1. recommendation_trace_log: 近 30 天推荐记录 (RLS: trace_read_own → admin)
  const { data: traceLogsData } = await admin
    .from("recommendation_trace_log")
    .select("id, pet_id, model_version, user_segment, feature_snapshot, input_features, created_at")
    .gte("created_at", thirtyDaysAgoIso)
    .order("created_at", { ascending: false })

  const traceLogs = (traceLogsData ?? []) as unknown as TraceLogRow[]

  const recommendations: FlywheelInput["recommendations"] = []
  const featureSnapByRecId = new Map<string, Record<string, unknown>>()
  for (const row of traceLogs) {
    const featureSnap = (row.feature_snapshot ?? {}) as Record<string, unknown>
    const inputFeat = (row.input_features ?? {}) as Record<string, unknown>
    const productId = extractString(featureSnap, inputFeat, ["product_id", "productId"])
    if (!productId) continue // 没有 product_id 无法进入飞轮
    featureSnapByRecId.set(row.id, featureSnap)
    recommendations.push({
      recommendationId: row.id,
      petId: row.pet_id,
      productId,
      strategyId: extractString(featureSnap, inputFeat, ["strategy_id", "strategyId"]) ?? undefined,
      policyVersion: row.model_version,
      segmentKey: row.user_segment ?? undefined,
    })
  }

  // 2. recommendation_feedback: 这些 recommendation_id 的反馈 (RLS: feedback_read_own → admin)
  const recIds = recommendations.map(r => r.recommendationId)
  const feedbackByRec = new Map<string, FeedbackRow[]>()
  if (recIds.length > 0) {
    const { data: feedbackData } = await admin
      .from("recommendation_feedback")
      .select("recommendation_id, action, pet_id, product_id")
      .in("recommendation_id", recIds)
    for (const fb of (feedbackData ?? []) as unknown as FeedbackRow[]) {
      if (!fb.recommendation_id) continue
      const list = feedbackByRec.get(fb.recommendation_id) ?? []
      list.push(fb)
      feedbackByRec.set(fb.recommendation_id, list)
    }
  }

  // 3. health_metrics: 每只宠物的 appetite/stool/activity 变化 (RLS: read_auth → createClient)
  const petIds = Array.from(new Set(recommendations.map(r => r.petId)))
  const healthByPet = new Map<string, HealthMetricRow[]>()
  if (petIds.length > 0) {
    const { data: hmData } = await supabase
      .from("health_metrics")
      .select("pet_id, date, appetite_score, stool_score, activity_score")
      .in("pet_id", petIds)
      .gte("date", thirtyDaysAgoDate)
      .order("date", { ascending: true })
    for (const hm of (hmData ?? []) as unknown as HealthMetricRow[]) {
      const list = healthByPet.get(hm.pet_id) ?? []
      list.push(hm)
      healthByPet.set(hm.pet_id, list)
    }
  }

  // 4. pet_events: 每只宠物的事件数 + 时间新鲜度 (RLS: events_read_auth → createClient)
  const eventsByPet = new Map<string, PetEventRow[]>()
  if (petIds.length > 0) {
    const { data: evData } = await supabase
      .from("pet_events")
      .select("pet_id, event_time, event_type")
      .in("pet_id", petIds)
      .gte("event_time", thirtyDaysAgoIso)
      .order("event_time", { ascending: false })
    for (const ev of (evData ?? []) as unknown as PetEventRow[]) {
      const list = eventsByPet.get(ev.pet_id) ?? []
      list.push(ev)
      eventsByPet.set(ev.pet_id, list)
    }
  }

  // 5. pets: 用于 cohort 构造 (RLS: pets_select_auth → createClient)
  const petsById = new Map<string, PetRow>()
  if (petIds.length > 0) {
    const { data: petsData } = await supabase
      .from("pets")
      .select("id, species, life_stage, stomach_health, breed")
      .in("id", petIds)
    for (const p of (petsData ?? []) as unknown as PetRow[]) {
      petsById.set(p.id, p)
    }
  }

  // 6. 组装 outcomes
  const outcomes: FlywheelInput["outcomes"] = {}
  let realFlywheelFieldRecCount = 0
  for (const rec of recommendations) {
    const feedback = feedbackByRec.get(rec.recommendationId) ?? []
    const ownerAdherence = computeOwnerAdherence(feedback)

    const metrics = healthByPet.get(rec.petId) ?? []
    const healthScoreDelta = computeHealthScoreDelta(metrics)

    const events = eventsByPet.get(rec.petId) ?? []
    const timelineEventCount = events.length
    const dataFreshnessDays = computeDataFreshnessDays(events, now)

    // 优先从 feature_snapshot 读取真实飞轮字段，缺失时降级到默认值
    const featureSnap = featureSnapByRecId.get(rec.recommendationId) ?? {}
    const banditConfidenceRaw = extractNumber(featureSnap, ["banditConfidence"])
    const segmentAlignmentRaw = extractNumber(featureSnap, ["segmentAlignment"])
    const outcomeClarityRaw = extractNumber(featureSnap, ["outcomeClarity"])
    const predictionAccuracyRaw = extractNumber(featureSnap, ["predictionAccuracy"])
    const attributionConfidenceRaw = extractNumber(featureSnap, ["attributionConfidence"])
    const outcomeStabilityRaw = extractNumber(featureSnap, ["outcomeStability"])
    const horizonAgreementRaw = extractNumber(featureSnap, ["horizonAgreement"])
    const adverseEventRateRaw = extractNumber(featureSnap, ["adverseEventRate"])
    const rollbackRateRaw = extractNumber(featureSnap, ["rollbackRate"])

    const banditConfidence = banditConfidenceRaw ?? DEFAULT_CONFIDENCE
    const segmentAlignment = segmentAlignmentRaw ?? DEFAULT_CONFIDENCE
    const outcomeClarity = outcomeClarityRaw ?? DEFAULT_CONFIDENCE
    const predictionAccuracy = predictionAccuracyRaw ?? DEFAULT_CONFIDENCE
    const attributionConfidence = attributionConfidenceRaw ?? DEFAULT_CONFIDENCE
    const outcomeStability = outcomeStabilityRaw ?? DEFAULT_CONFIDENCE
    const horizonAgreement = horizonAgreementRaw ?? DEFAULT_CONFIDENCE
    const adverseEventRate = adverseEventRateRaw ?? DEFAULT_RATE
    const rollbackRate = rollbackRateRaw ?? DEFAULT_RATE

    // 统计：feature_snapshot 是否包含至少 1 个真实飞轮字段
    if (
      [
        banditConfidenceRaw,
        segmentAlignmentRaw,
        outcomeClarityRaw,
        predictionAccuracyRaw,
        attributionConfidenceRaw,
        outcomeStabilityRaw,
        horizonAgreementRaw,
        adverseEventRateRaw,
        rollbackRateRaw,
      ].some(v => v !== null)
    ) {
      realFlywheelFieldRecCount++
    }

    outcomes[rec.recommendationId] = {
      healthScoreDelta,
      symptomImprovement: {},
      ownerAdherence,
      timelineSignalStrength: DEFAULT_CONFIDENCE,
      strategyPerformance: DEFAULT_CONFIDENCE,
      banditConfidence,
      segmentAlignment,
      timelineEventCount,
      dataFreshnessDays,
      outcomeClarity,
      predictionAccuracy,
      attributionConfidence,
      outcomeStability,
      horizonAgreement,
      adverseEventRate,
      rollbackRate,
      minQualityMet: true,
    }
  }

  // 7. benchmarkUpdates: 从 health_metrics 聚合 (按症状类别分组)
  const benchmarkUpdates = buildBenchmarkUpdates(healthByPet)

  // 8. cohortData: 按 species / life_stage / stomach_health 构造
  const cohortData = buildCohortData(petsById, healthByPet, recommendations, outcomes)

  // 9. baselineMetrics
  const baselineMetrics = computeBaselineMetrics(healthByPet, outcomes)

  // 10. 日志：统计 feature_snapshot 真实飞轮字段覆盖率
  const totalRecs = recommendations.length
  const realPct =
    totalRecs > 0 ? Math.round((realFlywheelFieldRecCount / totalRecs) * 100) : 0
  console.log(
    `[flywheel-input-builder] 共读取 ${totalRecs} 条推荐记录，其中 ${realFlywheelFieldRecCount} 条包含真实飞轮字段（占比 ${realPct}%）`
  )

  return {
    recommendations,
    outcomes,
    benchmarkUpdates,
    cohortData,
    baselineMetrics,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractString(
  featureSnap: Record<string, unknown>,
  inputFeat: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const k of keys) {
    const v1 = featureSnap[k]
    if (typeof v1 === "string" && v1.length > 0) return v1
    const v2 = inputFeat[k]
    if (typeof v2 === "string" && v2.length > 0) return v2
  }
  return null
}

function extractNumber(obj: any, keys: string[]): number | null {
  if (!obj || typeof obj !== "object") return null
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v)) return v
  }
  return null
}

function computeOwnerAdherence(feedback: FeedbackRow[]): number {
  if (feedback.length === 0) return 0
  const accepted = feedback.filter(f => ADHERENCE_ACTIONS.has(f.action)).length
  return accepted / feedback.length
}

function compositeHealthScore(m: HealthMetricRow): number | null {
  const parts = [m.appetite_score, m.stool_score, m.activity_score].filter(
    (v): v is number => v != null
  )
  if (parts.length === 0) return null
  return parts.reduce((s, v) => s + v, 0) / parts.length
}

function computeHealthScoreDelta(metrics: HealthMetricRow[]): number {
  if (metrics.length < 2) return 0
  const first = compositeHealthScore(metrics[0])
  const last = compositeHealthScore(metrics[metrics.length - 1])
  if (first == null || last == null) return 0
  return Math.round((last - first) * 100) / 100
}

function computeDataFreshnessDays(events: PetEventRow[], now: number): number {
  if (events.length === 0) return DEFAULT_FRESHNESS_DAYS
  // events 已按 event_time desc 排序，取最新一条
  const latestMs = new Date(events[0].event_time).getTime()
  if (Number.isNaN(latestMs)) return DEFAULT_FRESHNESS_DAYS
  const diffDays = (now - latestMs) / (24 * 60 * 60 * 1000)
  return Math.max(0, Math.round(diffDays))
}

type HealthScoreField = "appetite_score" | "stool_score" | "activity_score"

function buildBenchmarkUpdates(healthByPet: Map<string, HealthMetricRow[]>): BenchmarkUpdate[] {
  // 按 symptom category 分组：stool_score → soft_stool_improvement 等
  const categoryFieldMap: Array<{ category: string; field: HealthScoreField }> = [
    { category: "soft_stool_improvement", field: "stool_score" },
    { category: "appetite_improvement", field: "appetite_score" },
    { category: "energy_level_improvement", field: "activity_score" },
  ]

  const updates: BenchmarkUpdate[] = []
  for (const { category, field } of categoryFieldMap) {
    const improvements: number[] = []
    const daysToImprovement: number[] = []
    for (const metrics of healthByPet.values()) {
      if (metrics.length < 2) continue
      const first = metrics[0][field]
      const last = metrics[metrics.length - 1][field]
      if (first == null || last == null) continue
      const delta = Math.round((last - first) * 100) / 100
      improvements.push(delta)
      if (delta > 0) {
        const daysDiff =
          (new Date(metrics[metrics.length - 1].date).getTime() -
            new Date(metrics[0].date).getTime()) /
          (24 * 60 * 60 * 1000)
        daysToImprovement.push(Math.max(1, Math.round(daysDiff)))
      }
    }
    if (improvements.length > 0) {
      updates.push({ category, improvements, daysToImprovement })
    }
  }
  return updates
}

function buildCohortData(
  petsById: Map<string, PetRow>,
  healthByPet: Map<string, HealthMetricRow[]>,
  recommendations: FlywheelInput["recommendations"],
  outcomes: FlywheelInput["outcomes"]
): FlywheelInput["cohortData"] {
  // 按 species / life_stage / stomach_health 三个维度构造 cohort
  const cohortGroups = new Map<
    string,
    {
      definition: Record<string, unknown>
      petIds: Set<string>
    }
  >()

  const ensureCohort = (key: string, definition: Record<string, unknown>, petId: string) => {
    const group = cohortGroups.get(key) ?? { definition, petIds: new Set<string>() }
    group.petIds.add(petId)
    cohortGroups.set(key, group)
  }

  for (const pet of petsById.values()) {
    if (pet.species) {
      ensureCohort(`species:${pet.species}`, { species: pet.species }, pet.id)
    }
    if (pet.life_stage) {
      ensureCohort(`life_stage:${pet.life_stage}`, { life_stage: pet.life_stage }, pet.id)
    }
    if (pet.stomach_health) {
      ensureCohort(
        `stomach_health:${pet.stomach_health}`,
        { stomach_health: pet.stomach_health },
        pet.id
      )
    }
  }

  // 收集每个 recommendation 的 product score (用 healthScoreDelta 作为代理)
  const recsByPet = new Map<string, FlywheelInput["recommendations"]>()
  for (const rec of recommendations) {
    const list = recsByPet.get(rec.petId) ?? []
    list.push(rec)
    recsByPet.set(rec.petId, list)
  }

  const cohortData: FlywheelInput["cohortData"] = []
  for (const [cohortKey, group] of cohortGroups) {
    const healthScores: number[] = []
    const improvementRates: number[] = []
    const effectivenessScores: number[] = []
    const productScores: Record<string, number> = {}

    for (const petId of group.petIds) {
      const metrics = healthByPet.get(petId) ?? []
      if (metrics.length > 0) {
        const score = compositeHealthScore(metrics[metrics.length - 1])
        if (score != null) healthScores.push(score)
        const delta = computeHealthScoreDelta(metrics)
        improvementRates.push(delta > 0 ? 1 : 0)
      }
      // 用该 pet 的 recommendations 的 healthScoreDelta 作为 effectiveness 代理
      const recs = recsByPet.get(petId) ?? []
      for (const rec of recs) {
        const outcome = outcomes[rec.recommendationId]
        if (!outcome) continue
        effectivenessScores.push(outcome.healthScoreDelta > 0 ? 100 : 0)
        const prev = productScores[rec.productId]
        if (prev == null) {
          productScores[rec.productId] = outcome.healthScoreDelta
        } else {
          productScores[rec.productId] = (prev + outcome.healthScoreDelta) / 2
        }
      }
    }

    cohortData.push({
      cohortKey,
      cohortDefinition: group.definition,
      healthScores,
      improvementRates,
      effectivenessScores,
      productScores,
    })
  }

  return cohortData
}

function computeBaselineMetrics(
  healthByPet: Map<string, HealthMetricRow[]>,
  outcomes: FlywheelInput["outcomes"]
): FlywheelInput["baselineMetrics"] {
  const avgHealthScoreList: number[] = []
  let improvedCount = 0
  let totalWithDelta = 0

  for (const metrics of healthByPet.values()) {
    if (metrics.length === 0) continue
    const score = compositeHealthScore(metrics[metrics.length - 1])
    if (score != null) avgHealthScoreList.push(score)
    const delta = computeHealthScoreDelta(metrics)
    totalWithDelta++
    if (delta > 0) improvedCount++
  }

  const avgHealthScore =
    avgHealthScoreList.length > 0
      ? avgHealthScoreList.reduce((s, v) => s + v, 0) / avgHealthScoreList.length
      : 0.5

  const improvementRate =
    totalWithDelta > 0 ? improvedCount / totalWithDelta : 0.3

  // effectivenessScore: 用 outcomes 中正向 delta 占比作为代理 (0-100)
  const outcomeValues = Object.values(outcomes)
  const effectivenessScore =
    outcomeValues.length > 0
      ? (outcomeValues.filter(o => o.healthScoreDelta > 0).length / outcomeValues.length) * 100
      : 50

  return {
    avgHealthScore: Math.round(avgHealthScore * 100) / 100,
    improvementRate: Math.round(improvementRate * 100) / 100,
    effectivenessScore: Math.round(effectivenessScore * 100) / 100,
  }
}
