// =============================================
// GET /api/admin/outcome-intelligence
// Outcome Intelligence Dashboard API
// Returns: stability rank, risk rank, repurchase rank, timeline growth, lifecycle curves
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // TODO: Add admin role check when RBAC is implemented
  // For now, require authenticated user
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") ?? "20")

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    // 1. Top Stable Foods (by day90_stability_rate)
    const { data: stableFoods } = await db
      .from("timeline_metrics_daily")
      .select("product_id, day90_stability_rate, day30_stability_rate, day180_stability_rate, timeline_count, stat_date")
      .order("day90_stability_rate", { ascending: false })
      .limit(limit)

    // 2. Highest Soft Stool Risk
    const { data: softStoolRisk } = await db
      .from("timeline_metrics_daily")
      .select("product_id, soft_stool_rate, timeline_count, stat_date")
      .order("soft_stool_rate", { ascending: false })
      .limit(limit)

    // 3. Highest Black Chin Risk
    const { data: blackChinRisk } = await db
      .from("timeline_metrics_daily")
      .select("product_id, black_chin_rate, timeline_count, stat_date")
      .order("black_chin_rate", { ascending: false })
      .limit(limit)

    // 4. Highest Repurchase Foods
    const { data: repurchaseRank } = await db
      .from("timeline_metrics_daily")
      .select("product_id, repurchase_rate, timeline_count, stat_date")
      .order("repurchase_rate", { ascending: false })
      .limit(limit)

    // 5. Timeline Growth (aggregate counts over time)
    const { data: timelineGrowth } = await db
      .from("review_timeline_groups")
      .select("first_review_date, review_count")
      .order("first_review_date", { ascending: true })

    const { data: eventGrowth } = await db
      .from("review_timeline_events")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(10000)

    // 6. Product Lifecycle (decay curve sample)
    const { data: lifecycleSample } = await db
      .from("timeline_metrics_daily")
      .select("product_id, day30_stability_rate, day90_stability_rate, day180_stability_rate, timeline_count")
      .order("timeline_count", { ascending: false })
      .limit(50)

    // Enrich with product names
    const productIds = new Set<string>()
    ;[stableFoods, softStoolRisk, blackChinRisk, repurchaseRank, lifecycleSample].forEach((arr: Array<Record<string, unknown>> | null) => {
      arr?.forEach((item: Record<string, unknown>) => {
        if (item.product_id) productIds.add(item.product_id as string)
      })
    })

    const { data: products } = productIds.size > 0
      ? await db.from("products").select("id, name, brand").in("id", Array.from(productIds))
      : { data: null }

    const productMap = new Map<string, { name: string; brand: string }>()
    products?.forEach((p: Record<string, unknown>) => {
      productMap.set(p.id as string, { name: p.name as string, brand: p.brand as string })
    })

    const enrich = <T extends { product_id: string }>(items: T[] | null) =>
      (items ?? []).map((item) => ({
        ...item,
        product_name: productMap.get(item.product_id)?.name ?? "Unknown",
        brand: productMap.get(item.product_id)?.brand ?? "",
      }))

    return NextResponse.json({
      success: true,
      data: {
        stable_foods: enrich(stableFoods as Array<{ product_id: string }> | null),
        soft_stool_risk: enrich(softStoolRisk as Array<{ product_id: string }> | null),
        black_chin_risk: enrich(blackChinRisk as Array<{ product_id: string }> | null),
        repurchase_rank: enrich(repurchaseRank as Array<{ product_id: string }> | null),
        timeline_growth: {
          groups_over_time: timelineGrowth ?? [],
          events_count: eventGrowth?.length ?? 0,
        },
        lifecycle_sample: enrich(lifecycleSample as Array<{ product_id: string }> | null),
      },
    })
  } catch (error) {
    console.error("[outcome-intelligence] error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
