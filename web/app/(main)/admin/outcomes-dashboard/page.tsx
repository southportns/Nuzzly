"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Gauge,
  History,
  Layers,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"

// ─── Types (match /api/admin/outcomes/dashboard + /effectiveness responses) ─

interface AttributionData {
  totalAttributions: number
  successRate: number
  avgConfidence: number
  avgContribution: number
}

interface BenchmarkItem {
  category: string
  sampleSize: number
  medianImprovement: number | null
  meanImprovement: number | null
  confidenceIntervalLower: number | null
  confidenceIntervalUpper: number | null
  medianDaysToImprovement: number | null
}

interface EffectivenessTopItem {
  entityId: string
  effectivenessScore: number
  qualityScore: number
  accuracyScore: number
  consistencyScore: number
  safetyScore: number
  sampleCount: number
}

interface CohortItem {
  cohortKey: string
  memberCount: number
  avgHealthScore: number | null
  avgImprovementRate: number | null
  avgEffectivenessScore: number | null
  baselineComparison: Record<string, unknown>
}

interface ObservabilityData {
  attributionCount: number
  longitudinalCount: number
  benchmarkUpdateCount: number
  effectivenessScoreCount: number
  explainabilityCount: number
  cohortUpdateCount: number
  flywheelCompletedCount: number
}

interface DashboardData {
  attribution: AttributionData
  longitudinal: {
    totalRecords: number
    improvedRate: number
    stableRate: number
    worsenedRate: number
    avgHealthScoreDelta: number
  }
  benchmarks: BenchmarkItem[]
  effectiveness: { topProducts: EffectivenessTopItem[] }
  cohorts: CohortItem[]
  observability: ObservabilityData
}

interface EffectivenessScore {
  entityId: string
  entityType: string
  effectivenessScore: number
  qualityScore: number
  accuracyScore: number
  consistencyScore: number
  safetyScore: number
  sampleCount: number
  outcomeSuccessRate: number | null
  avgConfidence: number | null
}

type RunStatus = "idle" | "running" | "completed" | "failed"

interface IterationMetrics {
  recommendations_processed: number
  outcomes_analyzed: number
  attributions_computed: number
  benchmarks_updated: number
  effectiveness_recalculated: number
  strategy_evaluations: number
}

interface IterationQualityScores {
  evidence_quality_score: number | null
  data_completeness: number | null
}

interface IterationItem {
  iteration_number: number
  status: "running" | "completed" | "failed"
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  metrics: IterationMetrics
  quality_scores: IterationQualityScores
  errors: string | null
}

export default function OutcomesDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [topScores, setTopScores] = useState<EffectivenessScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [running, setRunning] = useState(false)
  const [iterations, setIterations] = useState<IterationItem[]>([])
  const [iterationsLoading, setIterationsLoading] = useState(true)

  const fetchIterations = useCallback(async () => {
    setIterationsLoading(true)
    try {
      const res = await fetch("/api/admin/outcomes/iterations?limit=30")
      const json = await res.json().catch(() => ({ success: false }))
      if (json.success) {
        setIterations(json.data?.iterations ?? [])
      } else {
        setIterations([])
      }
    } catch {
      setIterations([])
    } finally {
      setIterationsLoading(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashRes, effRes] = await Promise.all([
        fetch("/api/admin/outcomes/dashboard"),
        fetch("/api/admin/outcomes/effectiveness?entityType=product&topOnly=true&limit=5"),
      ])
      const dashJson = await dashRes.json()
      if (!dashJson.success) {
        throw new Error(dashJson.error ?? "加载飞轮数据失败")
      }
      setData(dashJson.data)
      const effJson = await effRes.json().catch(() => ({ success: false }))
      setTopScores(effJson.success ? (effJson.data?.scores ?? []) : [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "网络错误"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchIterations()
  }, [fetchIterations])

  const handleRunFlywheel = useCallback(async () => {
    setRunning(true)
    setRunStatus("running")
    try {
      // Prefer run-cycle; fall back to analyze when the route is not yet present.
      let res = await fetch("/api/admin/outcomes/run-cycle", { method: "POST" })
      if (res.status === 404) {
        res = await fetch("/api/admin/outcomes/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recommendations: [] }),
        })
      }
      const json = await res.json().catch(() => ({ success: false }))
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `飞轮运行失败 (${res.status})`)
      }
      setRunStatus("completed")
      toast.success("飞轮迭代已完成")
      await fetchData()
      await fetchIterations()
    } catch (err) {
      setRunStatus("failed")
      const msg = err instanceof Error ? err.message : "飞轮运行失败"
      toast.error(msg)
    } finally {
      setRunning(false)
    }
  }, [fetchData, fetchIterations])

  if (loading) return <LoadingSkeleton />

  if (error && !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-red-500" />
            <CardTitle>加载失败</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>暂无数据</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const evidenceQuality = Math.round((data.attribution.avgConfidence ?? 0) * 100)
  const dataCompleteness = Math.round((data.attribution.successRate ?? 0) * 100)

  const stats = [
    { label: "处理推荐数", value: data.observability.flywheelCompletedCount, icon: Sparkles, accent: "#7BA7BC" },
    { label: "结果分析数", value: data.observability.longitudinalCount, icon: BarChart3, accent: "#A8C5A0" },
    { label: "归因计算数", value: data.observability.attributionCount, icon: Target, accent: "#E8A87C" },
    { label: "基准更新数", value: data.observability.benchmarkUpdateCount, icon: Layers, accent: "#FF7A59" },
    { label: "有效性重算数", value: data.observability.effectivenessScoreCount, icon: Gauge, accent: "#B59BD8" },
    { label: "策略评估数", value: data.observability.explainabilityCount, icon: Activity, accent: "#4A7A91" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111111]">
            核心资产飞轮 · Outcomes Dashboard
          </h1>
          <p className="mt-1 text-[14px] text-[#6B6B6B]">
            飞轮迭代指标 · 证据质量 · 有效性 · 群体智能 · 健康基准
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={runStatus} />
          <Button onClick={handleRunFlywheel} disabled={running} size="sm">
            <RefreshCw className={running ? "animate-spin" : ""} />
            {running ? "运行中" : "运行飞轮"}
          </Button>
        </div>
      </div>

      {/* Section 1: Iteration stats */}
      <section>
        <h2 className="mb-3 text-[16px] font-semibold text-[#111111]">飞轮迭代统计</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              icon={<s.icon className="size-5" />}
              accent={s.accent}
            />
          ))}
        </div>
      </section>

      {/* Section 1.5: Flywheel iterations trend */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <History className="size-4 text-[#7BA7BC]" />
          <h2 className="text-[16px] font-semibold text-[#111111]">飞轮迭代历史趋势</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Evidence Quality & Data Completeness Trend</CardTitle>
            <CardDescription>
              最近 30 次迭代的质量趋势 · 蓝线 evidence_quality_score · 绿线 data_completeness
            </CardDescription>
          </CardHeader>
          <CardContent>
            {iterationsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : iterations.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                暂无迭代数据
              </div>
            ) : (
              <IterationsTrendChart iterations={iterations} />
            )}
          </CardContent>
        </Card>

        {/* Iterations detail table */}
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[#A8C5A0]" />
              <CardTitle className="text-sm">迭代详情</CardTitle>
            </div>
            <CardDescription>
              点击行展开查看 errors · 状态: running=黄 · completed=绿 · failed=红
            </CardDescription>
          </CardHeader>
          <CardContent>
            {iterationsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : iterations.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">暂无迭代数据</div>
            ) : (
              <IterationsTable iterations={iterations} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section 2: Evidence quality */}
      <section>
        <h2 className="mb-3 text-[16px] font-semibold text-[#111111]">证据质量</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evidence Quality Score</CardTitle>
              <CardDescription>归因平均置信度 (avgConfidence)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums text-[#111111]">{evidenceQuality}%</span>
                <span className="text-xs text-[#86868b] tabular-nums">
                  {data.attribution.avgConfidence.toFixed(3)}
                </span>
              </div>
              <Progress value={evidenceQuality} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data Completeness</CardTitle>
              <CardDescription>归因成功率 (successRate)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums text-[#111111]">{dataCompleteness}%</span>
                <span className="text-xs text-[#86868b] tabular-nums">
                  {data.attribution.successRate.toFixed(3)}
                </span>
              </div>
              <Progress value={dataCompleteness} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 3: Top 5 effectiveness */}
      <section>
        <h2 className="mb-3 text-[16px] font-semibold text-[#111111]">Top 5 高有效性产品</h2>
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Entity ID</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Effectiveness</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Sample</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topScores.slice(0, 5).map((s) => (
                    <tr key={s.entityId} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="max-w-[220px] truncate py-2 px-3 font-medium">{s.entityId}</td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums text-emerald-600">
                        {s.effectivenessScore.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{s.sampleCount}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {s.outcomeSuccessRate != null
                          ? `${(s.outcomeSuccessRate * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {topScores.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        暂无有效性数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 4 + 5: Cohorts & Benchmarks */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[#7BA7BC]" />
              <CardTitle className="text-sm">群体智能 · Top 5 Cohorts</CardTitle>
            </div>
            <CardDescription>cohort_intelligence · member_count / avg_health_score / avg_improvement_rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-[#F0EFED]">
              {data.cohorts.slice(0, 5).map((c) => (
                <li key={c.cohortKey} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#111111]">{c.cohortKey}</div>
                    <div className="text-[11px] text-[#86868b]">{c.memberCount} 成员</div>
                  </div>
                  <div className="flex shrink-0 gap-3 text-right text-[11px]">
                    <div>
                      <div className="text-[#86868b]">Avg Health</div>
                      <div className="font-semibold tabular-nums text-[#111111]">
                        {c.avgHealthScore != null ? c.avgHealthScore.toFixed(2) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#86868b]">Improve Rate</div>
                      <div className="font-semibold tabular-nums text-emerald-600">
                        {c.avgImprovementRate != null
                          ? `${(c.avgImprovementRate * 100).toFixed(1)}%`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {data.cohorts.length === 0 && (
                <li className="py-6 text-center text-[12px] text-[#86868b]">暂无群体智能数据</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-[#A8C5A0]" />
              <CardTitle className="text-sm">健康基准 · Top 5</CardTitle>
            </div>
            <CardDescription>health_benchmarks · sample_size / median_improvement / median_days_to_improvement</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-[#F0EFED]">
              {data.benchmarks.slice(0, 5).map((b) => (
                <li key={b.category} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#111111]">{b.category}</div>
                    <div className="text-[11px] text-[#86868b]">n={b.sampleSize}</div>
                  </div>
                  <div className="flex shrink-0 gap-3 text-right text-[11px]">
                    <div>
                      <div className="text-[#86868b]">Median Δ</div>
                      <div className="font-semibold tabular-nums text-[#111111]">
                        {b.medianImprovement != null ? b.medianImprovement.toFixed(2) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#86868b]">Days</div>
                      <div className="font-semibold tabular-nums text-[#FF7A59]">
                        {b.medianDaysToImprovement != null ? b.medianDaysToImprovement : "—"}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {data.benchmarks.length === 0 && (
                <li className="py-6 text-center text-[12px] text-[#86868b]">暂无健康基准数据</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
      <div
        className="flex size-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[24px] font-bold leading-none tabular-nums text-[#111111]">
          {value.toLocaleString()}
        </div>
        <div className="mt-1.5 text-[12.5px] text-[#6B6B6B]">{label}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: RunStatus }) {
  if (status === "running") {
    return (
      <Badge className="bg-amber-100 text-amber-700">
        <RefreshCw className="animate-spin" />
        running
      </Badge>
    )
  }
  if (status === "completed") {
    return <Badge className="bg-emerald-100 text-emerald-700">completed</Badge>
  }
  if (status === "failed") {
    return <Badge className="bg-red-100 text-red-700">failed</Badge>
  }
  return <Badge variant="outline" className="text-xs">未运行</Badge>
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-5 w-32" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-[260px]" />
      <Skeleton className="h-5 w-24" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-48" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

// ─── Iterations trend line chart (pure SVG, no extra deps) ────────────────

const TREND_WIDTH = 800
const TREND_HEIGHT = 200
const TREND_PADDING_LEFT = 40
const TREND_PADDING_RIGHT = 16
const TREND_PADDING_TOP = 12
const TREND_PADDING_BOTTOM = 28
const COLOR_QUALITY = "#3b82f6" // blue
const COLOR_COMPLETENESS = "#10b981" // green

interface TrendPoint {
  iteration_number: number
  evidence_quality_score: number | null
  data_completeness: number | null
}

function buildPolylinePoints(
  points: TrendPoint[],
  field: "evidence_quality_score" | "data_completeness"
): string {
  const innerWidth = TREND_WIDTH - TREND_PADDING_LEFT - TREND_PADDING_RIGHT
  const innerHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM
  const n = points.length
  if (n === 0) return ""

  return points
    .map((p, i) => {
      const value = p[field]
      if (value == null) return null
      // evidence_quality_score is 0-100 in DB; normalize to 0-1 for the chart.
      // data_completeness is already 0-1.
      const normalized = field === "evidence_quality_score" ? value / 100 : value
      const x = TREND_PADDING_LEFT + (n === 1 ? innerWidth / 2 : (i / (n - 1)) * innerWidth)
      const clamped = Math.max(0, Math.min(1, normalized))
      const y = TREND_PADDING_TOP + (1 - clamped) * innerHeight
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .filter((v): v is string => v !== null)
    .join(" ")
}

function IterationsTrendChart({ iterations }: { iterations: IterationItem[] }) {
  // API returns iterations ordered by iteration_number DESC.
  // Reverse so the chart reads left → right (older → newer).
  const series = [...iterations].sort((a, b) => a.iteration_number - b.iteration_number)

  const trendPoints: TrendPoint[] = series.map((it) => ({
    iteration_number: it.iteration_number,
    evidence_quality_score: it.quality_scores.evidence_quality_score,
    data_completeness: it.quality_scores.data_completeness,
  }))

  const qualityPoints = buildPolylinePoints(trendPoints, "evidence_quality_score")
  const completenessPoints = buildPolylinePoints(trendPoints, "data_completeness")

  // Tick lines at 0, 0.25, 0.5, 0.75, 1.0
  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const innerHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM

  // X-axis label sampling: avoid overlap when there are many iterations.
  const xLabelStep = Math.max(1, Math.ceil(series.length / 8))

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
        width="100%"
        height="200"
        role="img"
        aria-label="飞轮迭代质量趋势折线图"
        preserveAspectRatio="none"
      >
        {/* Y axis grid + labels */}
        <g>
          {yTicks.map((tick) => {
            const y = TREND_PADDING_TOP + (1 - tick) * innerHeight
            return (
              <g key={tick}>
                <line
                  x1={TREND_PADDING_LEFT}
                  y1={y}
                  x2={TREND_WIDTH - TREND_PADDING_RIGHT}
                  y2={y}
                  stroke="#F0EFED"
                  strokeWidth={1}
                />
                <text
                  x={TREND_PADDING_LEFT - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="#86868b"
                >
                  {tick.toFixed(2)}
                </text>
              </g>
            )
          })}
        </g>

        {/* Polylines */}
        <g>
          {qualityPoints && (
            <polyline
              points={qualityPoints}
              fill="none"
              stroke={COLOR_QUALITY}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {completenessPoints && (
            <polyline
              points={completenessPoints}
              fill="none"
              stroke={COLOR_COMPLETENESS}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Data points with hover tooltips (transparent hit area + visible dot) */}
        <g>
          {trendPoints.map((p, i) => {
            const innerWidth = TREND_WIDTH - TREND_PADDING_LEFT - TREND_PADDING_RIGHT
            const n = series.length
            const x = TREND_PADDING_LEFT + (n === 1 ? innerWidth / 2 : (i / (n - 1)) * innerWidth)
            return (
              <g key={`pt-${p.iteration_number}`}>
                {p.evidence_quality_score != null && (
                  <TrendDot
                    x={x}
                    value={p.evidence_quality_score}
                    field="evidence_quality_score"
                    iterationNumber={p.iteration_number}
                  />
                )}
                {p.data_completeness != null && (
                  <TrendDot
                    x={x}
                    value={p.data_completeness}
                    field="data_completeness"
                    iterationNumber={p.iteration_number}
                  />
                )}
              </g>
            )
          })}
        </g>

        {/* X axis labels (iteration_number) */}
        <g>
          {trendPoints.map((p, i) => {
            if (i % xLabelStep !== 0 && i !== trendPoints.length - 1) return null
            const innerWidth = TREND_WIDTH - TREND_PADDING_LEFT - TREND_PADDING_RIGHT
            const n = series.length
            const x = TREND_PADDING_LEFT + (n === 1 ? innerWidth / 2 : (i / (n - 1)) * innerWidth)
            return (
              <text
                key={`xlabel-${p.iteration_number}`}
                x={x}
                y={TREND_HEIGHT - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#86868b"
              >
                #{p.iteration_number}
              </text>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#6B6B6B]">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: COLOR_QUALITY }}
          />
          evidence_quality_score (0-1, 原 0-100 已归一)
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: COLOR_COMPLETENESS }}
          />
          data_completeness (0-1)
        </div>
      </div>
    </div>
  )
}

function TrendDot({
  x,
  value,
  field,
  iterationNumber,
}: {
  x: number
  value: number
  field: "evidence_quality_score" | "data_completeness"
  iterationNumber: number
}) {
  const innerHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM
  const normalized = field === "evidence_quality_score" ? value / 100 : value
  const clamped = Math.max(0, Math.min(1, normalized))
  const y = TREND_PADDING_TOP + (1 - clamped) * innerHeight
  const color = field === "evidence_quality_score" ? COLOR_QUALITY : COLOR_COMPLETENESS
  const label =
    field === "evidence_quality_score"
      ? `evidence_quality_score=${value.toFixed(2)}`
      : `data_completeness=${value.toFixed(4)}`

  return (
    <g>
      <circle cx={x} cy={y} r={3} fill={color} stroke="#ffffff" strokeWidth={1} />
      <circle cx={x} cy={y} r={10} fill="transparent">
        <title>{`iteration #${iterationNumber} · ${label}`}</title>
      </circle>
    </g>
  )
}

// ─── Iterations detail table ──────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms == null) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return `${minutes}m${seconds}s`
}

function formatStartedAt(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function IterationStatusBadge({ status }: { status: IterationItem["status"] }) {
  if (status === "running") {
    return <Badge className="bg-amber-100 text-amber-700">running</Badge>
  }
  if (status === "completed") {
    return <Badge className="bg-emerald-100 text-emerald-700">completed</Badge>
  }
  return <Badge className="bg-red-100 text-red-700">failed</Badge>
}

function IterationsTable({ iterations }: { iterations: IterationItem[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/50">
            <th className="py-2 px-3 text-left font-medium text-muted-foreground">#</th>
            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Started At</th>
            <th className="py-2 px-3 text-right font-medium text-muted-foreground">Duration</th>
            <th className="py-2 px-3 text-right font-medium text-muted-foreground">
              Recommendations
            </th>
            <th className="py-2 px-3 text-right font-medium text-muted-foreground">
              Evidence Quality
            </th>
          </tr>
        </thead>
        <tbody>
          {iterations.map((it) => {
            const isOpen = expanded === it.iteration_number
            const hasError = Boolean(it.errors)
            return (
              <Fragment key={`row-${it.iteration_number}`}>
                <tr
                  className={`border-b border-border/30 hover:bg-muted/30 ${
                    hasError ? "cursor-pointer" : ""
                  }`}
                  onClick={() => {
                    if (hasError) {
                      setExpanded(isOpen ? null : it.iteration_number)
                    }
                  }}
                >
                  <td className="py-2 px-3 font-medium">
                    {hasError ? (
                      <span className="inline-flex items-center gap-1">
                        {isOpen ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronRight className="size-3" />
                        )}
                        #{it.iteration_number}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block size-3" />
                        #{it.iteration_number}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <IterationStatusBadge status={it.status} />
                  </td>
                  <td className="py-2 px-3 tabular-nums text-muted-foreground">
                    {formatStartedAt(it.started_at)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatDuration(it.duration_ms)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {it.metrics.recommendations_processed}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums text-[#3b82f6]">
                    {it.quality_scores.evidence_quality_score != null
                      ? it.quality_scores.evidence_quality_score.toFixed(2)
                      : "—"}
                  </td>
                </tr>
                {isOpen && hasError && (
                  <tr className="bg-red-50/50">
                    <td colSpan={6} className="py-2 px-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
                            Error
                          </div>
                          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-red-700">
                            {it.errors}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
