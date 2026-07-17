// Stub: original agents module was removed during repo migration.
// Minimal implementation to satisfy agent-migration.ts imports.

export interface PipelineResult {
  recommendations: Array<{
    product: { id: string; name: string; brand: string; price_max: number | null }
    score: number
    confidence: number
    dimensions: Record<string, number>
    explanation: string
  }>
  warnings: Array<{ product: { id: string; name: string; brand: string }; reason: string; risk_score: number }>
  summary: string
}

export async function runAgentPipeline(_input: {
  petId: string
  userId?: string
  sessionId?: string
  query?: string
  filters?: { category?: string; maxPrice?: number }
}): Promise<PipelineResult> {
  // P0 stub: returns empty result
  return {
    recommendations: [],
    warnings: [],
    summary: "",
  }
}
