import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"

export const metadata = {
  title: "健康管理 — Nuzzly毛球镇",
}

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="mb-5">
          <span className="text-[18px] font-semibold text-[#111111]">健康管理</span>
          <p className="mt-1 text-[13px] text-[#6B6B6B]">管理宠物的日常健康任务和医疗记录</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link href="/dashboard/daily-tasks" className="flex flex-col items-center gap-3 rounded-[16px] bg-[#F7F6F3] p-6 transition-colors hover:bg-[#F0EFED]">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#FF7A59]/10">
              <EmojiIcon name="CheckSquare" className="size-6 text-[#FF7A59]" />
            </div>
            <span className="text-[13px] font-medium text-[#111111]">每日任务</span>
          </Link>
          <Link href="/dashboard/health/diseases" className="flex flex-col items-center gap-3 rounded-[16px] bg-[#F7F6F3] p-6 transition-colors hover:bg-[#F0EFED]">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#ff9500]/10">
              <EmojiIcon name="Activity" className="size-6 text-[#ff9500]" />
            </div>
            <span className="text-[13px] font-medium text-[#111111]">疾病记录</span>
          </Link>
          <Link href="/dashboard/health/medications" className="flex flex-col items-center gap-3 rounded-[16px] bg-[#F7F6F3] p-6 transition-colors hover:bg-[#F0EFED]">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#007AFF]/10">
              <EmojiIcon name="Pill" className="size-6 text-[#007AFF]" />
            </div>
            <span className="text-[13px] font-medium text-[#111111]">用药记录</span>
          </Link>
          <Link href="/dashboard/health/events" className="flex flex-col items-center gap-3 rounded-[16px] bg-[#F7F6F3] p-6 transition-colors hover:bg-[#F0EFED]">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#34c759]/10">
              <EmojiIcon name="Calendar" className="size-6 text-[#34c759]" />
            </div>
            <span className="text-[13px] font-medium text-[#111111]">宠物事件</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
