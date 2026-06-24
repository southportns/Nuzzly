"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, BarChart3, Database, Info, ShieldCheck } from "lucide-react"
import type { AccessLevel } from "@/lib/ai/explain-types"

interface Props {
  breakdown: {
    total_score?: number
    model_attribution?: {
      disclaimer?: string
      attribution_type?: string
      factors?: Array<{ factor: string; label: string; raw_score: number; weight_pct: number; contribution: number; max_contribution: number }>
    }
    evidence_support?: Array<{ data_point: string; observed_value: string; statistical_note: string }>
    negative_signals?: Array<{ signal: string; severity: string; source: string; actionable: boolean }>
    product_confidence?: number
  }
  level: AccessLevel
}

const severityColors: Record<string, string> = {
  high: "border-red-500/20 bg-red-500/5",
  medium: "border-amber-500/20 bg-amber-500/5",
  low: "border-blue-500/20 bg-blue-500/5",
}

export function RecommendationEvidence({ breakdown, level }: Props) {
  const ma = breakdown.model_attribution

  return (
    <div className="space-y-4 mt-3">
      {/* ── Section A: Model Attribution (L2+: limited factors) ── */}
      {ma?.factors && ma.factors.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">统计权重分解</span>
            {ma.attribution_type === "statistical_only" && (
              <Badge variant="outline" className="text-[10px] ml-1">仅统计</Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60 mb-2 italic">
            {ma.disclaimer}
          </p>
          <div className="space-y-2">
            {ma.factors.map((f) => (
              <div key={f.factor} className="flex items-center gap-2">
                <span className="text-xs w-14 shrink-0">{f.factor}</span>
                <Progress value={(f.contribution / f.max_contribution) * 100} className="h-1.5 flex-1" />
                <span className="text-xs tabular-nums w-14 text-right text-muted-foreground">
                  +{f.contribution.toFixed(0)}<span className="text-[10px] ml-0.5">({f.weight_pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section B: Evidence (L2: filtered to top 3) ── */}
      {(breakdown.evidence_support?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Database className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">数据支持</span>
            {level === "L2" && <span className="text-[10px] text-muted-foreground/50 ml-auto">已过滤</span>}
          </div>
          <div className="space-y-1.5">
            {breakdown.evidence_support!.map((ep, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/30 p-2 text-xs">
                <Info className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">{ep.data_point}</span>
                  <span className="text-muted-foreground"> — {ep.observed_value}</span>
                  <p className="text-[10px] text-muted-foreground/60">{ep.statistical_note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section C: Negative Signals (L2: medium+ only) ── */}
      {(breakdown.negative_signals?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="size-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">风险信号</span>
            {level === "L2" && <span className="text-[10px] text-muted-foreground/50 ml-auto">已过滤</span>}
          </div>
          <div className="space-y-1.5">
            {breakdown.negative_signals!.map((ns, i) => {
              const colors = severityColors[ns.severity] ?? severityColors.low
              return (
                <div key={i} className={`rounded-lg border p-2 text-xs ${colors}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {ns.severity === "high" ? "高风险" : ns.severity === "medium" ? "中风险" : "低风险"}
                    </Badge>
                    {ns.actionable && <Badge variant="secondary" className="text-[10px]">可操作</Badge>}
                  </div>
                  <p className="text-muted-foreground">{ns.signal}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">来源：{ns.source}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confidence */}
      {breakdown.product_confidence != null && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3 text-primary" />数据置信度
          </span>
          <span className="tabular-nums font-medium">{breakdown.product_confidence}%</span>
        </div>
      )}
    </div>
  )
}
