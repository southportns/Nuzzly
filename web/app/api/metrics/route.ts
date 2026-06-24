// POST /api/metrics — lightweight metrics recording
// Phase 1.2.2: Migrated to Write Gateway
import { getWriteGateway, generateIdempotencyKey } from "@/lib/gateway/write-gateway"

export async function POST(request: Request) {
  try {
    const { metric_name, metric_type, value, tags, user_id } = await request.json()
    if (!metric_name || value == null) return Response.json({ error: "metric_name and value required" }, { status: 400 })

    const result = await getWriteGateway().submit({
      id: crypto.randomUUID(),
      type: "CREATE_METRICS_EVENT",
      actor: user_id ?? "system",
      payload: {
        metric_name,
        metric_type: metric_type ?? "system",
        value,
        tags: tags ?? {},
      },
      timestamp: Date.now(),
      idempotencyKey: generateIdempotencyKey("CREATE_METRICS_EVENT", {
        metric_name, value, user_id,
      }),
      source: "api",
    })

    if (result.status === "rejected") {
      return Response.json({ error: result.reason }, { status: 400 })
    }

    return Response.json({ success: true, intentId: result.intentId, eventId: result.eventId })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Metrics write failed" }, { status: 500 })
  }
}
