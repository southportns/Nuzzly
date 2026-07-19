// =============================================
// Notification mutations (Server Action)
// Phase 1.2.2 (P1): Migrated to Write Gateway
// =============================================

"use server"

import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"

export async function markNotificationRead(notificationId: string, userId: string) {
  const result = await getWriteGateway().submit({
    id: crypto.randomUUID(),
    type: "MARK_NOTIFICATION_READ",
    actor: userId,
    payload: { id: notificationId, profile_id: userId },
    timestamp: Date.now(),
    idempotencyKey: generateIdempotencyKey("MARK_NOTIFICATION_READ", { id: notificationId }),
    source: "api",
  })

  return { error: result.status === "rejected" ? new Error(result.reason) : null }
}
