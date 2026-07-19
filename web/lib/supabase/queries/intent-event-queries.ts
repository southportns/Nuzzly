// =============================================
// Intent event mutations (Server Action)
// Phase 1.2.2 (P1): Migrated to Write Gateway
// =============================================

"use server"

import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"

export async function createIntentEvent(record: {
  profile_id: string
  product_id?: string | null
  event_type: string
  source?: string | null
  metadata?: Record<string, unknown> | null
}, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_INTENT_EVENT",
    actor: userId,
    payload: record as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_INTENT_EVENT", {
      profile_id: record.profile_id,
      product_id: record.product_id,
      event_type: record.event_type,
    }),
    source: "api",
  })

  return { error: result.status === "rejected" ? new Error(result.reason) : null }
}
