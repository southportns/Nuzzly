"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  ShieldCheck,
  Heart,
  Baby,
  Clock,
  Sparkles,
  LayoutGrid,
  Tag,
} from "lucide-react"

const hotFilters = [
  { slug: "high-repurchase", label: "高复购", icon: TrendingUp },
  { slug: "low-dispute", label: "低争议", icon: ShieldCheck },
  { slug: "stomach-friendly", label: "肠胃友好", icon: Heart },
  { slug: "kitten", label: "幼猫适用", icon: Baby },
  { slug: "long-term", label: "长期好评", icon: Clock },
  { slug: "cost-effective", label: "高性价比", icon: Sparkles },
]

interface Category {
  id: string
  name: string
  slug: string
}

export function SidebarNav({ categories }: { categories?: Category[] }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const activeCategory = searchParams.get("category")
  const activeHot = searchParams.get("hot")

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <nav className="space-y-6">
      {/* Categories Section */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          <LayoutGrid className="size-3.5" />
          产品分类
        </div>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setParam("category", null)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition-all",
              !activeCategory
                ? "bg-[#F59E0B]/10 text-[#D97706] shadow-[inset_0_0_0_1.5px_rgba(245,158,11,0.3)]"
                : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
            )}
          >
            <span className={cn(
              "flex size-7 items-center justify-center rounded-[8px] text-[14px]",
              !activeCategory ? "bg-[#F59E0B]/20" : "bg-[#F3F4F6]"
            )}>
              📦
            </span>
            全部产品
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setParam("category", cat.slug)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition-all",
                activeCategory === cat.slug
                  ? "bg-[#F59E0B]/10 text-[#D97706] shadow-[inset_0_0_0_1.5px_rgba(245,158,11,0.3)]"
                  : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
              )}
            >
              <span className={cn(
                "flex size-7 items-center justify-center rounded-[8px] text-[14px]",
                activeCategory === cat.slug ? "bg-[#F59E0B]/20" : "bg-[#F3F4F6]"
              )}>
                {getCategoryIcon(cat.slug)}
              </span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E5E7EB]" />

      {/* Hot Filters Section */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          <Tag className="size-3.5" />
          热门筛选
        </div>
        <div className="space-y-1.5">
          {hotFilters.map((f) => {
            const Icon = f.icon
            const isActive = activeHot === f.slug
            return (
              <button
                key={f.slug}
                type="button"
                onClick={() => setParam("hot", isActive ? null : f.slug)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition-all",
                  isActive
                    ? "bg-[#FEF3C7] text-[#D97706] shadow-[inset_0_0_0_1.5px_rgba(245,158,11,0.3)]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
                )}
              >
                <span className={cn(
                  "flex size-7 items-center justify-center rounded-[8px]",
                  isActive ? "bg-[#F59E0B]/20" : "bg-[#F3F4F6]"
                )}>
                  <Icon className="size-3.5" />
                </span>
                {f.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

function getCategoryIcon(slug: string): string {
  const icons: Record<string, string> = {
    "cat-food": "🍚",
    "cat-litter": "🧹",
    "cat-canned": "🥫",
    "cat-snack": "🍖",
    "cat-health": "💊",
  }
  return icons[slug] || "📦"
}
