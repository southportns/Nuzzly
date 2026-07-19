// POST /api/gateway/write — client-side write gateway entry point
// Clients POST write intents here; server-side executes through WriteGateway.
import { getWriteGateway, generateIdempotencyKey, type WriteIntent, type WriteResult } from "@/lib/gateway/write-gateway"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Direct DB write types (bypass EventBus, execute directly)
const DIRECT_WRITE_TYPES: Record<string, (payload: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) => Promise<{ error: string | null; data: Record<string, unknown> | null }>> = {
  CREATE_DIET_LOG: async (payload, admin) => {
    const { data, error } = await admin.from("diet_logs").insert({
      pet_id: payload.pet_id as string,
      food_name: payload.food_name as string,
      food_type: (payload.food_type as string) ?? null,
      logged_date: (payload.logged_date as string) ?? new Date().toISOString(),
      notes: (payload.notes as string) ?? null,
      product_id: (payload.product_id as string) ?? null,
      profile_id: payload.profile_id as string,
    }).select().single()
    return { error: error?.message ?? null, data }
  },

  UPDATE_PET_WEIGHT: async (payload, admin) => {
    const { data, error } = await admin.from("pets").update({ weight_kg: payload.weight_kg as number }).eq("id", payload.id as string).eq("profile_id", payload.profile_id as string).select().single()
    return { error: error?.message ?? null, data }
  },

  CREATE_PET_ALLERGY: async (payload, admin) => {
    const { data, error } = await admin.from("pet_allergies").insert({
      pet_id: payload.pet_id as string,
      allergen: payload.allergen as string,
      severity: (payload.severity as string) ?? null,
      confirmed: (payload.confirmed as boolean) ?? false,
    }).select().single()
    return { error: error?.message ?? null, data }
  },

  DELETE_PET_ALLERGY: async (payload, admin) => {
    const { data, error } = await admin.from("pet_allergies").delete().eq("id", payload.id as string).eq("pet_id", payload.pet_id as string).select().single()
    return { error: error?.message ?? null, data }
  },

  UPSERT_ENVIRONMENT_PROFILE: async (payload, admin) => {
    const { data, error } = await admin.from("environment_profiles").upsert({
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
    }, { onConflict: "pet_id" }).select().single()
    return { error: error?.message ?? null, data }
  },

  // ── 宠物档案(M1.7)────────────────────────────────────────
  CREATE_PET: async (payload, admin) => {
    // profile_id 必须由 gateway 端从 session 注入,不能信任 client payload
    const profileId = payload.profile_id as string
    if (!profileId) return { error: "profile_id missing", data: null }
    const { data, error } = await admin.from("pets").insert({
      profile_id: profileId,
      name: payload.name as string,
      species: (payload.species as "cat" | "dog" | "other") ?? "other",
      breed: (payload.breed as string) ?? null,
      age_years: (payload.age_years as number) ?? 0,
      age_months: (payload.age_months as number) ?? 0,
      gender: (payload.gender as "male" | "female" | "unknown") ?? "unknown",
      weight_kg: (payload.weight_kg as number) ?? null,
      stomach_health: (payload.stomach_health as "normal" | "sensitive" | "very_sensitive") ?? "normal",
      photo_url: (payload.photo_url as string) ?? null,
      is_active: true,
    }).select().single()
    return { error: error?.message ?? null, data }
  },

  UPDATE_PET: async (payload, admin) => {
    const id = payload.id as string
    const profileId = payload.profile_id as string
    if (!id || !profileId) return { error: "id and profile_id required", data: null }
    // 只允许更新这些字段(防止 client 篡改 profile_id/is_active)
    const update: Record<string, unknown> = {}
    const allowed = [
      "name", "species", "breed", "age_years", "age_months",
      "gender", "weight_kg", "stomach_health", "photo_url",
    ] as const
    for (const k of allowed) {
      if (payload[k] !== undefined) update[k] = payload[k]
    }
    if (Object.keys(update).length === 0) return { error: "no fields to update", data: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("pets")
      .update(update)
      .eq("id", id)
      .eq("profile_id", profileId) // 强制 owner 校验
      .select().single()
    return { error: error?.message ?? null, data }
  },

  SOFT_DELETE_PET: async (payload, admin) => {
    const id = payload.id as string
    const profileId = payload.profile_id as string
    if (!id || !profileId) return { error: "id and profile_id required", data: null }
    const { data, error } = await admin
      .from("pets")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("profile_id", profileId)
      .select().single()
    return { error: error?.message ?? null, data }
  },

  // ── 用户档案 ────────────────────────────────────────────
  CREATE_PROFILE: async (payload, admin) => {
    const { data, error } = await admin.from("profiles").insert({
      id: payload.id as string,
      username: payload.username as string,
      display_name: payload.display_name as string,
      user_number: (payload.user_number as number) ?? null,
      avatar_url: (payload.avatar_url as string) ?? null,
      bio: (payload.bio as string) ?? null,
    }).select().single()
    return { error: error?.message ?? null, data }
  },

  SOFT_DELETE_PROFILE: async (payload, admin) => {
    const userId = payload.profile_id as string
    const { data, error } = await admin.from("profiles")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() } as never)
      .eq("id", payload.id as string)
      .eq("id", userId)
      .select().single()
    return { error: error?.message ?? null, data }
  },

  // ── 健康指标 / 提醒 ────────────────────────────────────
  CREATE_HEALTH_METRIC: async (payload, admin) => {
    const { data, error } = await admin.from("health_metrics").insert({
      pet_id: payload.pet_id as string,
      date: payload.date as string,
      appetite_score: (payload.appetite_score as number) ?? null,
      activity_score: (payload.activity_score as number) ?? null,
      stool_score: (payload.stool_score as number) ?? null,
      symptom_severity_score: (payload.symptom_severity_score as number) ?? null,
      weight_delta: (payload.weight_delta as number) ?? null,
      calculation_method: (payload.calculation_method as string) ?? null,
    }).select().single()
    return { error: error?.message ?? null, data }
  },

  CREATE_HEALTH_REMINDER: async (payload, admin) => {
    const { data, error } = await admin.from("health_reminders").insert({
      pet_id: payload.pet_id as string,
      profile_id: payload.profile_id as string,
      reminder_type: payload.reminder_type as string,
      title: payload.title as string,
      description: (payload.description as string) ?? null,
      due_date: payload.due_date as string,
      repeat_interval: (payload.repeat_interval as string) ?? null,
      repeat_end_date: (payload.repeat_end_date as string) ?? null,
    }).select().single()
    return { error: error?.message ?? null, data }
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
      const { error, data } = await directHandler(enrichedPayload, admin)
      if (error) {
        return Response.json({ error }, { status: 400 })
      }
      const result: WriteResult = {
        intentId: intent.id,
        eventId: null,
        jobId: null,
        status: "accepted",
      }
      return Response.json({ success: true, intentId: result.intentId, eventId: result.eventId, status: result.status, data: data ?? null })
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
