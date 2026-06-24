// =============================================
// Phase 1.2.3: Projection API — Rebuild
// POST /api/projections/rebuild — rebuild all projections
// POST /api/projections/rebuild/:name — rebuild specific projection
// =============================================

import { projectionRebuilder } from "@/lib/projections/projection-rebuilder"

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const projectionName = pathParts[pathParts.length - 1]

    // Check if it's a specific projection or all
    if (projectionName && projectionName !== "rebuild") {
      // Rebuild specific projection
      const result = await projectionRebuilder.rebuild(projectionName)
      return Response.json({ success: true, result })
    }

    // Rebuild all projections
    const results = await projectionRebuilder.rebuildAll()
    return Response.json({ success: true, results })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Rebuild failed" },
      { status: 500 }
    )
  }
}
