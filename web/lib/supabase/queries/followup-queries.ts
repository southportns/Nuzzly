// =============================================
// Follow-up wizard client-side mutations
// Phase 1.2.2 (P1): Migrated to Write Gateway
// =============================================

import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"

export interface FollowupEntryInput {
  schedule_id: string
  stool_status?: string | null
  coat_status?: string | null
  energy_status?: string | null
  appetite_status?: string | null
  continued_usage?: boolean | null
  repurchase_intent?: string | null
  overall_satisfaction?: number | null
  health_notes?: string | null
}

export async function createFollowupEntry(record: FollowupEntryInput, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "CREATE_FOLLOWUP_ENTRY",
    actor: userId,
    payload: { ...record, profile_id: userId } as Record<string, unknown>,
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("CREATE_FOLLOWUP_ENTRY", {
      schedule_id: record.schedule_id,
    }),
    source: "api",
  })

  return { error: result.status === "rejected" ? new Error(result.reason) : null }
}

export async function completeFollowupSchedule(scheduleId: string, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "UPDATE_FOLLOWUP_SCHEDULE",
    actor: userId,
    payload: {
      id: scheduleId,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("UPDATE_FOLLOWUP_SCHEDULE", { id: scheduleId }),
    source: "api",
  })

  return { error: result.status === "rejected" ? new Error(result.reason) : null }
}
