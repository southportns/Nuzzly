"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Bell,
  Clock,
  Heart,
  ThumbsUp,
  Settings,
  PawPrint,
  ChevronRight,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "我的概览", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/notifications", label: "通知中心", icon: Bell },
  { href: "/dashboard/pets", label: "我的宠物", icon: PawPrint },
  { href: "/dashboard/followups", label: "长期追踪", icon: Clock },
  { href: "/dashboard/bookmarks", label: "我的收藏", icon: Heart },
  { href: "/dashboard/recommendations", label: "推荐反馈", icon: ThumbsUp },
  { href: "/dashboard/settings", label: "账号设置", icon: Settings },
]

interface DashboardSidebarProps {
  displayName: string
  username: string
  trustScore: number
  email?: string | null
}

export function DashboardSidebar({ displayName, username, trustScore, email }: DashboardSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="sticky top-[88px] hidden h-fit w-[244px] shrink-0 md:block">
      {/* Profile header card (white on background) */}
      <div className="overflow-hidden rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white">
        <div className="bg-gradient-to-br from-[#FFE4D2] via-[#FFD2BC] to-[#FFB89A] px-5 pb-12 pt-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-white/95 text-[16px] font-bold text-[#FF7A59] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            {(displayName || username || email || "U").charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-3 truncate text-[15px] font-semibold text-[#111111]">
            {displayName || username || "PetRWD 用户"}
          </h2>
          {email ? (
            <p className="mt-0.5 truncate text-[11.5px] text-[#6B6B6B]">{email}</p>
          ) : username ? (
            <p className="mt-0.5 truncate text-[11.5px] text-[#6B6B6B]">@{username}</p>
          ) : null}
        </div>
        <div className="-mt-8 mx-4 mb-4 rounded-[14px] border border-[rgba(0,0,0,0.05)] bg-white px-3.5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#6B6B6B]">信任分</span>
            <span className="text-[18px] font-bold leading-none text-[#FF7A59]">{trustScore}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0EFED]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFB89A] to-[#FF7A59] transition-all"
              style={{ width: `${Math.max(0, Math.min(100, trustScore))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Nav (white on background) */}
      <nav className="mt-4 rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-2">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[13.5px] font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-[#FFB89A]/14 to-[#FF7A59]/14 text-[#111111] shadow-[inset_0_0_0_1px_rgba(255,122,89,0.18)]"
                  : "text-[#444444] hover:bg-[#F7F6F3] hover:text-[#111111]"
              )}
            >
              <span className="flex items-center gap-2.5">
                <item.icon
                  className={cn(
                    "size-4 transition-colors",
                    active ? "text-[#FF7A59]" : "text-[#6B6B6B] group-hover:text-[#111111]"
                  )}
                />
                {item.label}
              </span>
              <ChevronRight
                className={cn(
                  "size-3.5 transition-all",
                  active ? "translate-x-0.5 text-[#FF7A59] opacity-100" : "text-[#D2D1CF] opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100"
                )}
              />
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function DashboardMobileNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="sticky top-[72px] z-30 -mx-6 mb-4 flex w-[calc(100%+3rem)] gap-1 overflow-x-auto border-b border-[rgba(0,0,0,0.05)] bg-[#F7F6F3]/80 px-6 py-2 backdrop-blur md:hidden">
      {navItems.map((item) => {
        const active = isActive(item.href, item.exact)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              active
                ? "bg-[#FF7A59]/12 text-[#111111]"
                : "text-[#6B6B6B] hover:bg-white hover:text-[#111111]"
            )}
          >
            <item.icon className={cn("size-3.5", active ? "text-[#FF7A59]" : "")} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
