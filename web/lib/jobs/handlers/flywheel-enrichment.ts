// =============================================
// Phase 4.1: Flywheel Enrichment Batch Jobs
// 异步补全飞轮 ETL 中无法在请求时同步计算的字段：
//   - attributionConfidence  (estimateConfidence)
//   - outcomeStability       (longitudinal_outcomes 多 horizon 一致性)
//   - horizonAgreement       (longitudinal_outcomes 多 horizon 方差)
//   - outcomeClarity         (computeDelayedRewardProxy.proxyReward)
// 所有 supabase 查询使用 createAdminClient() 以绕过 RLS。
// feature_snapshot 写入采用 JS-side merge，语义等价于
//   feature_snapshot || jsonb_build_object('field', value)
// =============================================

import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  estimateConfidence,
  saveAttribution,
  type OutcomeWindowDays,
} from "@/lib/timeline/outcome-attribution"
import { computeDelayedRewardProxy } from "@/lib/timeline/delayed-reward-proxy"
import type { SegmentKey } from "@/lib/timeline/bandit-policy"

// ─── Constants ──────────────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_FRESHNESS_DAYS = 30
const DEFAULT_OUTCOME_CLARITY = 0.5
const VALID_SEGMENT_KEYS: ReadonlySet<string> = new Set([
  "global",
  "new_user",
  "returning_user",
  "high_intent",
  "low_intent",
])

// ─── Shared Types ───────────────────────────────────────────────────────────

interface TraceLogRow {
  id: string
  pet_id: string
  feature_snapshot: Record<string, unknown> | null
  data_sources: string[] | null
  user_segment: string | null
}

interface LongitudinalOutcomeRow {
  outcome_class: string | null
  health_score_delta: number | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickString(
  featureSnap: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = featureSnap[k]
    if (typeof v === "string" && v.length > 0) return v
  }
  return null
}

function coerceSegment(raw: string | null | undefined): SegmentKey {
  if (raw && VALID_SEGMENT_KEYS.has(raw)) return raw as SegmentKey
  return "global"
}

/**
 * Merge 飞轮字段到 recommendation_trace_log.feature_snapshot。
 * 语义等价于 SQL: feature_snapshot || jsonb_build_object(field, value)
 *
 * 注: feature_snapshot 列类型为 Json，Record<string, unknown> 不能直接赋值，
 * 此处沿用项目既有 (client as any) 模式绕过类型校验（与 outcome-attribution.ts、
 * delayed-reward-proxy.ts 一致）。
 */
async function mergeFeatureSnapshot(
  recommendationId: string,
  featureSnap: Record<string, unknown>,
  patch: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient()
  const merged = { ...featureSnap, ...patch }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("recommendation_trace_log")
    .update({ feature_snapshot: merged })
    .eq("id", recommendationId)
  if (error) {
    throw new Error(
      `[flywheel-enrichment] feature_snapshot update failed for ${recommendationId}: ${error.message}`
    )
  }
}

async function loadTraceLog(
  recommendationId: string,
  jobName: string,
  select: string
): Promise<TraceLogRow> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("recommendation_trace_log")
    .select(select)
    .eq("id", recommendationId)
    .single()
  if (error || !data) {
    throw new Error(
      `[${jobName}] Failed to load trace ${recommendationId}: ${error?.message ?? "no row"}`
    )
  }
  return data as unknown as TraceLogRow
}

// ─── Job 2.1: computeOutcomeAttributionJob ──────────────────────────────────

/**
 * 计算飞轮字段: attributionConfidence
 *
 * 数据来源:
 *   - recommendation_trace_log.feature_snapshot.product_id / segment_key
 *   - pet_events (近 30 天事件数 + 最近一条新鲜度)
 *
 * 公式 (来自 outcome-attribution.ts#estimateConfidence):
 *   countFactor       = min(1, timelineEventCount / 50)
 *   freshnessFactor   = max(0, 1 - dataFreshnessDays / 180)
 *   confidence        = 0.4*countFactor + 0.3*freshnessFactor + 0.3*outcomeClarity
 *
 * 副作用:
 *   - merge attributionConfidence 到 feature_snapshot
 *   - 调用 saveAttribution 写入 pflid.outcome_attribution (已有则跳过)
 */
export async function computeOutcomeAttributionJob(
  recommendationId: string
): Promise<void> {
  const jobName = "computeOutcomeAttributionJob"
  const admin = createAdminClient()

  // 1. 读取 recommendation_trace_log
  const trace = await loadTraceLog(
    recommendationId,
    jobName,
    "pet_id, feature_snapshot, data_sources, user_segment"
  )

  const featureSnap = (trace.feature_snapshot ?? {}) as Record<string, unknown>
  const petId = trace.pet_id
  const productId = pickString(featureSnap, "product_id", "productId")
  const strategyId = pickString(featureSnap, "strategy_id", "strategyId")
  const segmentKey = pickString(featureSnap, "segment_key", "segmentKey") ?? trace.user_segment

  // 2. pet_events 近 30 天事件数 → timelineEventCount
  const thirtyDaysAgoIso = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()
  const { count, error: countErr } = await admin
    .from("pet_events")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId)
    .gte("event_time", thirtyDaysAgoIso)
  if (countErr) {
    throw new Error(`[${jobName}] pet_events count failed: ${countErr.message}`)
  }
  const timelineEventCount = count ?? 0

  // 3. dataFreshnessDays = 最近一条 pet_event 距今天数
  const { data: latestEventRow, error: latestErr } = await admin
    .from("pet_events")
    .select("event_time")
    .eq("pet_id", petId)
    .order("event_time", { ascending: false })
    .limit(1)
    .maybeSingle()

  let dataFreshnessDays = DEFAULT_FRESHNESS_DAYS
  if (!latestErr && latestEventRow?.event_time) {
    const latestMs = new Date(latestEventRow.event_time as string).getTime()
    if (!Number.isNaN(latestMs)) {
      dataFreshnessDays = Math.max(
        0,
        Math.round((Date.now() - latestMs) / (24 * 60 * 60 * 1000))
      )
    }
  }

  // 4. 调用 estimateConfidence 得到 attributionConfidence
  const attributionConfidence = estimateConfidence({
    timelineEventCount,
    dataFreshnessDays,
    outcomeClarity: DEFAULT_OUTCOME_CLARITY,
  })

  // 5. merge attributionConfidence 到 feature_snapshot
  await mergeFeatureSnapshot(recommendationId, featureSnap, { attributionConfidence })

  // 6. 写入 pflid.outcome_attribution (如果该推荐已有归因记录则跳过)
  // 注: pflid.* schema 未在 database.types.ts 中声明，沿用项目 (admin as any) 模式
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: existErr } = await (admin as any)
    .from("pflid.outcome_attribution")
    .select("id")
    .eq("recommendation_id", recommendationId)
    .limit(1)
  if (existErr) {
    console.error(
      `[${jobName}] outcome_attribution existence check failed: ${existErr.message}`
    )
  }
  if (existing && existing.length > 0) {
    // 该推荐已有归因记录，跳过 saveAttribution
    return
  }
  if (!productId) {
    console.warn(
      `[${jobName}] No product_id in feature_snapshot for ${recommendationId}, skipping saveAttribution`
    )
    return
  }

  await saveAttribution({
    recommendationId,
    petId,
    productId,
    outcomeWindowDays: 30 as OutcomeWindowDays,
    outcomeSuccess: attributionConfidence >= DEFAULT_OUTCOME_CLARITY,
    outcomeConfidence: attributionConfidence,
    successProbability: attributionConfidence,
    contribution: {
      timeline: 0.35,
      strategy: 0.3,
      bandit: 0.15,
      segment: 0.1,
      random: 0.1,
    },
    symptomImprovement: {},
    strategyId: strategyId ?? undefined,
    segmentKey: segmentKey ?? undefined,
  })
}

// ─── Job 2.2: computeLongitudinalStabilityJob ───────────────────────────────

/**
 * 计算飞轮字段: outcomeStability + horizonAgreement
 *
 * 数据来源:
 *   - recommendation_trace_log.feature_snapshot.product_id
 *   - pflid.longitudinal_outcomes (按 pet_id + product_id 的所有 horizon 记录)
 *
 * 公式:
 *   outcomeStability:
 *     COUNT(DISTINCT outcome_class) <= 1 → 1.0
 *     COUNT(DISTINCT outcome_class) == 2 → 0.5
 *     COUNT(DISTINCT outcome_class) >= 3 → 0.0
 *   horizonAgreement:
 *     maxAbsDelta = max(abs(health_score_delta))
 *     stddev      = stddev_samp(health_score_delta)
 *     horizonAgreement = max_abs_delta == 0 ? 1.0
 *                       : clamp01(1 - stddev / max_abs_delta)
 */
export async function computeLongitudinalStabilityJob(
  recommendationId: string
): Promise<void> {
  const jobName = "computeLongitudinalStabilityJob"
  const admin = createAdminClient()

  // 1. 读取 trace log
  const trace = await loadTraceLog(
    recommendationId,
    jobName,
    "pet_id, feature_snapshot"
  )
  const featureSnap = (trace.feature_snapshot ?? {}) as Record<string, unknown>
  const petId = trace.pet_id
  const productId = pickString(featureSnap, "product_id", "productId")
  if (!productId) {
    throw new Error(
      `[${jobName}] No product_id in feature_snapshot for ${recommendationId}`
    )
  }

  // 2. 查 longitudinal_outcomes 该 (pet_id, product_id) 所有 horizon 记录
  // 注: pflid.* schema 未在 database.types.ts 中声明，沿用项目 (admin as any) 模式
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: loData, error: loErr } = await (admin as any)
    .from("pflid.longitudinal_outcomes")
    .select("outcome_class, health_score_delta")
    .eq("pet_id", petId)
    .eq("product_id", productId)
  if (loErr) {
    throw new Error(
      `[${jobName}] longitudinal_outcomes query failed: ${loErr.message}`
    )
  }
  const rows = (loData ?? []) as unknown as LongitudinalOutcomeRow[]

  // 3. outcomeStability: 基于 COUNT(DISTINCT outcome_class)
  const distinctClasses = new Set<string>()
  for (const r of rows) {
    if (r.outcome_class) distinctClasses.add(r.outcome_class)
  }
  const classCount = distinctClasses.size
  let outcomeStability: number
  if (classCount <= 1) {
    outcomeStability = 1.0
  } else if (classCount === 2) {
    outcomeStability = 0.5
  } else {
    outcomeStability = 0.0
  }

  // 4. horizonAgreement: 1 - stddev / max_abs_delta
  const deltas = rows
    .map(r => r.health_score_delta)
    .filter((v): v is number => v != null && !Number.isNaN(v))
  let horizonAgreement: number
  if (deltas.length === 0) {
    horizonAgreement = 1.0
  } else {
    const maxAbs = Math.max(...deltas.map(Math.abs))
    if (maxAbs === 0) {
      horizonAgreement = 1.0
    } else {
      const mean = deltas.reduce((s, v) => s + v, 0) / deltas.length
      const variance =
        deltas.reduce((s, v) => s + (v - mean) ** 2, 0) / deltas.length
      const stddev = Math.sqrt(variance)
      horizonAgreement = Math.max(0, Math.min(1, 1 - stddev / maxAbs))
    }
  }

  // 5. merge outcomeStability + horizonAgreement 到 feature_snapshot
  await mergeFeatureSnapshot(recommendationId, featureSnap, {
    outcomeStability,
    horizonAgreement,
  })
}

// ─── Job 2.3: computeDelayedRewardProxyJob ──────────────────────────────────

/**
 * 计算飞轮字段: outcomeClarity
 *
 * 数据来源:
 *   - recommendation_trace_log.feature_snapshot.product_id / strategy_id / segment_key
 *   - delayed_rewards 表 (经 computeDelayedRewardProxy 聚合)
 *
 * 公式:
 *   outcomeClarity = computeDelayedRewardProxy({ armId, segment }).proxyReward
 *
 * armId 映射:
 *   feature_snapshot 中无显式 arm_id 字段，使用 product_id 作为 bandit arm 标识
 *   (与 recommend route 中 topProduct.product.id 一致)
 */
export async function computeDelayedRewardProxyJob(
  recommendationId: string
): Promise<void> {
  const jobName = "computeDelayedRewardProxyJob"

  // 1. 读取 trace log
  const trace = await loadTraceLog(
    recommendationId,
    jobName,
    "feature_snapshot, user_segment"
  )
  const featureSnap = (trace.feature_snapshot ?? {}) as Record<string, unknown>
  const productId = pickString(featureSnap, "product_id", "productId")
  const segmentKeyRaw =
    pickString(featureSnap, "segment_key", "segmentKey") ?? trace.user_segment

  if (!productId) {
    throw new Error(
      `[${jobName}] No product_id in feature_snapshot for ${recommendationId}`
    )
  }

  // 2. 调用 computeDelayedRewardProxy
  //    armId = product_id (bandit arm 标识)
  //    segment = segment_key (经 coerceSegment 保证类型安全)
  const segment = coerceSegment(segmentKeyRaw)
  const result = await computeDelayedRewardProxy({
    armId: productId,
    segment,
  })

  // 3. outcomeClarity = proxyReward
  const outcomeClarity = result.proxyReward

  // 4. merge outcomeClarity 到 feature_snapshot
  await mergeFeatureSnapshot(recommendationId, featureSnap, { outcomeClarity })
}
