import Link from "next/link"
import { SettingsCard } from "@/components/settings/settings-card"
import { ChevronRight } from "lucide-react"

export default function ContentSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          我的内容
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">管理你发布和收藏的内容</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/followups"
            className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
          >
            <span className="text-[15px] text-[#111111]">我的评价</span>
            <ChevronRight className="size-4 text-[#D2D1CF]" />
          </Link>
          <Link
            href="/dashboard/followups"
            className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
          >
            <span className="text-[15px] text-[#111111]">长期追踪</span>
            <ChevronRight className="size-4 text-[#D2D1CF]" />
          </Link>
          <Link
            href="/dashboard/bookmarks"
            className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
          >
            <span className="text-[15px] text-[#111111]">收藏的产品</span>
            <ChevronRight className="size-4 text-[#D2D1CF]" />
          </Link>
        </div>
      </SettingsCard>
    </div>
  )
}
