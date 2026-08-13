"use client"

import { EmojiIcon, emojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export function SidebarNav() {
  const pathname = usePathname()
  const t = useTranslations("Nav")

  const mainItems = [
    { href: "/", label: t("home"), icon: emojiIcon("Home") },
    { href: "/products", label: t("products"), icon: emojiIcon("Search") },
    { href: "/products/review", label: t("publish"), icon: emojiIcon("PlusCircle") },
    { href: "/ai", label: t("aiAssistant"), icon: emojiIcon("Sparkles") },
  ]

  const secondaryItems = [
    { href: "/dashboard", label: t("dashboard"), icon: emojiIcon("User") },
  ]

  return (<aside className="hidden w-56 shrink-0 border-r border-border/40 bg-background/60 md:flex md:flex-col">
  {/* Logo */}
  <div className="flex h-14 items-center gap-2.5 border-b border-border/40 px-5">
  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20">
  <EmojiIcon name="ShieldCheck" className="size-4 text-primary" />
  </div>
  <span className="font-semibold tracking-tight">Nuzzly</span>
  </div>

  {/* Main nav */}
  <nav className="flex-1 space-y-0.5 px-3 py-4">
  {mainItems.map((item) => {
  const isActive = item.href === "/"? pathname === "/": pathname.startsWith(item.href)
  return (<Link
  key={item.href}
  href={item.href}
  className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
  isActive? "bg-primary/10 text-primary": "text-muted-foreground hover:bg-muted hover:text-foreground")}
  >
  <item.icon className="size-4" />
  {item.label}
  </Link>)
  })}
  </nav>

  {/* Secondary nav */}
  <div className="border-t border-border/40 px-3 py-3">
  {secondaryItems.map((item) => {
  const isActive = pathname.startsWith(item.href)
  return (<Link
  key={item.href}
  href={item.href}
  className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
  isActive? "bg-primary/10 text-primary": "text-muted-foreground hover:bg-muted hover:text-foreground")}
  >
  <item.icon className="size-4" />
  {item.label}
  </Link>)
  })}
  </div>
  </aside>)
}
