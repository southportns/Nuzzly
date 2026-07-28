"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { NuzzlyLogo } from "@/components/ui/nuzzly-logo"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { UserMenu } from "@/components/layout/user-menu"
import { LoginModal } from "@/components/auth/login-modal"
import { useLoginModal } from "@/hooks/use-login-modal"

const leftNavItems = [
  { href: "/", label: "首页" },
  { href: "/ai", label: "AI助手" },
  { href: "/products", label: "产品库" },
]

const rightNavItems = [
  { href: "/about", label: "关于我们" },
  { href: "/protection", label: "保护计划" },
]

export function Header() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useLoginModal()

  return (
    <>
      <header className="fixed top-0 z-50 flex w-full justify-center pt-6" style={{ paddingTop: "calc(24px + var(--safe-top))" }}>

        {/* 胶囊型导航栏 - 毛玻璃效果 + hover上浮 */}
        <nav className="hidden md:flex items-center rounded-full border border-white/25 bg-white/60 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] py-0 w-[90%] max-w-[1700px] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] relative">

          {/* 左侧导航 - flex:1 占40%，按钮均布 */}
          <div className="flex-1 flex items-center justify-between gap-1 px-[30px]">
            <Link
              href="/"
              className={cn(
                "px-5 py-2 w-28 rounded-full text-[15px] font-semibold transition-all no-underline text-center",
                pathname === "/"
                  ? "bg-gradient-to-r from-[#8B5E46] to-[#A67D65] text-white shadow-[0_2px_8px_rgba(139,94,70,0.25)]"
                  : "text-[#6B6B6B] hover:bg-[#8B5E46]/8 hover:text-[#8B5E46]"
              )}
            >
              首页
            </Link>

            <Link
              href="/ai"
              className={cn(
                "px-5 py-2 w-28 rounded-full text-[15px] font-semibold transition-all no-underline text-center",
                pathname.startsWith("/ai")
                  ? "bg-gradient-to-r from-[#8B5E46] to-[#A67D65] text-white shadow-[0_2px_8px_rgba(139,94,70,0.25)]"
                  : "text-[#6B6B6B] hover:bg-[#8B5E46]/8 hover:text-[#8B5E46]"
              )}
            >
              镇长球球
            </Link>

            <Link
              href="/products"
              className={cn(
                "px-5 py-2 w-28 rounded-full text-[15px] font-semibold transition-all no-underline text-center",
                pathname.startsWith("/products")
                  ? "bg-gradient-to-r from-[#8B5E46] to-[#A67D65] text-white shadow-[0_2px_8px_rgba(139,94,70,0.25)]"
                  : "text-[#6B6B6B] hover:bg-[#8B5E46]/8 hover:text-[#8B5E46]"
              )}
            >
              产品库
            </Link>
          </div>

          {/* Logo - 固定宽度，居中，点击进入社区 */}
          <Link href="/community" className="group relative flex items-center justify-center px-6 flex-shrink-0 -ml-[3px] transition-transform duration-200 ease-out hover:-translate-y-1 hover:scale-105" title="进入社区">
            <NuzzlyLogo className="h-16" />
          </Link>

          {/* 右侧导航 - flex:1 占40%，按钮均布 */}
          <div className="flex-1 flex items-center justify-between gap-1 px-[30px]">
            <Link
              href="/about"
              className={cn(
                "px-5 py-2 w-28 rounded-full text-[15px] font-semibold transition-all no-underline text-center",
                pathname.startsWith("/about")
                  ? "bg-gradient-to-r from-[#8B5E46] to-[#A67D65] text-white shadow-[0_2px_8px_rgba(139,94,70,0.25)]"
                  : "text-[#6B6B6B] hover:bg-[#8B5E46]/8 hover:text-[#8B5E46]"
              )}
            >
              关于我们
            </Link>

            <Link
              href="/protection"
              className={cn(
                "px-5 py-2 w-28 rounded-full text-[15px] font-semibold transition-all no-underline text-center",
                pathname.startsWith("/protection")
                  ? "bg-gradient-to-r from-[#8B5E46] to-[#A67D65] text-white shadow-[0_2px_8px_rgba(139,94,70,0.25)]"
                  : "text-[#6B6B6B] hover:bg-[#8B5E46]/8 hover:text-[#8B5E46]"
              )}
            >
              保护计划
            </Link>

            {/* 用户区 - 与"我在这儿"等宽 */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <UserMenu />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="px-6 py-2 w-28 rounded-full text-[15px] font-semibold text-white bg-gradient-to-r from-[#8B5E46] to-[#A67D65] shadow-[0_2px_8px_rgba(139,94,70,0.25)] transition-all hover:shadow-[0_4px_12px_rgba(139,94,70,0.35)] text-center"
              >
                登录
              </button>
            )}
          </div>
        </nav>

        {/* Mobile hamburger */}
        <div className="flex w-full items-center justify-between px-4 md:hidden">
          <Link href="/community" className="flex items-center" title="进入社区">
            <NuzzlyLogo mobile className="h-8" />
          </Link>
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/60 backdrop-blur-lg border border-white/20 text-[#6B6B6B] shadow-sm"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <EmojiIcon name="X" className="size-5" /> : <EmojiIcon name="Menu" className="size-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 pt-20 backdrop-blur-2xl bg-black/10 md:hidden">
          <nav className="mx-4 flex flex-col gap-2 p-3 rounded-[28px] border border-white/20 bg-white/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)]">
            {[...leftNavItems, ...rightNavItems].map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition-all no-underline",
                    isActive
                      ? "bg-gradient-to-r from-[#8B5E46] to-[#A67D65] text-white shadow-[0_4px_12px_rgba(139,94,70,0.3)]"
                      : "text-[#6B6B6B] hover:bg-[#8B5E46]/8 hover:text-[#8B5E46]"
                  )}
                >
                  {item.label}
                </Link>
            )})}
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="mt-2 flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FFB89A] via-[#FF9A7A] to-[#FF7A59] px-6 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(255,122,89,0.3)]"
              >
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{
                    background: "rgba(255, 255, 255, 0.6)",
                    boxShadow: "0 1px 3px rgba(255, 255, 255, 0.3), inset 0 0.5px 1px rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(4px)",
                  }}
                />
                我在这儿 · 个人中心
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  setLoginModalOpen(true)
                }}
                className="mt-2 flex h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#8B5E46] to-[#A67D65] px-6 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(139,94,70,0.3)]"
              >
                登录 / 注册
              </button>
            )}

          </nav>
        </div>
      )}

      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </>
  )
}
