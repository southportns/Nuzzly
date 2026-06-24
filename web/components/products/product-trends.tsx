"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts"
import type { TooltipContentProps } from "recharts/types/component/Tooltip"
import type { Payload as TooltipPayloadEntry } from "recharts/types/component/DefaultTooltipContent"
import { TrendingUp, AlertTriangle, Star } from "lucide-react"

interface MetricsData {
  date: string
  average_rating: number | null
  stool_issue_rate: number | null
  repurchase_rate: number | null
  breed_match_score: number | null
  sensitive_gut_score: number | null
  review_count: number | null
}

const chartConfig = {
  rating: { stroke: "oklch(0.65 0.15 145)", fill: "oklch(0.65 0.15 145 / 0.1)", label: "综合评分" },
  stool: { stroke: "oklch(0.75 0.15 85)", fill: "oklch(0.75 0.15 85 / 0.1)", label: "软便率" },
  repurchase: { stroke: "oklch(0.55 0.2 250)", fill: "oklch(0.55 0.2 250 / 0.1)", label: "复购率" },
}

export function ProductTrends({ metrics }: { metrics: MetricsData[] }) {
  const sorted = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const chartData = sorted.map((m) => ({
    ...m,
    date: new Date(m.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
    rating: m.average_rating != null ? Number(m.average_rating) : null,
    stool_rate: m.stool_issue_rate != null ? Number((Number(m.stool_issue_rate) * 100).toFixed(1)) : null,
    repurchase: m.repurchase_rate != null ? Number((Number(m.repurchase_rate) * 100).toFixed(1)) : null,
    breed: m.breed_match_score != null ? Number(m.breed_match_score) : null,
    gut: m.sensitive_gut_score != null ? Number(m.sensitive_gut_score) : null,
    reviews: m.review_count,
  }))

  const CustomTooltip = ({ active, payload, label }: Partial<TooltipContentProps>) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-border/40 bg-background/95 backdrop-blur p-3 shadow-xl">
        <p className="text-xs font-medium mb-1">{label}</p>
        {payload.map((p: TooltipPayloadEntry) => (
          <div key={p.name} className="flex items-center gap-2 text-xs">
            <div className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-medium tabular-nums">{p.value}{p.name === "复购率" || p.name === "软便率" ? "%" : ""}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" />
          长期趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rating">
          <TabsList className="mb-4">
            <TabsTrigger value="rating" className="gap-1.5">
              <Star className="size-3" />综合评分
            </TabsTrigger>
            <TabsTrigger value="stool" className="gap-1.5">
              <AlertTriangle className="size-3" />软便率
            </TabsTrigger>
            <TabsTrigger value="repurchase" className="gap-1.5">
              <TrendingUp className="size-3" />复购率
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rating">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartConfig.rating.stroke} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={chartConfig.rating.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.3)" />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.3)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="rating" stroke={chartConfig.rating.stroke} fill="url(#ratingFill)" strokeWidth={2} name="综合评分" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="stool">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="stoolFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartConfig.stool.stroke} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={chartConfig.stool.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.3)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.3)" unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="stool_rate" stroke={chartConfig.stool.stroke} fill="url(#stoolFill)" strokeWidth={2} name="软便率" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="repurchase">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="repurchaseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartConfig.repurchase.stroke} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={chartConfig.repurchase.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.3)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.3)" unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="repurchase" stroke={chartConfig.repurchase.stroke} fill="url(#repurchaseFill)" strokeWidth={2} name="复购率" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
