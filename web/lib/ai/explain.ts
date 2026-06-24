// =============================================
// P0 修复 — AI 风险情报模块桩
// 原实现位于本文件,2026-06-10 前因仓库迁移被删除。
// 当前为最小占位实现,直接返回 null。
// 待 P1 / P2 阶段重新接入数据源后替换。
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
  // P0 stub: 返回 null,RiskIntelPanel 内部已处理 null 情况(不渲染该卡片)
  return null
}
