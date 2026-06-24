// POST /api/gateway/write — client-side write gateway entry point
// Clients POST write intents here; server-side executes through WriteGateway.
import { getWriteGateway, generateIdempotencyKey, type WriteIntent, type WriteResult } from "@/lib/gateway/write-gateway"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Direct DB write types (bypass EventBus, execute directly)
const DIRECT_WRITE_TYPES: Record<string, (payload: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) => Promise<{ error: string | null }>> = {
  CREATE_DIET_LOG: async (payload, admin) => {
    const { error } = await admin.from("diet_logs").insert({
      pet_id: payload.pet_id as string,
      food_name: payload.food_name as string,
      food_type: (payload.food_type as string) ?? null,
      logged_date: (payload.logged_date as string) ?? new Date().toISOString(),
      notes: (payload.notes as string) ?? null,
      product_id: (payload.product_id as string) ?? null,
      profile_id: payload.profile_id as string,
    })
    return { error: error?.message ?? null }
  },

  UPDATE_PET_WEIGHT: async (payload, admin) => {
    const { error } = await admin.from("pets").update({ weight_kg: payload.weight_kg as number }).eq("id", payload.id as string)
    return { error: error?.message ?? null }
  },

  CREATE_PET_ALLERGY: async (payload, admin) => {
    const { error } = await admin.from("pet_allergies").insert({
      pet_id: payload.pet_id as string,
      allergen: payload.allergen as string,
      severity: (payload.severity as string) ?? null,
      confirmed: (payload.confirmed as boolean) ?? false,
    })
    return { error: error?.message ?? null }
  },

  DELETE_PET_ALLERGY: async (payload, admin) => {
    const { error } = await admin.from("pet_allergies").delete().eq("id", payload.id as string)
    return { error: error?.message ?? null }
  },

  UPSERT_ENVIRONMENT_PROFILE: async (payload, admin) => {
    const { error } = await admin.from("environment_profiles").upsert({
      pet_id: payload.pet_id as string,
      profile_id: payload.profile_id as string,
      region: (payload.region as string) ?? null,
      city: (payload.city as string) ?? null,
      district: (payload.district as string) ?? null,
      climate_type: (payload.climate_type as "tropical" | "subtropical" | "temperate" | "continental" | "arid" | "cold") ?? null,
      indoor_outdoor: (payload.indoor_outdoor as string) ?? null,
      living_space: (payload.living_space as string) ?? null,
      has_children: (payload.has_children as boolean) ?? null,
      multi_pet_household: (payload.multi_pet_household as boolean) ?? null,
      pet_count: (payload.pet_count as number) ?? null,
      activity_level: (payload.activity_level as "low" | "medium" | "high" | "very_low" | "very_high") ?? null,
      water_source: (payload.water_source as string) ?? null,
    }, { onConflict: "pet_id" })
    return { error: error?.message ?? null }
  },

  // ── 宠物档案(M1.7)────────────────────────────────────────
  CREATE_PET: async (payload, admin) => {
    // profile_id 必须由 gateway 端从 session 注入,不能信任 client payload
    const profileId = payload.profile_id as string
    if (!profileId) return { error: "profile_id missing" }
    const { error } = await admin.from("pets").insert({
      profile_id: profileId,
      name: payload.name as string,
      species: payload.species as string,
      breed: (payload.breed as string) ?? null,
      age_years: (payload.age_years as number) ?? 0,
      age_months: (payload.age_months as number) ?? 0,
      gender: (payload.gender as string) ?? "unknown",
      weight_kg: (payload.weight_kg as number) ?? null,
      stomach_health: (payload.stomach_health as string) ?? "normal",
      photo_url: (payload.photo_url as string) ?? null,
      is_active: true,
    })
    return { error: error?.message ?? null }
  },

  UPDATE_PET: async (payload, admin) => {
    const id = payload.id as string
    const profileId = payload.profile_id as string
    if (!id || !profileId) return { error: "id and profile_id required" }
    // 只允许更新这些字段(防止 client 篡改 profile_id/is_active)
    const update: Record<string, unknown> = {}
    const allowed = [
      "name", "species", "breed", "age_years", "age_months",
      "gender", "weight_kg", "stomach_health", "photo_url",
    ] as const
    for (const k of allowed) {
      if (payload[k] !== undefined) update[k] = payload[k]
    }
    if (Object.keys(update).length === 0) return { error: "no fields to update" }
    const { error } = await admin
      .from("pets")
      .update(update)
      .eq("id", id)
      .eq("profile_id", profileId) // 强制 owner 校验
    return { error: error?.message ?? null }
  },

  SOFT_DELETE_PET: async (payload, admin) => {
    const id = payload.id as string
    const profileId = payload.profile_id as string
    if (!id || !profileId) return { error: "id and profile_id required" }
    const { error } = await admin
      .from("pets")
      .update({ is_active: false })
      .eq("id", id)
      .eq("profile_id", profileId)
    return { error: error?.message ?? null }
  },
}

export async function POST(request: Request) {
  try {
    const { type, payload, metadata } = await request.json()

    if (!type || !payload) {
      return Response.json({ error: "type and payload required" }, { status: 400 })
    }

    // Get authenticated user from session cookie or Bearer token
    const supabase = await createClient()
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const bearer = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null

    let user: { id: string } | null = null
    let authError: { message: string } | null = null
    if (bearer) {
      const r = await supabase.auth.getUser(bearer)
      user = r.data?.user ?? null
      authError = r.error ?? null
    } else {
      const r = await supabase.auth.getUser()
      user = r.data?.user ?? null
      authError = r.error ?? null
    }

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const intent: WriteIntent = {
      id: crypto.randomUUID(),
      type,
      actor: user.id,
      payload,
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey(type, payload),
      source: "api",
      metadata,
    }

    // 服务端注入身份上下文,客户端不可覆盖(防越权)
    const enrichedPayload: Record<string, unknown> = {
      ...payload,
      profile_id: user.id,
    }

    // For direct-write types, bypass EventBus and execute DB directly
    const directHandler = DIRECT_WRITE_TYPES[type]
    if (directHandler) {
      const admin = createAdminClient()
      const { error } = await directHandler(enrichedPayload, admin)
      if (error) {
        return Response.json({ error }, { status: 400 })
      }
      const result: WriteResult = {
        intentId: intent.id,
        eventId: null,
        jobId: null,
        status: "accepted",
      }
      return Response.json({ success: true, intentId: result.intentId, eventId: result.eventId, status: result.status })
    }

    // For domain event types, go through WriteGateway + EventBus
    const result = await getWriteGateway().submit(intent)

    if (result.status === "rejected") {
      return Response.json({ error: result.reason }, { status: 400 })
    }

    return Response.json({ success: true, intentId: result.intentId, eventId: result.eventId, status: result.status })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gateway write failed" }, { status: 500 })
  }
}
