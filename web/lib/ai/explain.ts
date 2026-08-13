// =============================================
// P0 Fix — AI Risk Intelligence Module Stub
// Original implementation was in this file, deleted during repo migration before 2026-06-10.
// Current is a minimal placeholder that returns null.
// To be replaced when P1/P2 phase re-integrates data sources.
// =============================================

export interface RiskData {
  risk_index: number
  stability_grade: string
  long_term_stability: number | null
  recent_stool_rate: number | null
  risk_trend: "rising" | "stable" | "improving"
  recent_spike: boolean
  time_decayed_risk_score: number
  anomalies: {
    rating_drop_detected?: boolean
    rating_change?: number
    stool_spike_detected?: boolean
    stool_change?: number
  }
  risk_events: Array<{
    id: string
    title: string
    severity: string
    event_date: string
    report_count: number
    trend: string
    resolved: boolean
    time_weighted_score: number
  }>
  risk_timeline: Array<{ month: string; monthly_risk_score: number; event_count: number }>
  event_clusters: Array<{
    similarity_group: string
    cluster_severity: string
    event_count: number
    representative_event: string
    events: Array<{ id: string; title: string; severity: string; event_date: string; resolved: boolean }>
  }>
}

export async function getRiskIntelligence(_productId: string): Promise<RiskData | null> {
  // P0 stub: returns null; RiskIntelPanel internally handles null (does not render the card)
  return null
}

export async function getVersionImpact(_productId: string): Promise<null> {
  // P0 stub: Version Impact Analysis feature not yet implemented
  return null
}
