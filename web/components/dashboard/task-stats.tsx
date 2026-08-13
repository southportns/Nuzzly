"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useTranslations, useLocale } from "next-intl"

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
const t = useTranslations("DailyTasks")
const locale = useLocale() as string
const dateLocale = locale === "zh" ? "zh-CN" : "en-US"

// 获取最近7天 Data
const last7Days = Object.entries(stats.byDate).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7)

// 判断Trends
const recentRate = last7Days.length > 0 ? Math.round((last7Days[0][1].completed / last7Days[0][1].total) * 100) : 0
const olderRate = last7Days.length > 1 ? Math.round((last7Days[1][1].completed / last7Days[1][1].total) * 100) : 0

const trend = recentRate > olderRate ? "up" : recentRate < olderRate ? "down" : "stable"

return (<div className="space-y-4">
{/* Main Stats */}
<div className="grid grid-cols-4 gap-4">
<div className="text-center">
<p className="text-[32px] font-semibold text-[#111111]">{stats.completionRate}%</p>
<p className="text-[12px] text-[#6B6B6B]">{t("completionRate")}</p>
<div className="mt-1 flex items-center justify-center gap-1">
{trend === "up" && <EmojiIcon name="TrendingUp" className="size-3 text-[#34c759]" />}
{trend === "down" && <EmojiIcon name="TrendingDown" className="size-3 text-[#ff3b30]" />}
{trend === "stable" && <EmojiIcon name="Minus" className="size-3 text-[#6B6B6B]" />}
<span className={`text-[10px] ${trend === "up" ? "text-[#34c759]" : trend === "down" ? "text-[#ff3b30]" : "text-[#6B6B6B]"}`}>
{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
</span>
</div>
</div>
<div className="text-center">
<p className="text-[32px] font-semibold text-[#111111]">{stats.completedCount}</p>
<p className="text-[12px] text-[#6B6B6B]">{t("completedCount")}</p>
</div>
<div className="text-center">
<p className="text-[32px] font-semibold text-[#111111]">{stats.skippedCount}</p>
<p className="text-[12px] text-[#6B6B6B]">{t("skippedCount")}</p>
</div>
<div className="text-center">
<p className="text-[32px] font-semibold text-[#111111]">{stats.totalTasks}</p>
<p className="text-[12px] text-[#6B6B6B]">{t("totalTasksLabel")}</p>
</div>
</div>

{/* Weekly Chart (Simple) */}
<div className="mt-4">
<p className="mb-2 text-[12px] text-[#6B6B6B]">{t("last7Days")}</p>
<div className="flex items-end gap-1" style={{ height: 60 }}>
{last7Days.reverse().map(([date, data]) => {
const rate = data.total > 0 ? (data.completed / data.total) * 100 : 0
const day = new Date(date).toLocaleDateString(dateLocale, { weekday: "short" })
return (<div key={date} className="flex-1 flex flex-col items-center gap-1">
<div
className="w-full rounded-t bg-[#FF7A59]"
style={{ height: `${rate}%`, minHeight: rate > 0 ? 4 : 0 }}
/>
<span className="text-[10px] text-[#6B6B6B]">{day}</span>
</div>)
})}
</div>
</div>
</div>)
}
