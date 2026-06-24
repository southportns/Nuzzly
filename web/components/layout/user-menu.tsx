"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { PawPrint, Sparkles, User, LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function UserMenu() {
  const router = useRouter()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpen(true)
  }

  const handleLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    setOpen(false)
    try {
      await signOut()
      router.push("/")
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href="/dashboard"
        className="group relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFB89A] via-[#FF9A7A] to-[#FF7A59] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(255,122,89,0.28)] transition-all hover:scale-[1.03] hover:shadow-[0_6px_18px_rgba(255,122,89,0.38)] active:scale-[0.98]"
        title="我在这儿 · 跳转到个人中心"
      >
        <span className="absolute -left-1 -top-1 inline-flex">
          <Sparkles className="size-3 -rotate-12 text-[#FFD89A] opacity-90 transition-transform group-hover:rotate-0" />
        </span>
        <PawPrint className="size-3.5 transition-transform group-hover:rotate-[-8deg]" />
        <span>我在这儿</span>
        <span className="ml-0.5 inline-block transition-transform group-hover:translate-x-0.5">🐾</span>
      </Link>

      <div
        className={`absolute right-0 top-[calc(100%+10px)] z-50 w-[220px] origin-top-right transition-all duration-150 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
        role="menu"
        aria-hidden={!open}
      >
        <div className="overflow-hidden rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white/95 shadow-[0_10px_36px_rgba(0,0,0,0.12)] backdrop-blur-[16px]">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F7F6F3]"
            role="menuitem"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#FF7A59]/10 text-[#FF7A59] transition-colors group-hover:bg-[#FF7A59]/20">
              <User className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-[13.5px] font-semibold text-[#111111]">进入我的资料</span>
              <span className="text-[11px] text-[#6B6B6B]">查看个人中心、宠物与评价</span>
            </span>
          </Link>

          <div className="mx-3 h-px bg-[#F0EFED]" />

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#ff3b30]/8 disabled:opacity-60"
            role="menuitem"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#F7F6F3] text-[#6B6B6B] transition-colors group-hover:bg-[#ff3b30]/12 group-hover:text-[#ff3b30]">
              {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            </span>
            <span className="flex flex-col">
              <span className="text-[13.5px] font-semibold text-[#111111]">退出登录</span>
              <span className="text-[11px] text-[#6B6B6B]">结束本次会话</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
