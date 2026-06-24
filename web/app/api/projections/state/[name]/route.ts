// =============================================
// Phase 1.2.3: Projection API — State
// GET /api/projections/state/:name — get current projection state
// GET /api/projections/state — get all projection names
// =============================================

import { projectionEngine } from "@/lib/projections/projection-engine"
import { projectionRegistry } from "@/lib/projections/projection-registry"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const projectionName = pathParts[pathParts.length - 1]

    if (projectionName && projectionName !== "state") {
      // Get specific projection state
      const state = await projectionEngine.getState(projectionName)
      return Response.json({ projection: projectionName, state })
    }

    // List all projections
    const names = projectionRegistry.getAllNames()
    return Response.json({ projections: names })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to get state" },
      { status: 500 }
    )
  }
}
