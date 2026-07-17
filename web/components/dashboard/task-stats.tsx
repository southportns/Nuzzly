"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Stats {
  totalTasks: number
  completedCount: number
  skippedCount: number
  completionRate: number
  byDate: Record<string, { completed: number; skipped: number; total: number }>
}

interface Props {
  stats: Stats
}

export function TaskStats({ stats }: Props) {
  // 获取最近7天的数据
  const last7Days = Object.entries(stats.byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)

  // 判断趋势
  const recentRate = last7Days.length > 0 
    ? Math.round((last7Days[0][1].completed / last7Days[0][1].total) * 100) 
    : 0
  const olderRate = last7Days.length > 1 
    ? Math.round((last7Days[1][1].completed / last7Days[1][1].total) * 100) 
    : 0

  const trend = recentRate > olderRate ? "up" : recentRate < olderRate ? "down" : "stable"

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-[32px] font-semibold text-[#111111]">{stats.completionRate}%</p>
          <p className="text-[12px] text-[#6B6B6B]">完成率</p>
          <div className="mt-1 flex items-center justify-center gap-1">
            {trend === "up" && <TrendingUp className="size-3 text-[#34c759]" />}
            {trend === "down" && <TrendingDown className="size-3 text-[#ff3b30]" />}
            {trend === "stable" && <Minus className="size-3 text-[#6B6B6B]" />}
            <span className={`text-[10px] ${trend === "up" ? "text-[#34c759]" : trend === "down" ? "text-[#ff3b30]" : "text-[#6B6B6B]"}`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[32px] font-semibold text-[#111111]">{stats.completedCount}</p>
          <p className="text-[12px] text-[#6B6B6B]">已完成</p>
        </div>
        <div className="text-center">
          <p className="text-[32px] font-semibold text-[#111111]">{stats.skippedCount}</p>
          <p className="text-[12px] text-[#6B6B6B]">已跳过</p>
        </div>
        <div className="text-center">
          <p className="text-[32px] font-semibold text-[#111111]">{stats.totalTasks}</p>
          <p className="text-[12px] text-[#6B6B6B]">每日任务</p>
        </div>
      </div>

      {/* Weekly Chart (Simple) */}
      <div className="mt-4">
        <p className="mb-2 text-[12px] text-[#6B6B6B]">最近7天</p>
        <div className="flex items-end gap-1" style={{ height: 60 }}>
          {last7Days.reverse().map(([date, data]) => {
            const rate = data.total > 0 ? (data.completed / data.total) * 100 : 0
            const day = new Date(date).toLocaleDateString("zh-CN", { weekday: "short" })
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[#FF7A59]"
                  style={{ height: `${rate}%`, minHeight: rate > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-[#6B6B6B]">{day}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
