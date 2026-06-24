// POST /api/feedback — closed-loop user feedback recording
// Phase 1.2.2: Migrated to Write Gateway
import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"

export async function POST(request: Request) {
  try {
    const { event_type, product_id, source, user_id } = await request.json()
    if (!event_type) return Response.json({ error: "event_type required" }, { status: 400 })
    if (!user_id) return Response.json({ error: "user_id required" }, { status: 400 })

    // Submit feedback through Write Gateway
    const result = await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "CREATE_FEEDBACK",
      actor: user_id,
      payload: {
        event_type,
        product_id: product_id ?? null,
        source: source ?? "recommendation",
      },
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("CREATE_FEEDBACK", {
        user_id, event_type, product_id,
      }),
      source: "api",
    })

    if (result.status === "rejected") {
      return Response.json({ error: result.reason }, { status: 400 })
    }

    return Response.json({ success: true, intentId: result.intentId, eventId: result.eventId })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Feedback failed" }, { status: 500 })
  }
}
