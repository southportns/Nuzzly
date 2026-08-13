"use client"

import { emojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations("Nav")

  const tabs = [
    { href: "/", label: t("home"), icon: emojiIcon("Home") },
    { href: "/products", label: t("products"), icon: emojiIcon("Search") },
    { href: "/products/review", label: t("publish"), icon: emojiIcon("PlusCircle") },
    { href: "/ai", label: t("aiAssistant"), icon: emojiIcon("Sparkles") },
    { href: "/dashboard", label: t("my"), icon: emojiIcon("User") },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl md:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="size-5" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
