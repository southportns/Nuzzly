// =============================================
// Phase 3.7: Timeline vs Review Diff Engine
// Timeline First Architecture — Score & Ranking Comparison
// =============================================
// Purpose: Compare Timeline Score vs Review Score outputs,
//          showing per-product score deltas, ranking changes, and top-k overlap.

import { createClient } from "@/lib/supabase/server"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductScoreDiff {
  productId: string
  productName: string
  timelineScore: number
  reviewScore: number
  scoreDelta: number
  rankByTimeline: number
  rankByReview: number
  rankDelta: number
}

export interface DiffResult {
  requestId: string
  productDiffs: ProductScoreDiff[]
  summary: {
    totalProducts: number
    avgScoreDelta: number
    maxScoreDelta: number
    avgRankDelta: number
    maxRankDelta: number
    jaccardSimilarityTop5: number
    jaccardSimilarityTop10: number
    KendallTauCorrelation: number
  }
  rankingChanges: {
    movedUp: ProductScoreDiff[]
    movedDown: ProductScoreDiff[]
    unchanged: ProductScoreDiff[]
  }
  computedAt: string
}

export interface DiffInput {
  requestId?: string
  timeRangeStart?: string
  timeRangeEnd?: string
  topK?: number
}

// ─── Diff Engine ────────────────────────────────────────────────────────────

/**
 * Compute score and ranking diff between Timeline and Review for a request.
 *
 * Shows:
 * - Per-product score differences
 * - Ranking position changes
 * - Top-k overlap metrics (Jaccard similarity)
 * - Kendall Tau rank correlation
 */
export async function computeDiff(input: DiffInput): Promise<DiffResult> {
  const supabase = await createClient()
  const topK = input.topK ?? 10

  // Fetch trace with product scores
  let trace: Record<string, unknown> | null = null

  if (input.requestId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("decision_trace_log")
      .select("*")
      .eq("request_id", input.requestId)
      .single()
    trace = data
  }

  if (!trace || !trace.product_scores) {
    // Fallback: fetch from replay_snapshots
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: snapshot } = await (supabase as any)
      .from("replay_snapshots")
      .select("*")
      .eq("request_id", input.requestId)
      .single()

    if (!snapshot) {
      throw new Error(`No scoring data found for request_id: ${input.requestId}`)
    }

    return computeDiffFromData(
      input.requestId ?? "unknown",
      snapshot.review_scores ?? [],
      snapshot.timeline_scores ?? [],
      topK
    )
  }

  return computeDiffFromData(
    input.requestId ?? "unknown",
    (trace.review_scores as Array<{ product_id: string; product_name?: string; score: number }>) ?? [],
    (trace.product_scores as Array<{ product_id: string; product_name?: string; score: number }>) ?? [],
    topK
  )
}

// ─── Diff Computation ───────────────────────────────────────────────────────

function computeDiffFromData(
  requestId: string,
  reviewScores: Array<{ product_id: string; product_name?: string; score: number }>,
  timelineScores: Array<{ product_id: string; product_name?: string; score: number }>,
  topK: number
): DiffResult {
  // Build score maps
  const reviewMap = new Map<string, number>()
  const timelineMap = new Map<string, number>()
  const nameMap = new Map<string, string>()

  for (const r of reviewScores) {
    reviewMap.set(r.product_id, r.score)
    if (r.product_name) nameMap.set(r.product_id, r.product_name)
  }
  for (const t of timelineScores) {
    timelineMap.set(t.product_id, t.score)
    if (t.product_name) nameMap.set(t.product_id, t.product_name)
  }

  // Get all product IDs
  const allProductIds = new Set([...reviewMap.keys(), ...timelineMap.keys()])

  // Build ranked lists
  const reviewRanked = [...reviewMap.entries()].sort((a, b) => b[1] - a[1])
  const timelineRanked = [...timelineMap.entries()].sort((a, b) => b[1] - a[1])

  // Build rank maps
  const reviewRankMap = new Map<string, number>()
  const timelineRankMap = new Map<string, number>()
  reviewRanked.forEach(([id], idx) => reviewRankMap.set(id, idx + 1))
  timelineRanked.forEach(([id], idx) => timelineRankMap.set(id, idx + 1))

  // Compute per-product diffs
  const productDiffs: ProductScoreDiff[] = []
  for (const productId of allProductIds) {
    const timelineScore = timelineMap.get(productId) ?? 0
    const reviewScore = reviewMap.get(productId) ?? 0
    const rankByTimeline = timelineRankMap.get(productId) ?? 999
    const rankByReview = reviewRankMap.get(productId) ?? 999

    productDiffs.push({
      productId,
      productName: nameMap.get(productId) ?? productId,
      timelineScore,
      reviewScore,
      scoreDelta: Math.round(timelineScore - reviewScore),
      rankByTimeline,
      rankByReview,
      rankDelta: rankByTimeline - rankByReview,
    })
  }

  // Sort by review rank
  productDiffs.sort((a, b) => a.rankByReview - b.rankByReview)

  // Compute summary metrics
  const scoreDeltas = productDiffs.map((d) => Math.abs(d.scoreDelta))
  const rankDeltas = productDiffs.map((d) => Math.abs(d.rankDelta))

  const top5Timeline = new Set(timelineRanked.slice(0, 5).map(([id]) => id))
  const top5Review = new Set(reviewRanked.slice(0, 5).map(([id]) => id))
  const top10Timeline = new Set(timelineRanked.slice(0, 10).map(([id]) => id))
  const top10Review = new Set(reviewRanked.slice(0, 10).map(([id]) => id))

  const summary = {
    totalProducts: productDiffs.length,
    avgScoreDelta: Math.round(scoreDeltas.reduce((a, b) => a + b, 0) / (scoreDeltas.length || 1)),
    maxScoreDelta: Math.max(...scoreDeltas, 0),
    avgRankDelta: Math.round(rankDeltas.reduce((a, b) => a + b, 0) / (rankDeltas.length || 1)),
    maxRankDelta: Math.max(...rankDeltas, 0),
    jaccardSimilarityTop5: computeJaccard(top5Timeline, top5Review),
    jaccardSimilarityTop10: computeJaccard(top10Timeline, top10Review),
    KendallTauCorrelation: computeKendallTau(reviewRanked, timelineRanked, Math.min(topK, reviewRanked.length)),
  }

  // Categorize ranking changes
  const movedUp = productDiffs.filter((d) => d.rankDelta < 0)
  const movedDown = productDiffs.filter((d) => d.rankDelta > 0)
  const unchanged = productDiffs.filter((d) => d.rankDelta === 0)

  return {
    requestId,
    productDiffs,
    summary,
    rankingChanges: {
      movedUp: movedUp.slice(0, topK),
      movedDown: movedDown.slice(0, topK),
      unchanged: unchanged.slice(0, topK),
    },
    computedAt: new Date().toISOString(),
  }
}

// ─── Statistical Helpers ────────────────────────────────────────────────────

function computeJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

/**
 * Compute Kendall Tau rank correlation coefficient.
 * Measures the ordinal association between two ranked lists.
 */
function computeKendallTau(
  listA: Array<[string, number]>,
  listB: Array<[string, number]>,
  topK: number
): number {
  const commonIds = new Set(listA.slice(0, topK).map(([id]) => id))
  const filteredA = listA.filter(([id]) => commonIds.has(id)).slice(0, topK)
  const filteredB = listB.filter(([id]) => commonIds.has(id)).slice(0, topK)

  if (filteredA.length < 2 || filteredB.length < 2) return 0

  // Build rank maps
  const rankA = new Map<string, number>()
  const rankB = new Map<string, number>()
  filteredA.forEach(([id], idx) => rankA.set(id, idx))
  filteredB.forEach(([id], idx) => rankB.set(id, idx))

  const ids = [...rankA.keys()]
  let concordant = 0
  let discordant = 0

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const aDiff = (rankA.get(ids[i]) ?? 0) - (rankA.get(ids[j]) ?? 0)
      const bDiff = (rankB.get(ids[i]) ?? 0) - (rankB.get(ids[j]) ?? 0)

      if (aDiff * bDiff > 0) concordant++
      else if (aDiff * bDiff < 0) discordant++
    }
  }

  const total = (ids.length * (ids.length - 1)) / 2
  return (concordant - discordant) / total
}
