"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, Calendar, Activity } from "lucide-react"

interface RetentionAnalysisProps {
  userId: string
}

interface RetentionStats {
  total_days: number
  active_days: number
  last_active: string
  diet_logs_count: number
  reviews_count: number
  products_viewed: number
  streak_days: number
}

export function RetentionAnalysis({ userId }: RetentionAnalysisProps) {
  const [stats, setStats] = useState<RetentionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()

      // Get account age
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .single()

      // Get diet logs count
      const { count: dietCount } = await supabase
        .from("diet_logs")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)

      // Get reviews count
      const { count: reviewCount } = await supabase
        .from("product_reviews")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)

      // Get products viewed
      const { count: viewCount } = await supabase
        .from("intent_events")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)
        .eq("event_type", "product_view")

      // Get last active date
      const { data: lastActivity } = await supabase
        .from("intent_events")
        .select("created_at")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)

      // Calculate streak (consecutive days with activity)
      const { data: recentLogs } = await supabase
        .from("diet_logs")
        .select("logged_date")
        .eq("profile_id", userId)
        .order("logged_date", { ascending: false })
        .limit(30)

      let streak = 0
      if (recentLogs && recentLogs.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        for (let i = 0; i < recentLogs.length; i++) {
          const logDate = new Date(recentLogs[i].logged_date)
          logDate.setHours(0, 0, 0, 0)
          const expectedDate = new Date(today)
          expectedDate.setDate(expectedDate.getDate() - i)
          if (logDate.getTime() === expectedDate.getTime()) {
            streak++
          } else {
            break
          }
        }
      }

      const totalDays = profile
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      setStats({
        total_days: totalDays,
        active_days: recentLogs?.length ?? 0,
        last_active: lastActivity?.[0]?.created_at ?? "",
        diet_logs_count: dietCount ?? 0,
        reviews_count: reviewCount ?? 0,
        products_viewed: viewCount ?? 0,
        streak_days: streak,
      })
      setLoading(false)
    }

    fetchStats()
  }, [userId])

  if (loading || !stats) {
    return (
      <div className="rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="h-40 animate-pulse rounded-[12px] bg-[#F7F6F3]" />
      </div>
    )
  }

  const retentionRate = stats.total_days > 0 ? ((stats.active_days / stats.total_days) * 100).toFixed(1) : "0"
  const isHighRetention = parseFloat(retentionRate) > 50

  return (
    <Card className="rounded-[16px] border-[rgba(0,0,0,0.05)] bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-[#FF7A59]" />
          使用分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Retention Overview */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] bg-[#F7F6F3] p-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-[#6B6B6B]" />
              <span className="text-[13px] text-[#6B6B6B]">注册天数</span>
            </div>
            <p className="mt-2 text-[28px] font-semibold text-[#111111]">{stats.total_days}</p>
          </div>
          <div className="rounded-[12px] bg-[#F7F6F3] p-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[#6B6B6B]" />
              <span className="text-[13px] text-[#6B6B6B]">活跃天数</span>
            </div>
            <p className="mt-2 text-[28px] font-semibold text-[#111111]">{stats.active_days}</p>
          </div>
        </div>

        {/* Streak */}
        <div className="mb-4 rounded-[12px] bg-[#F7F6F3] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B6B6B]">连续记录</p>
              <p className="mt-1 text-[24px] font-semibold text-[#111111]">{stats.streak_days}<span className="text-[14px] text-[#6B6B6B]"> 天</span></p>
            </div>
            {stats.streak_days >= 7 && (
              <Badge className="rounded-full bg-[#34C759] text-white">
                <TrendingUp className="mr-1 size-3.5" />
                坚持中！
              </Badge>
            )}
          </div>
        </div>

        {/* Activity Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-[10px] bg-[#F7F6F3] p-3">
            <span className="text-[13px] text-[#6B6B6B]">饮食记录</span>
            <span className="text-[14px] font-semibold text-[#111111]">{stats.diet_logs_count} 次</span>
          </div>
          <div className="flex items-center justify-between rounded-[10px] bg-[#F7F6F3] p-3">
            <span className="text-[13px] text-[#6B6B6B]">产品评价</span>
            <span className="text-[14px] font-semibold text-[#111111]">{stats.reviews_count} 条</span>
          </div>
          <div className="flex items-center justify-between rounded-[10px] bg-[#F7F6F3] p-3">
            <span className="text-[13px] text-[#6B6B6B]">浏览产品</span>
            <span className="text-[14px] font-semibold text-[#111111]">{stats.products_viewed} 个</span>
          </div>
        </div>

        {/* Retention Rate */}
        <div className="mt-4 rounded-[12px] bg-gradient-to-r from-[#FF7A59]/10 to-[#FF9500]/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B6B6B]">留存率</p>
              <p className="mt-1 text-[24px] font-semibold text-[#111111]">{retentionRate}%</p>
            </div>
            <Badge
              variant="outline"
              className="rounded-full"
              style={{
                borderColor: isHighRetention ? "#34C759" : "#FF9500",
                color: isHighRetention ? "#34C759" : "#FF9500",
              }}
            >
              <Users className="mr-1 size-3.5" />
              {isHighRetention ? "高活跃" : "需提升"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
