// =============================================
// Profile & Pet Queries
// =============================================

// Phase 1.2.2: Migrated to Write Gateway
import { createClient as createServerClient, createServiceRoleClient } from "@/lib/supabase/server"
import { unstable_cache } from "next/cache"
import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"
import type { Profile, Pet, PetAllergy, Notification } from "@/lib/supabase/types"

// ── Profiles ──

export async function queryProfiles() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("profiles").select("*")
  return { data: data as Profile[] | null, error }
}

export async function queryProfile(userId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()
  return { data: data as Profile | null, error }
}

export async function getUser() {
  const supabase = await createServerClient()
  return supabase.auth.getUser()
}

// ── Pets ──

/**
 * 使用 Next.js unstable_cache 替代内存缓存
 * 在 Serverless 环境中更可靠，支持自动失效和标签刷新
 */
export const queryTotalPetCount = unstable_cache(
  async () => {
    const supabase = createServiceRoleClient()
    const { count, error } = await supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    return { count: count ?? 0, error }
  },
  ["total-pet-count"],
  { revalidate: 300, tags: ["pets"] }
)

export async function queryPets(profileId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
  return { data: data as Pet[] | null, error }
}

export async function queryPet(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("pets").select("*").eq("id", petId).single()
  return { data: data as Pet | null, error }
}

// ── Pet Allergies ──

export async function queryAllergies(petId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("pet_allergies")
    .select("*")
    .eq("pet_id", petId)
  return { data: data as PetAllergy[] | null, error }
}

// ── Notifications ──

export async function queryNotifications(profileId: string, limit = 20) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit)
  return { data: data as Notification[] | null, error }
}

// ── Diet Logs ──

export async function queryDietLogs(petId: string, limit = 20) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("diet_logs")
    .select("*, products(name, brand)")
    .eq("pet_id", petId)
    .order("logged_date", { ascending: false })
    .limit(limit)
  return { data, error }
}

// ── Pet Weight Logs (using health_records) ──

interface WeightLogEntry {
  id: string
  weight_kg: number
  logged_date: string
}

export async function queryWeightLogs(petId: string, limit = 30) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("health_records")
    .select("id, weight_kg, record_time")
    .eq("pet_id", petId)
    .eq("record_type", "weight")
    .not("weight_kg", "is", null)
    .order("record_time", { ascending: true })
    .limit(limit)

  const processedData: WeightLogEntry[] | null = data?.map(d => ({
    id: d.id,
    weight_kg: d.weight_kg ?? 0, // 安全访问，避免非空断言
    logged_date: d.record_time?.split('T')[0] || new Date().toISOString().split('T')[0],
  })) ?? null

  return { data: processedData, error }
}

// ── Pending Follow-up Schedules ──

export async function queryPendingSchedules(profileId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("review_followup_schedules")
    .select("*, product_reviews(products(name, brand), pets(name))")
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
  return { data, error }
}

export async function insertWeightLog(petId: string, weightKg: number, notes?: string) {
  // Phase 1.2.2: Migrated to Write Gateway
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_HEALTH_RECORD",
    actor: user.id,
    payload: {
      pet_id: petId,
      profile_id: user.id,
      record_type: "weight",
      weight_kg: weightKg,
      notes: notes ?? null,
      record_time: new Date().toISOString(),
    },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_HEALTH_RECORD", {
      pet_id: petId,
      record_time: new Date().toISOString(),
    }),
    source: "api",
  })

  return { data: result, error: result.status === "rejected" ? new Error(result.reason) : null }
}
