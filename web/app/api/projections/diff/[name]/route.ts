// =============================================
// Phase 1.2.3: Projection API — Diff
// GET /api/projections/diff/:name — compare current state with fresh rebuild
// =============================================

import { projectionValidator } from "@/lib/projections/projection-validator"

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const result = await projectionValidator.fullConsistencyCheck(name)
    return Response.json({
      projection: name,
      isIdentical: result.isIdentical,
      rebuildDurationMs: result.rebuildDurationMs,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Diff check failed" },
      { status: 500 }
    )
  }
}
