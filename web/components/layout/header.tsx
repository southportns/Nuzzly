"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Menu, X, PawPrint, Shield } from "lucide-react"
import { UserMenu } from "@/components/layout/user-menu"

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
  const { user, isAdmin } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 z-50 flex w-full items-center justify-center border-b border-[rgba(0,0,0,0.03)] bg-[#F7F6F3]/[.82] backdrop-blur-[24px]" style={{ paddingTop: "var(--safe-top)", height: "calc(72px + var(--safe-top))" }}>
        {/* Gradient fade bottom edge for soft transition */}
        <div className="pointer-events-none absolute bottom-[-24px] left-0 right-0 h-6 bg-gradient-to-b from-[#F7F6F3]/40 to-transparent" />
        <div className="flex w-full max-w-[1440px] items-center px-6 md:px-12">
          {/* Left section - Navigation */}
          <div className="flex w-1/3 items-center justify-start">
            <nav className="hidden items-center gap-8 md:flex">
              {leftNavItems.map((item) => {
                const isActive = item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-[15px] font-medium leading-none tracking-[-0.01em] transition-colors",
                      isActive
                        ? "text-[#111111]"
                        : "text-[#444444] hover:text-[#111111]"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Center section - Logo */}
          <div className="flex w-1/3 items-center justify-center">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/nuzzly-zuhe.png"
                alt="Nuzzly毛球镇 Logo"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Right section - About + Protection + Login */}
          <div className="flex w-1/3 items-center justify-end gap-8">
            <nav className="hidden items-center gap-8 md:flex">
              {rightNavItems.map((item) => {
                const isActive = item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-[15px] font-medium leading-none tracking-[-0.01em] transition-colors",
                      isActive
                        ? "text-[#111111]"
                        : "text-[#444444] hover:text-[#111111]"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Login module */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="group hidden items-center gap-1.5 rounded-full border border-[#7BA7BC]/30 bg-[#7BA7BC]/8 px-3 py-1.5 text-[12px] font-semibold text-[#4A7A91] transition-all hover:border-[#7BA7BC]/60 hover:bg-[#7BA7BC]/14 md:inline-flex"
                      title="管理员控制台"
                    >
                      <Shield className="size-3.5" />
                      <span>管理</span>
                    </Link>
                  )}
                  <UserMenu />
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-[15px] font-medium text-[#444444] transition-colors hover:text-[#111111]"
                >
                  登录
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="text-[#6B6B6B] md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 pt-[72px] backdrop-blur-[20px] bg-[#F7F7F5]/[.95] md:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4">
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
                    "rounded-2xl px-5 py-4 text-[17px] font-medium transition-colors",
                    isActive
                      ? "bg-white text-[#111111]"
                      : "text-[#6B6B6B] hover:text-[#111111]"
                  )}
                >
                  {item.label}
                </Link>
            )})}
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="mt-4 flex h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FFB89A] via-[#FF9A7A] to-[#FF7A59] px-6 text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(255,122,89,0.3)]"
              >
                <PawPrint className="size-4" />
                我在这儿 · 个人中心
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-4 flex h-[52px] items-center justify-center rounded-full bg-[#FF7A59] px-6 text-[15px] font-semibold text-white"
              >
                登录 / 注册
              </Link>
            )}
            {user && isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="mt-2 flex h-[52px] items-center justify-center gap-2 rounded-full border border-[#7BA7BC]/40 bg-[#7BA7BC]/8 px-6 text-[15px] font-semibold text-[#4A7A91]"
              >
                <Shield className="size-4" />
                管理员控制台
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  )
}
