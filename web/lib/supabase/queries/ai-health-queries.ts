// =============================================
// AI Health Agent Query Functions
// =============================================

// Phase 1.2.2: Migrated to Write Gateway
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"

// ── AI Health Reports ──

export async function queryAIHealthReport(petId: string, date?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from("ai_health_reports")
    .select("*")
    .eq("pet_id", petId)

  if (date) {
    query = query.eq("report_date", date)
  } else {
    query = query.order("report_date", { ascending: false }).limit(1)
  }

  const { data, error } = await query.maybeSingle()
  return { data, error }
}

export async function queryAIHealthReports(petId: string, limit = 10) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("ai_health_reports")
    .select("*")
    .eq("pet_id", petId)
    .order("report_date", { ascending: false })
    .limit(limit)
  return { data, error }
}

// ── Health Chat Sessions ──

export async function queryHealthChatHistory(petId: string, limit = 20) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("health_chat_sessions")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(limit)
  return { data, error }
}

// ── Health Memory ──

export async function queryHealthMemory(petId: string, activeOnly = true) {
  const supabase = await createServerClient()
  let query = supabase
    .from("health_memory")
    .select("*")
    .eq("pet_id", petId)
    .order("last_observed", { ascending: false })

  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query
  return { data, error }
}

export async function deactivateHealthMemory(memoryId: string, userId: string) {
  // Phase 1.2.2: Migrated to Write Gateway
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "DEACTIVATE_HEALTH_MEMORY",
    actor: userId,
    payload: { memory_id: memoryId },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("DEACTIVATE_HEALTH_MEMORY", {
      memory_id: memoryId,
    }),
    source: "api",
  })
  return { data: result, error: result.status === "rejected" ? new Error(result.reason) : null }
}
