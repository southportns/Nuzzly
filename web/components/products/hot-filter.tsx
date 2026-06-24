"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { TrendingUp, ShieldCheck, Heart, Baby, Clock, Sparkles } from "lucide-react"

const hotFilters = [
  { slug: "high-repurchase", label: "高复购", icon: TrendingUp },
  { slug: "low-dispute", label: "低争议", icon: ShieldCheck },
  { slug: "stomach-friendly", label: "肠胃友好", icon: Heart },
  { slug: "kitten", label: "幼猫适用", icon: Baby },
  { slug: "long-term", label: "长期好评", icon: Clock },
  { slug: "cost-effective", label: "高性价比", icon: Sparkles },
]

export function HotFilter({ activeHot }: { activeHot?: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  function setHot(slug: string | null) {
    const params = new URLSearchParams(searchParams)
    if (slug) {
      params.set("hot", slug)
    } else {
      params.delete("hot")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 text-[13px] font-medium text-[#6B6B6B]">热门筛选</span>
      {hotFilters.map((f) => {
        const Icon = f.icon
        const isActive = activeHot === f.slug
        return (
          <button
            key={f.slug}
            type="button"
            onClick={() => setHot(isActive ? null : f.slug)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all",
              isActive
                ? "bg-[#FF7A59] text-white shadow-[0_4px_12px_rgba(255,122,89,0.25)]"
                : "bg-white text-[#6B6B6B] border border-[rgba(0,0,0,0.06)] hover:border-[#FF7A59]/30 hover:text-[#FF7A59]"
            )}
          >
            <Icon className="size-3.5" />
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
