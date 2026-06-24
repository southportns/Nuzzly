// =============================================
// Bookmark client-side mutations
// Phase 1.2.2 (P1): Migrated to Write Gateway
// =============================================

import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"

export async function createBookmarkClient(profileId: string, productId: string, userId: string) {
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

  return { error: result.status === "rejected" ? new Error(result.reason) : null }
}

export async function deleteBookmarkClient(profileId: string, productId: string, userId: string) {
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

  return { error: result.status === "rejected" ? new Error(result.reason) : null }
}
