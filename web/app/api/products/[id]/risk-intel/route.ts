import { getRiskIntelligence, getVersionImpact } from "@/lib/ai/explain"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params

    const [riskIntel, versionImpact] = await Promise.all([
      getRiskIntelligence(productId),
      getVersionImpact(productId),
    ])

    return Response.json({ riskIntel, versionImpact })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Risk intelligence failed" },
      { status: 500 }
    )
  }
}
