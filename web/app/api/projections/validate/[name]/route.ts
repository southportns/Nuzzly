// =============================================
// Phase 1.2.3: Projection API — Validate
// GET /api/projections/validate — validate all projections
// GET /api/projections/validate/:name — validate specific projection
// =============================================

import { projectionValidator } from "@/lib/projections/projection-validator"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const projectionName = pathParts[pathParts.length - 1]

    if (projectionName && projectionName !== "validate") {
      const result = await projectionValidator.validate(projectionName)
      return Response.json({ projection: projectionName, validation: result })
    }

    const results = await projectionValidator.validateAll()
    return Response.json({ validations: results })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    )
  }
}
