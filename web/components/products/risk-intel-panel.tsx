"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Clock } from "lucide-react"

interface RiskEvent {
  id: string; title: string; severity: string; event_date: string
  report_count: number; trend: string; resolved: boolean; time_weighted_score: number
}

interface RiskTimelineEntry {
  month: string; monthly_risk_score: number; event_count: number
}

interface ClusterEvent {
  id: string; title: string; severity: string; event_date: string; resolved: boolean
}

interface EventCluster {
  similarity_group: string; cluster_severity: string; event_count: number
  representative_event: string; events: ClusterEvent[]
}

interface RiskData {
  risk_index: number
  stability_grade: string
  long_term_stability: number | null
  recent_stool_rate: number | null
  risk_trend: "rising" | "stable" | "improving"
  recent_spike: boolean
  time_decayed_risk_score: number
  anomalies: { rating_drop_detected?: boolean; rating_change?: number; stool_spike_detected?: boolean; stool_change?: number }
  risk_events: RiskEvent[]
  risk_timeline: RiskTimelineEntry[]
  event_clusters: EventCluster[]
}

interface Props {
  riskIntel: RiskData | null
}

export function RiskIntelPanel({ riskIntel }: Props) {
  const ri = riskIntel
  if (!ri) return null

  function trendIcon(t: string) {
    if (t === "rising") return <TrendingUp className="size-3 text-red-400" />
    if (t === "improving") return <TrendingDown className="size-3 text-primary" />
    return null
  }

  function gradeColor(g: string) {
    return g === "A" ? "text-primary" : g === "B" ? "text-blue-400" : g === "C" ? "text-amber-400" : "text-red-400"
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          风险情报
          {ri.recent_spike && (
            <Badge variant="destructive" className="text-[10px] ml-2">异常激增</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Grade + Risk Index */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">稳定性等级</p>
            <p className={`text-3xl font-bold ${gradeColor(ri.stability_grade)}`}>{ri.stability_grade}</p>
          </div>
          <div className="text-center rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">风险指数</p>
            <p className={`text-3xl font-bold ${ri.risk_index <= 30 ? "text-primary" : ri.risk_index <= 60 ? "text-amber-400" : "text-red-400"}`}>
              {ri.risk_index}
            </p>
          </div>
        </div>

        {/* Trend Indicators */}
        <div className="flex items-center gap-3 mb-4 text-xs">
          <span className="text-muted-foreground">趋势：</span>
          {trendIcon(ri.risk_trend)}
          <span className={ri.risk_trend === "rising" ? "text-red-400" : ri.risk_trend === "improving" ? "text-primary" : "text-muted-foreground"}>
            {ri.risk_trend === "rising" ? "上升中" : ri.risk_trend === "improving" ? "改善中" : "稳定"}
          </span>
          <span className="text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="size-3" />
            时间衰减风险分 {ri.time_decayed_risk_score?.toFixed(2)}
          </span>
        </div>

        {/* Anomalies */}
        {(ri.anomalies?.rating_drop_detected || ri.anomalies?.stool_spike_detected) && (
          <div className="space-y-1.5 mb-4">
            {ri.anomalies.rating_drop_detected && (
              <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/5 rounded-lg px-3 py-2">
                <TrendingDown className="size-4" />
                近14天评分下降 {Math.abs(ri.anomalies.rating_change ?? 0).toFixed(1)} 分
              </div>
            )}
            {ri.anomalies.stool_spike_detected && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/5 rounded-lg px-3 py-2">
                <AlertTriangle className="size-4" />
                软便率异常上升 {((ri.anomalies.stool_change ?? 0) * 100).toFixed(0)}%
              </div>
            )}
          </div>
        )}

        {/* Risk Timeline (last 6 months) */}
        {ri.risk_timeline?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">风险时间轴（时间衰减）</p>
            <div className="flex items-end gap-1 h-12">
              {ri.risk_timeline.map((entry) => {
                const maxH = 48
                const h = Math.max(4, (entry.monthly_risk_score / Math.max(1, ...ri.risk_timeline.map(e => e.monthly_risk_score))) * maxH)
                return (
                  <div key={entry.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full rounded-sm ${entry.monthly_risk_score > 1.5 ? "bg-red-500/50" : entry.monthly_risk_score > 0.7 ? "bg-amber-500/50" : "bg-emerald-500/30"}`}
                      style={{ height: h }} title={`${entry.month}: ${entry.monthly_risk_score}`} />
                    <span className="text-[9px] text-muted-foreground">{entry.month.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Risk Events with time-weighted scores */}
        {ri.risk_events?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground mb-2">风险事件（时间加权）</p>
            {ri.risk_events.slice(0, 3).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Badge variant={e.severity === "critical" || e.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                    {e.severity}
                  </Badge>
                  <span className="truncate max-w-[180px]">{e.title}</span>
                </div>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  ×{e.time_weighted_score?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Event Clusters (deduplicated) */}
        {ri.event_clusters?.length > 0 && (
          <div className="space-y-1.5 mt-3">
            <p className="text-xs text-muted-foreground mb-2">风险事件聚类（去重后）</p>
            {ri.event_clusters.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={c.cluster_severity === "critical" || c.cluster_severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                    {c.cluster_severity}
                  </Badge>
                  <span className="truncate max-w-[180px]">{c.representative_event}</span>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{c.event_count} 条</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
