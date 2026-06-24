"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  slug: string
}

export function CategoryFilter({ categories }: { categories: Category[] }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const activeCategory = searchParams.get("category")

  function setCategory(slug: string | null) {
    const params = new URLSearchParams(searchParams)
    if (slug) {
      params.set("category", slug)
    } else {
      params.delete("category")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={() => setCategory(null)}
        className={cn(
          "rounded-full px-4 py-1.5 text-[14px] font-normal transition-colors",
          !activeCategory
            ? "bg-[#111111] text-white"
            : "bg-[#F0EFED] text-[#111111] hover:bg-[#E5E4E2]"
        )}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => setCategory(cat.slug)}
          className={cn(
            "rounded-full px-4 py-1.5 text-[14px] font-normal transition-colors",
            activeCategory === cat.slug
              ? "bg-[#111111] text-white"
              : "bg-[#F0EFED] text-[#111111] hover:bg-[#E5E4E2]"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
