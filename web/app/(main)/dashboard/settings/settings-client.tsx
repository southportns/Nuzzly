"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface SettingsGroup {
  title: string
  items: { label: string; href?: string; external?: boolean }[]
}

const settingsGroups: SettingsGroup[] = [
  {
    title: "账号与资料",
    items: [
      { label: "账号与安全", href: "/dashboard/settings/account" },
      { label: "宠物档案", href: "/dashboard/pets" },
    ],
  },
  {
    title: "会员",
    items: [{ label: "会员", href: "/dashboard/settings/membership" }],
  },
  {
    title: "显示与语言",
    items: [
      { label: "语言", href: "/dashboard/settings/language" },
      { label: "文字大小", href: "/dashboard/settings/fontsize" },
    ],
  },
  {
    title: "基础",
    items: [
      { label: "通知", href: "/dashboard/settings/notification" },
      { label: "通用", href: "/dashboard/settings/general" },
      { label: "隐私", href: "/dashboard/settings/privacy" },
    ],
  },
  {
    title: "内容与社交",
    items: [
      { label: "我的内容", href: "/dashboard/settings/content" },
      { label: "互动设置", href: "/dashboard/settings/interaction" },
    ],
  },
  {
    title: "其他",
    items: [
      { label: "关于我们", href: "/dashboard/settings/about" },
      { label: "帮助与反馈", href: "/dashboard/settings/feedback" },
    ],
  },
]

export default function SettingsClient() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          设置
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">管理你的账号信息与偏好</p>
      </div>

      <div className="space-y-3">
        {settingsGroups.map((group) => (
          <div
            key={group.title}
            className="overflow-hidden rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white"
          >
            <div className="px-4 pb-1 pt-4 text-[13px] font-medium text-[#6B6B6B]">
              {group.title}
            </div>
            <div>
              {group.items.map((item, idx) => {
                const isLast = idx === group.items.length - 1
                const content = (
                  <div
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 transition-colors",
                      !isLast && "border-b border-[rgba(0,0,0,0.04)]",
                      item.href ? "cursor-pointer hover:bg-[#F7F6F3]" : "cursor-pointer hover:bg-[#F7F6F3]"
                    )}
                  >
                    <span className="text-[15px] text-[#111111]">{item.label}</span>
                    <ChevronRight className="size-4 text-[#D2D1CF]" />
                  </div>
                )

                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href}>
                      {content}
                    </Link>
                  )
                }
                return <div key={item.label}>{content}</div>
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-white py-3.5 text-[15px] font-medium text-[#FF3B30] transition-colors hover:bg-[#FF3B30]/5"
      >
        <LogOut className="size-4" />
        退出登录
      </button>
    </div>
  )
}
