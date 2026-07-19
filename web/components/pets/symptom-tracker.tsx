"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"

interface SymptomTrackerProps {
  petId: string
}

interface SymptomEvent {
  id: string
  event_time: string
  symptom_code: string
  severity: string | null
  notes: string | null
}

const severityColors: Record<string, string> = {
  mild: "#34C759",
  moderate: "#FF9500",
  severe: "#FF3B30",
}

const severityLabels: Record<string, string> = {
  mild: "轻微",
  moderate: "中等",
  severe: "严重",
}

export function SymptomTracker({ petId }: SymptomTrackerProps) {
  const [symptoms, setSymptoms] = useState<SymptomEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSymptoms = async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("pet_events")
        .select("id, event_time, symptom_code, severity, notes")
        .eq("pet_id", petId)
        .eq("event_type", "symptom")
        .order("event_time", { ascending: false })
        .limit(20)

      if (data) {
        setSymptoms(data as SymptomEvent[])
      }
      setLoading(false)
    }

    fetchSymptoms()
  }, [petId])

  if (loading) {
    return (
      <div className="rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="h-40 animate-pulse rounded-[12px] bg-[#F7F6F3]" />
      </div>
    )
  }

  // Count symptoms by type
  const symptomCount: Record<string, number> = {}
  symptoms.forEach((s) => {
    symptomCount[s.symptom_code] = (symptomCount[s.symptom_code] ?? 0) + 1
  })
  const topSymptoms = Object.entries(symptomCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Recent trend (last 7 days vs previous 7 days)
  const now = new Date()
  const last7Days = symptoms.filter((s) => {
    const d = new Date(s.event_time)
    return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  })
  const prev7Days = symptoms.filter((s) => {
    const d = new Date(s.event_time)
    return d >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) && d < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  })

  const trendIcon = last7Days.length > prev7Days.length ? <TrendingUp className="size-4 text-[#FF3B30]" /> : last7Days.length < prev7Days.length ? <TrendingDown className="size-4 text-[#34C759]" /> : <Activity className="size-4 text-[#FF9500]" />
  const trendLabel = last7Days.length > prev7Days.length ? "症状增加" : last7Days.length < prev7Days.length ? "症状减少" : "持平"

  return (
    <Card className="rounded-[16px] border-[rgba(0,0,0,0.05)] bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-[#FF7A59]" />
          症状追踪
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Trend Summary */}
        <div className="mb-4 flex items-center justify-between rounded-[12px] bg-[#F7F6F3] p-4">
          <div>
            <p className="text-[13px] text-[#6B6B6B]">近7天症状</p>
            <p className="mt-1 text-[24px] font-semibold text-[#111111]">{last7Days.length}<span className="text-[14px] text-[#6B6B6B]"> 次</span></p>
          </div>
          <div className="flex items-center gap-1.5">
            {trendIcon}
            <span className="text-[13px] font-medium text-[#6B6B6B]">{trendLabel}</span>
          </div>
        </div>

        {/* Symptom Frequency */}
        {topSymptoms.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[12px] text-[#6B6B6B]">症状频次</p>
            <div className="space-y-2">
              {topSymptoms.map(([code, count]) => (
                <div key={code} className="flex items-center gap-2">
                  <span className="w-20 text-[12px] text-[#6B6B6B]">{code}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-[#F0EFED]">
                    <div
                      className="h-2 rounded-full bg-[#FF7A59] transition-all"
                      style={{ width: `${(count / symptoms.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[12px] text-[#6B6B6B]">{count}次</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Symptoms */}
        <div>
          <p className="mb-2 text-[12px] text-[#6B6B6B]">最近症状</p>
          <div className="space-y-2">
            {symptoms.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-[10px] bg-[#F7F6F3] p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-[#FF9500]" />
                  <span className="text-[13px] font-medium text-[#111111]">{s.symptom_code}</span>
                </div>
                <div className="flex items-center gap-2">
                  {s.severity && (
                    <Badge
                      variant="outline"
                      className="rounded-full text-[11px]"
                      style={{ borderColor: severityColors[s.severity], color: severityColors[s.severity] }}
                    >
                      {severityLabels[s.severity] ?? s.severity}
                    </Badge>
                  )}
                  <span className="text-[11px] text-[#6B6B6B]">
                    {new Date(s.event_time).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
