"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
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
        <span>我在这儿</span>
        <span
          className="ml-1 inline-block size-2.5 rounded-full transition-transform group-hover:translate-x-0.5"
          style={{
            background: "rgba(255, 255, 255, 0.6)",
            boxShadow: "0 1px 3px rgba(255, 255, 255, 0.3), inset 0 0.5px 1px rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(4px)",
          }}
        />
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
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-4">
                <circle cx="9" cy="4.5" r="2.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
                <path d="M13.762,15.516c.86-.271,1.312-1.221,.947-2.045-.97-2.191-3.159-3.721-5.709-3.721s-4.739,1.53-5.709,3.721c-.365,.825,.087,1.774,.947,2.045,1.225,.386,2.846,.734,4.762,.734s3.537-.348,4.762-.734Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
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
              {signingOut ? (
                <EmojiIcon name="Loader2" className="size-4 animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-4">
                  <path d="M11.75,5.75V3.25c0-.552-.448-1-1-1H4.25c-.552,0-1,.448-1,1V14.75c0,.552,.448,1,1,1h6.5c.552,0,1-.448,1-1v-2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  <polyline points="14.5 6.25 17.25 9 14.5 11.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
                  <line x1="17.25" y1="9" x2="11.25" y2="9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
                  <path d="M3.457,2.648l3.321,2.059c.294,.182,.473,.504,.473,.85v6.887c0,.346-.179,.667-.473,.85l-3.322,2.06" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              )}
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
