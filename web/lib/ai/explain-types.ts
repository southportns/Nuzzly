export type AccessLevel = "L1" | "L2" | "L3"

export interface ScoreBreakdown {
  total_score?: number
  model_attribution?: {
    disclaimer?: string
    attribution_type?: string
    factors?: Array<{
      factor: string
      label: string
      raw_score: number
      weight_pct: number
      contribution: number
      max_contribution: number
    }>
  }
  evidence_support?: Array<{
    data_point: string
    observed_value: string
    statistical_note: string
  }>
  negative_signals?: Array<{
    signal: string
    severity: string
    source: string
    actionable: boolean
  }>
  product_confidence?: number
}

export function getAccessLevel(isAuthenticated: boolean, isAdmin: boolean): AccessLevel {
  if (isAdmin) return "L3"
  if (isAuthenticated) return "L2"
  return "L1"
}

export function filterBreakdownForLevel(
  breakdown: ScoreBreakdown,
  level: AccessLevel,
): ScoreBreakdown {
  const filtered: ScoreBreakdown = { ...breakdown }

  if (level === "L1") {
    // L1: only basic info, no detailed breakdown
    filtered.model_attribution = undefined
    filtered.evidence_support = undefined
    filtered.negative_signals = undefined
    return filtered
  }

  if (level === "L2") {
    // L2: top 3 evidence, medium+ negative signals only
    if (filtered.evidence_support && filtered.evidence_support.length > 3) {
      filtered.evidence_support = filtered.evidence_support.slice(0, 3)
    }
    if (filtered.negative_signals) {
      filtered.negative_signals = filtered.negative_signals.filter(
        (ns) => ns.severity === "high" || ns.severity === "medium",
      )
    }
    return filtered
  }

  // L3: full access, no filtering
  return filtered
}
