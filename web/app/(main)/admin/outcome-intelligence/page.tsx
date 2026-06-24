"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, AlertTriangle, Shield, RefreshCw, BarChart3 } from "lucide-react"

interface TimelineMetrics {
  product_id: string
  product_name: string
  brand: string
  day30_stability_rate?: number
  day90_stability_rate?: number
  day180_stability_rate?: number
  soft_stool_rate?: number
  black_chin_rate?: number
  repurchase_rate?: number
  timeline_count?: number
  stat_date?: string
}

interface DashboardData {
  stable_foods: TimelineMetrics[]
  soft_stool_risk: TimelineMetrics[]
  black_chin_risk: TimelineMetrics[]
  repurchase_rank: TimelineMetrics[]
  timeline_growth: {
    groups_over_time: Array<{ first_review_date: string; review_count: number }>
    events_count: number
  }
  lifecycle_sample: TimelineMetrics[]
}

export default function OutcomeIntelligencePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/outcome-intelligence")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data)
          setError(null)
        } else {
          setError(res.error ?? "加载失败")
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "网络错误")
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] p-6">
        <div className="mx-auto max-w-7xl">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle>加载失败</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] p-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardHeader>
              <CardTitle>暂无数据</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Outcome Intelligence</h1>
            <p className="text-sm text-[#86868b] mt-1">
              Timeline First Architecture — 基于纵向数据的智能分析
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Shadow Mode Active
          </Badge>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<TrendingUp className="size-4 text-emerald-600" />}
            label="Timeline Groups"
            value={data?.timeline_growth.groups_over_time.length ?? 0}
          />
          <StatCard
            icon={<BarChart3 className="size-4 text-blue-600" />}
            label="Timeline Events"
            value={data?.timeline_growth.events_count ?? 0}
          />
          <StatCard
            icon={<Shield className="size-4 text-purple-600" />}
            label="Avg Stability (90d)"
            value={
              data?.stable_foods.length
                ? `${(data.stable_foods.reduce((s, f) => s + (f.day90_stability_rate ?? 0), 0) / data.stable_foods.length).toFixed(1)}%`
                : "—"
            }
          />
          <StatCard
            icon={<RefreshCw className="size-4 text-amber-600" />}
            label="Avg Repurchase Rate"
            value={
              data?.repurchase_rank.length
                ? `${(data.repurchase_rank.reduce((s, f) => s + (f.repurchase_rate ?? 0), 0) / data.repurchase_rank.length).toFixed(1)}%`
                : "—"
            }
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Long-Term Stability Rank */}
          <RankCard
            title="Top Stable Foods"
            icon={<TrendingUp className="size-4 text-emerald-600" />}
            items={data?.stable_foods ?? []}
            valueKey="day90_stability_rate"
            valueLabel="90d 稳定率"
            color="text-emerald-600"
          />

          {/* 2. Soft Stool Risk Rank */}
          <RankCard
            title="Highest Soft Stool Risk"
            icon={<AlertTriangle className="size-4 text-amber-600" />}
            items={data?.soft_stool_risk ?? []}
            valueKey="soft_stool_rate"
            valueLabel="软便率"
            color="text-amber-600"
          />

          {/* 3. Black Chin Risk Rank */}
          <RankCard
            title="Highest Black Chin Risk"
            icon={<AlertTriangle className="size-4 text-red-600" />}
            items={data?.black_chin_risk ?? []}
            valueKey="black_chin_rate"
            valueLabel="黑下巴率"
            color="text-red-600"
          />

          {/* 4. Repurchase Rank */}
          <RankCard
            title="Highest Repurchase Foods"
            icon={<RefreshCw className="size-4 text-blue-600" />}
            items={data?.repurchase_rank ?? []}
            valueKey="repurchase_rate"
            valueLabel="复购率"
            color="text-blue-600"
          />
        </div>

        {/* 6. Product Lifecycle */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Product Lifecycle — 稳定率衰减曲线</CardTitle>
            <p className="text-xs text-muted-foreground">Day 30 → Day 90 → Day 180 稳定率变化</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">产品</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Day 30</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Day 90</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Day 180</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Timeline 数</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.lifecycle_sample ?? []).slice(0, 15).map((item) => {
                    const d30 = item.day30_stability_rate ?? 0
                    const d90 = item.day90_stability_rate ?? 0
                    const d180 = item.day180_stability_rate ?? 0
                    const trend = d180 > d30 ? "improving" : d180 < d30 - 5 ? "declining" : "stable"
                    return (
                      <tr key={item.product_id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">
                          <div>{item.product_name}</div>
                          <div className="text-[10px] text-muted-foreground">{item.brand}</div>
                        </td>
                        <td className="text-right py-2 px-3 tabular-nums">{d30.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3 tabular-nums">{d90.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3 tabular-nums">{d180.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3 tabular-nums">{item.timeline_count}</td>
                        <td className="text-right py-2 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              trend === "improving"
                                ? "text-emerald-600 border-emerald-200"
                                : trend === "declining"
                                  ? "text-red-600 border-red-200"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {trend === "improving" ? "改善" : trend === "declining" ? "衰减" : "稳定"}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold mt-2 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function RankCard({
  title,
  icon,
  items,
  valueKey,
  valueLabel,
  color,
}: {
  title: string
  icon: React.ReactNode
  items: TimelineMetrics[]
  valueKey: keyof TimelineMetrics
  valueLabel: string
  color: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {items.slice(0, 8).map((item, i) => {
            const val = (item[valueKey] as number) ?? 0
            return (
              <div key={item.product_id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="truncate">
                    <div className="font-medium truncate">{item.product_name}</div>
                    <div className="text-[10px] text-muted-foreground">{item.brand}</div>
                  </div>
                </div>
                <div className={`font-bold tabular-nums shrink-0 ml-2 ${color}`}>
                  {val.toFixed(1)}%
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          共 {items.length} 款产品 · {valueLabel}
        </p>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] p-6">
      <div className="mx-auto max-w-7xl">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    </div>
  )
}
