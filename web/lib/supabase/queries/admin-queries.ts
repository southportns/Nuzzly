// =============================================
// Admin Queries — server-side, RLS-aware
// Service role is used for cross-profile reads; client queries
// only work for admin users because of the is_admin() policies.
// =============================================

// Phase 1.2.2: Migrated to Write Gateway
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"
import { validateAdminFilter, sanitizeSearchString } from "@/lib/validation"
import { tableOperation } from "@/lib/error-handling"
import type { Profile } from "@/lib/supabase/types"

// ── Authorization helper ──

export async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null as Profile | null, isAdmin: false }

  // profiles_select_auth allows reading any profile row, so we can self-check
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return {
    user,
    profile: profile as Profile | null,
    isAdmin: Boolean((profile as { is_admin?: boolean } | null)?.is_admin),
  }
}

// ── Stats ──

export async function getAdminStats() {
  const admin = createAdminClient()

  const [
    { count: userCount },
    { count: petCount },
    { count: productCount },
    { count: reviewCount },
    { count: reviewLast7d },
    { count: flaggedCount },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("pets").select("*", { count: "exact", head: true }),
    admin.from("products").select("*", { count: "exact", head: true }),
    admin.from("product_reviews").select("*", { count: "exact", head: true }),
    admin
      .from("product_reviews")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_flagged", true),
  ])

  return {
    userCount: userCount ?? 0,
    petCount: petCount ?? 0,
    productCount: productCount ?? 0,
    reviewCount: reviewCount ?? 0,
    reviewLast7d: reviewLast7d ?? 0,
    flaggedCount: flaggedCount ?? 0,
  }
}

// ── Users ──

export async function listUsers(opts: { search?: string; flagged?: boolean; limit?: number } = {}) {
  const admin = createAdminClient()

  // Validate and sanitize input
  const validation = validateAdminFilter({
    search: opts.search,
    limit: opts.limit,
    flagged: opts.flagged,
  })

  if (!validation.isValid) {
    return { data: null, error: new Error(validation.errors[0]?.message ?? "Invalid parameters") }
  }

  const { search, limit, flagged } = validation.data!

  let q = admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, trust_score, review_count, is_flagged, flag_reason, is_admin, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  // Use sanitized search string
  if (search) {
    q = q.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
  }
  if (flagged) {
    q = q.eq("is_flagged", true)
  }

  return await q
}

// ── Products ──

export async function listProductsForAdmin(opts: { search?: string; limit?: number } = {}) {
  const admin = createAdminClient()

  const validation = validateAdminFilter({
    search: opts.search,
    limit: opts.limit,
  })

  if (!validation.isValid) {
    return { data: null, error: new Error(validation.errors[0]?.message ?? "Invalid parameters") }
  }

  const { search, limit } = validation.data!

  let q = admin
    .from("products")
    .select("id, name, brand, created_at, product_categories(name)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (search) {
    q = q.ilike("name", `%${search}%`)
  }

  return await q
}

// ── Reviews ──

export async function listReviewsForAdmin(opts: { limit?: number; minRating?: number; maxRating?: number } = {}) {
  const admin = createAdminClient()

  // Validate limit
  const limit = typeof opts.limit === "number" && opts.limit > 0 && opts.limit <= 1000 ? opts.limit : 100

  // Validate ratings
  const minRating =
    typeof opts.minRating === "number" && opts.minRating >= 1 && opts.minRating <= 5 ? opts.minRating : undefined
  const maxRating =
    typeof opts.maxRating === "number" && opts.maxRating >= 1 && opts.maxRating <= 5 ? opts.maxRating : undefined

  let q = admin
    .from("product_reviews")
    .select(
      "id, overall_rating, usage_duration, review_text, created_at, product_id, profiles(username, display_name, is_flagged), products(name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (minRating !== undefined) q = q.gte("overall_rating", minRating)
  if (maxRating !== undefined) q = q.lte("overall_rating", maxRating)

  return await q
}

// ── Mutations (admin-only; RLS allows) ──

export async function setUserFlag(userId: string, flagged: boolean, reason?: string, adminId: string = "system") {
  // Phase 1.2.2: Migrated to Write Gateway
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: flagged ? "FLAG_USER" : "UNFLAG_USER",
    actor: adminId,
    payload: {
      user_id: userId,
      reason: flagged ? reason ?? null : null,
    },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey(flagged ? "FLAG_USER" : "UNFLAG_USER", {
      user_id: userId,
    }),
    source: "admin",
  })

  return { data: result, error: result.status === "rejected" ? new Error(result.reason) : null }
}

export async function setUserAdmin(userId: string, isAdmin: boolean, adminId: string = "system") {
  // Phase 1.2.2: Migrated to Write Gateway
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: isAdmin ? "GRANT_ADMIN" : "REVOKE_ADMIN",
    actor: adminId,
    payload: {
      user_id: userId,
    },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey(isAdmin ? "GRANT_ADMIN" : "REVOKE_ADMIN", {
      user_id: userId,
    }),
    source: "admin",
  })

  return { data: result, error: result.status === "rejected" ? new Error(result.reason) : null }
}
