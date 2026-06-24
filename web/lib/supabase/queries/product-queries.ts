// =============================================
// Product Queries
// =============================================

// Phase 1.2.2: Migrated to Write Gateway
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"
import type {
  Product,
  ProductCategory,
  ProductIngredient,
  ProductVersion,
  ProductImage,
  ProductMetricsDaily,
  RiskEvent,
} from "@/lib/supabase/types"

// ── Products ──

export async function queryProducts(filters?: { categoryId?: string }) {
  const supabase = await createServerClient()
  let query = supabase
    .from("products")
    .select("*, product_categories(name, slug)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20)

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }

  const { data, error } = await query
  return { data: data as (Product & { product_categories: { name: string; slug: string } | null })[] | null, error }
}

export async function queryProduct(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("products")
    .select("*, product_categories(name, slug)")
    .eq("id", productId)
    .single()
  return { data: data as (Product & { product_categories: { name: string; slug: string } | null }) | null, error }
}

// ── Categories ──

export async function queryCategories() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("display_order")
  return { data: data as ProductCategory[] | null, error }
}

// ── Ingredients ──

export async function queryIngredients(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("product_ingredients")
    .select("*")
    .eq("product_id", productId)
    .order("display_order")
  return { data: data as ProductIngredient[] | null, error }
}

// ── Versions ──

export async function queryVersions(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("product_versions")
    .select("*")
    .eq("product_id", productId)
    .order("effective_date", { ascending: false })
  return { data: data as ProductVersion[] | null, error }
}

// ── Images ──

export async function queryProductImages(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
  return { data: data as ProductImage[] | null, error }
}

// ── Product Tags ──

export async function queryProductTags(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("product_tags")
    .select("*")
    .eq("product_id", productId)
    .order("tag_type")
    .order("tag_key")
  return { data: data as ProductTag[] | null, error }
}

export interface ProductTag {
  id: string
  product_id: string
  tag_type: string
  tag_key: string
  tag_value: string
  confidence: number
  source: string
  created_at: string
}

// ── Metrics ──

export async function queryMetrics(productId: string, days = 90) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("product_metrics_daily")
    .select("*")
    .eq("product_id", productId)
    .order("date", { ascending: false })
    .limit(days)
  return { data: data as ProductMetricsDaily[] | null, error }
}

// ── Risk Events ──

export async function queryRiskEvents(productId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("risk_events")
    .select("*")
    .eq("product_id", productId)
    .order("event_date", { ascending: false })
  return { data: data as RiskEvent[] | null, error }
}

// ── Homepage: Top Cat Food Products ──

export async function queryTopCatFood(limit = 10) {
  const supabase = await createServerClient()
  const db = supabase as any

  const { data: products, error } = await db
    .from("products")
    .select(`
      id, name, brand,
      product_metrics_daily(average_rating, stool_issue_rate, repurchase_rate, review_count),
      product_categories!inner(slug)
    `)
    .eq("is_active", true)
    .eq("applicable_species", "cats")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error || !products) return { data: null, error }

  const processed = products
    .map((p: any) => {
      const metrics = p.product_metrics_daily ?? []
      const latest = metrics[0] ?? {}
      const avgRating = latest.average_rating ? Number(latest.average_rating).toFixed(1) : "4.0"
      const stoolRate = latest.stool_issue_rate ? `${(Number(latest.stool_issue_rate) * 100).toFixed(1)}%` : "5.0%"
      const repurchase = latest.repurchase_rate ? `${(Number(latest.repurchase_rate) * 100).toFixed(0)}%` : "65%"
      const reviewCount = latest.review_count ?? 0
      const palatability = latest.average_rating ? `${Math.min(98, Math.round(Number(latest.average_rating) * 20))}%` : "80%"

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        avgRating,
        stoolRate,
        repurchase,
        palatability,
        reviewCount,
        compositeScore: Number(avgRating) * 20 + Number(repurchase) - Number(stoolRate) * 5,
      }
    })
    .sort((a: any, b: any) => b.compositeScore - a.compositeScore)
    .slice(0, limit)

  return { data: processed, error: null }
}

// ── Bookmarks ──

export async function queryBookmarks(profileId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("product_bookmarks")
    .select("*, products(*)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
  return { data: data as (any & { products: Product })[] | null, error }
}

export async function toggleBookmark(profileId: string, productId: string, userId: string) {
  // Phase 1.2.2: Migrated to Write Gateway
  // First check if bookmark exists (read operation, allowed)
  const supabase = await createServerClient()
  const existing = await supabase
    .from("product_bookmarks")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq("product_id", productId)
    .maybeSingle()

  if (existing.data) {
    // Delete existing bookmark
    const result = await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "DELETE_BOOKMARK",
      actor: userId,
      payload: { profile_id: profileId, product_id: productId },
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("DELETE_BOOKMARK", {
        profile_id: profileId,
        product_id: productId,
      }),
      source: "api",
    })
    return { data: result, error: result.status === "rejected" ? new Error(result.reason) : null }
  }

  // Create new bookmark
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_BOOKMARK",
    actor: userId,
    payload: { profile_id: profileId, product_id: productId },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_BOOKMARK", {
      profile_id: profileId,
      product_id: productId,
    }),
    source: "api",
  })
  return { data: result, error: result.status === "rejected" ? new Error(result.reason) : null }
}
