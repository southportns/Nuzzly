// =============================================
// Shadow Scoring System — TypeScript Service Layer
// Phase 3.5: Dual Scoring (Review + Timeline) with Delta Analysis
// =============================================

import { createClient } from "@/lib/supabase/server"

export interface ScoreComparison {
  id: string
  product_id: string
  review_score: number
  timeline_score: number
  score_delta: number
  delta_percent: number
  calculated_at: string
  created_at: string
}

export interface ScoreComparisonResult {
  product_id: string
  review_score: number
  timeline_score: number
  score_delta: number
  delta_percent: number
  timeline_count: number
  day90_stability: number
  soft_stool_rate: number
  repurchase_rate: number
  calculated_at: string
}

export interface ScoreComparisonReport {
  total_compared: number
  avg_delta: number
  largest_delta_positive: ScoreComparisonResult[]
  largest_delta_negative: ScoreComparisonResult[]
  review_inflated: Array<ScoreComparisonResult & { warning: string }>
  timeline_underrated: Array<ScoreComparisonResult & { opportunity: string }>
  generated_at: string
}

// Calculate score comparison for a single product
export async function calculateScoreComparison(
  productId: string
): Promise<ScoreComparisonResult | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.calculate_score_comparison", {
    p_product_id: productId,
  })
  if (error || !data) return null
  return data as ScoreComparisonResult
}

// Backfill score comparison for all products
export async function backfillScoreComparison(): Promise<number> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.backfill_score_comparison")
  if (error) return 0
  return (data as number) ?? 0
}

// Get score comparison report
export async function getScoreComparisonReport(
  limit = 20
): Promise<ScoreComparisonReport | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.get_score_comparison_report", {
    p_limit: limit,
  })
  if (error || !data) return null
  return data as ScoreComparisonReport
}

// Get latest comparison for a product
export async function getLatestScoreComparison(
  productId: string
): Promise<ScoreComparison | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("product_score_comparison")
    .select("*")
    .eq("product_id", productId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as ScoreComparison
}

// Get top products by score delta
export async function getTopDeltaProducts(
  limit = 10,
  direction: "positive" | "negative" = "positive"
): Promise<ScoreComparison[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("product_score_comparison")
    .select("*")
    .order("score_delta", { ascending: direction === "negative" })
    .limit(limit)

  if (error) return []
  return (data as ScoreComparison[]) ?? []
}

// Get products where review score is inflated vs timeline
export async function getInflatedReviewProducts(
  threshold = 10
): Promise<ScoreComparison[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("product_score_comparison")
    .select("*")
    .lt("score_delta", -threshold)
    .order("score_delta", { ascending: true })
    .limit(20)

  if (error) return []
  return (data as ScoreComparison[]) ?? []
}

// Get underrated products (timeline shows better outcomes)
export async function getUnderratedProducts(
  threshold = 10
): Promise<ScoreComparison[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("product_score_comparison")
    .select("*")
    .gt("score_delta", threshold)
    .order("score_delta", { ascending: false })
    .limit(20)

  if (error) return []
  return (data as ScoreComparison[]) ?? []
}
