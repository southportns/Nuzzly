"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, BarChart3, ShieldCheck, ThumbsUp, ThumbsDown, Check, TrendingUp, AlertTriangle } from "lucide-react"
import { RecommendationEvidence } from "@/components/ai/recommendation-evidence"
import { useAuth } from "@/hooks/use-auth"
import { filterBreakdownForLevel, getAccessLevel, type ScoreBreakdown } from "@/lib/ai/explain-types"

interface Props {
  recommendation: {
    product: { id: string; name: string; brand: string; price_min: number | null; price_max: number | null; image_url: string | null }
    score: number
    dimensions: { overall_rating: number; stomach_match: number; stool_safety: number; long_term_stability: number; repurchase_rate: number; breed_match: number }
    explanation: string; confidence: number
    // Timeline-enhanced fields (Phase 3.5)
    timeline_score?: number
    review_score?: number
    stability_rate?: number
    soft_stool_risk?: number
    black_chin_risk?: number
    repurchase_rate?: number
  }
  rank: number
  breakdown?: any
}

export function RecommendationCard({ recommendation, rank, breakdown }: Props) {
  const r = recommendation
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<"accept" | "reject" | null>(null)

  async function sendFeedback(action: "accept" | "reject") {
    setFeedback(action)
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: action, product_id: r.product.id }),
    })
  }

  // Access level gating: L1=default, L2=auth, L3=admin
  const isAdmin = false // future: check admin role
  const level = getAccessLevel(!!user, isAdmin)
  const filteredBreakdown = breakdown ? filterBreakdownForLevel(breakdown, level) : null

  const hasEvidence = (filteredBreakdown?.evidence_support?.length ?? 0) > 0

  return (
    <Link href={`/products/${r.product.id}`}>
      <Card
        className="group transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
        onClick={(e) => { if ((e.target as HTMLElement).closest("[data-no-navigate]")) e.preventDefault() }}
      >
        {/* LAYER 1: Always visible */}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              {r.product.image_url ? (
                <img
                  src={r.product.image_url}
                  alt={r.product.name}
                  className="size-14 rounded-xl object-cover bg-muted shrink-0"
                />
              ) : (
                <div className="size-14 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">🐱</div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {rank === 1 && <Badge className="bg-primary/20 text-primary shrink-0">最佳匹配</Badge>}
                  <CardTitle className="text-base truncate">{r.product.name}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{r.product.brand}</p>
                {(r.product.price_min != null || r.product.price_max != null) && (
                  <p className="text-sm font-medium text-primary mt-0.5">
                    {r.product.price_min != null && r.product.price_max != null && r.product.price_min !== r.product.price_max
                      ? `¥${r.product.price_min} - ¥${r.product.price_max}`
                      : `¥${r.product.price_max ?? r.product.price_min}`}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-bold tabular-nums">{r.score.toFixed(0)}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          {/* L1: 1-line reason */}
          <p className="text-xs text-muted-foreground mt-2">
            {hasEvidence
              ? `${filteredBreakdown!.evidence_support![0].data_point} · ${filteredBreakdown!.evidence_support![0].observed_value}`
              : r.explanation}
          </p>
          {/* L1: trust level badge */}
          {filteredBreakdown?.product_confidence != null && (
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck className="size-3 text-primary" />
              <span className="text-[10px] text-muted-foreground">
                基于 {breakdown?.evidence_support?.[0]?.data_point ?? "数据"}，置信度 {filteredBreakdown.product_confidence}%
              </span>
            </div>
          )}
          {/* Timeline-enhanced metrics (Phase 3.5 Shadow Mode) */}
          {r.timeline_score != null && r.timeline_score > 0 && (
            <div className="mt-3 p-2 rounded-lg bg-muted/50 border border-border/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="size-3 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground">纵向评分</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeline</span>
                  <span className="font-semibold tabular-nums">{r.timeline_score.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">评论</span>
                  <span className="font-semibold tabular-nums">{r.review_score?.toFixed(0) ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">稳定率</span>
                  <span className="font-semibold tabular-nums">{r.stability_rate?.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">复购率</span>
                  <span className="font-semibold tabular-nums">{r.repurchase_rate?.toFixed(0)}%</span>
                </div>
                {r.soft_stool_risk != null && r.soft_stool_risk > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="size-2.5 text-amber-500" />
                      软便风险
                    </span>
                    <span className="font-semibold tabular-nums text-amber-600">{r.soft_stool_risk.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        {/* LAYER 2: Expandable (authenticated users only) */}
        <CardContent className="pt-0" data-no-navigate>
          <div className="border-t border-border/40 pt-3">
            {expanded && level !== "L1" && filteredBreakdown && (
              <RecommendationEvidence breakdown={filteredBreakdown} level={level} />
            )}

            <Button
              variant="ghost" size="sm" className="text-xs gap-1 mt-1"
              data-no-navigate
              onClick={() => setExpanded(!expanded)}
            >
              <BarChart3 className="size-3" />
              {expanded ? "收起依据" : level === "L1" ? "登录查看推荐依据" : "查看推荐依据"}
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>

            {/* Feedback actions */}
            {user && (
              <span className="inline-flex gap-1 ml-2" data-no-navigate>
                <Button
                  variant={feedback === "accept" ? "default" : "ghost"}
                  size="sm"
                  className={`text-xs gap-1 h-7 ${feedback === "accept" ? "bg-primary/20 text-primary" : ""}`}
                  disabled={!!feedback}
                  data-no-navigate
                  onClick={() => sendFeedback("accept")}
                >
                  {feedback === "accept" ? <Check className="size-3" /> : <ThumbsUp className="size-3" />}
                  {feedback === "accept" ? "已采纳" : "采纳"}
                </Button>
                <Button
                  variant={feedback === "reject" ? "default" : "ghost"}
                  size="sm"
                  className={`text-xs gap-1 h-7 ${feedback === "reject" ? "bg-red-500/20 text-red-400" : ""}`}
                  disabled={!!feedback}
                  data-no-navigate
                  onClick={() => sendFeedback("reject")}
                >
                  <ThumbsDown className="size-3" />
                </Button>
              </span>
            )}

            {/* L3 indicator (admin mode) */}
            {level === "L3" && expanded && (
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                L3 专家模式 — 完整数据可见
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
