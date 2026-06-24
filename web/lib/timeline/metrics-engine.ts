// =============================================
// Timeline Metrics Engine — TypeScript Service Layer
// Source of Truth: pflid.review_timeline_groups + pflid.review_timeline_events
// =============================================

import { createClient } from "@/lib/supabase/server"

export interface TimelineMetricsDaily {
  id: string
  product_id: string
  stat_date: string
  timeline_count: number
  day30_stability_rate: number
  day90_stability_rate: number
  day180_stability_rate: number
  soft_stool_rate: number
  vomiting_rate: number
  black_chin_rate: number
  repurchase_rate: number
  trust_weighted_score: number
  created_at: string
}

export interface TimelineMetricsResult {
  product_id: string
  stat_date: string
  timeline_count: number
  day30_stability_rate: number
  day90_stability_rate: number
  day180_stability_rate: number
  soft_stool_rate: number
  vomiting_rate: number
  black_chin_rate: number
  repurchase_rate: number
  trust_weighted_score: number
}

// Generate metrics for a single product on a specific date
export async function generateTimelineMetrics(
  productId: string,
  statDate?: string
): Promise<TimelineMetricsResult | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.generate_timeline_metrics", {
    p_product_id: productId,
    p_stat_date: statDate ?? null,
  })
  if (error || !data) return null
  return data as TimelineMetricsResult
}

// Get latest metrics for a product
export async function getLatestTimelineMetrics(
  productId: string
): Promise<TimelineMetricsDaily | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("timeline_metrics_daily")
    .select("*")
    .eq("product_id", productId)
    .order("stat_date", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as TimelineMetricsDaily
}

// Get metrics time series for a product
export async function getTimelineMetricsSeries(
  productId: string,
  days = 30
): Promise<TimelineMetricsDaily[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("timeline_metrics_daily")
    .select("*")
    .eq("product_id", productId)
    .order("stat_date", { ascending: false })
    .limit(days)

  if (error) return []
  return (data as TimelineMetricsDaily[]) ?? []
}

// Backfill metrics for all products over last N days
export async function backfillTimelineMetrics(
  daysBack = 30
): Promise<number> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.backfill_timeline_metrics", {
    p_days_back: daysBack,
  })
  if (error) return 0
  return (data as number) ?? 0
}

// Batch generate metrics for multiple products (today)
export async function updateTimelineMetricsToday(
  productIds: string[]
): Promise<TimelineMetricsResult[]> {
  const results: TimelineMetricsResult[] = []
  for (const id of productIds) {
    const result = await generateTimelineMetrics(id)
    if (result) results.push(result)
  }
  return results
}
