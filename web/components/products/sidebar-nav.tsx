"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useTranslations, useLocale } from "next-intl"

const OrangeCircle = ({ className }: { className?: string }) => (<img
alt="orange circle"
width="14"
height="14"
className={cn("inline-block object-contain align-text-bottom shrink-0 drop-shadow-[0_1px_2px_rgba(255,122,89,0.3)]", className)}
loading="lazy"
src="/fluentui-emoji/assets/Orange circle/3D/orange_circle_3d.png"
/>)

const hotFilterKeys = [
{ slug: "high-repurchase", key: "highRepurchase" },
{ slug: "low-dispute", key: "lowDispute" },
{ slug: "stomach-friendly", key: "stomachFriendly" },
{ slug: "kitten", key: "kittenSuitable" },
{ slug: "long-term", key: "longTermAcclaim" },
{ slug: "cost-effective", key: "costEffective" },
] as const

interface Category {
id: string
name: string
name_en?: string | null
slug: string
}

export function SidebarNav({ categories }: { categories?: Category[] }) {
const searchParams = useSearchParams()
const pathname = usePathname()
const router = useRouter()
const t = useTranslations("Product")
const locale = useLocale() as string
const isEn = locale === "en"
const activeCategory = searchParams.get("category")
const activeHot = searchParams.get("hot")
const [expanded, setExpanded] = useState(!!activeCategory)

function setParam(key: string, value: string | null) {
const params = new URLSearchParams(searchParams)
if (value) {
params.set(key, value)
} else {
params.delete(key)
}
router.push(`${pathname}?${params.toString()}`)
}

const hasActiveSubCategory = categories?.some((cat) => activeCategory === cat.slug && cat.slug !== "small-pet-food" && cat.slug !== "pee-pads")

return (<nav className="space-y-6">
{/* Categories Section */}
<div>
<div className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-3.5">
<g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)">
<polygon points="10.5 14.75 7.5 16.25 7.5 9 2.75 2.75 15.25 2.75 10.5 9 10.5 14.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</g>
</svg>
{t("productCategory")}
</div>
<div className="space-y-1">
{/* AllProduct - aCategory */}
<button
type="button"
onClick={() => {
setExpanded(!expanded)
if (!expanded &&!hasActiveSubCategory) {
setParam("category", null)
}
}}
className={cn("flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition-all",!activeCategory || hasActiveSubCategory? "bg-[#F59E0B]/10 text-[#D97706] shadow-[inset_0_0_0_1.5px_rgba(245,158,11,0.3)]": "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]")}
>
<span className={cn("flex size-7 items-center justify-center rounded-[8px]",!activeCategory || hasActiveSubCategory? "bg-[#F59E0B]/20": "")}>
<OrangeCircle className="mt-0.5" />
</span>
<span className="flex-1 text-left">{t("allProducts")}</span>
<svg
xmlns="http://www.w3.org/2000/svg"
width="16"
height="16"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2"
strokeLinecap="round"
strokeLinejoin="round"
className={cn("transition-transform duration-200",
expanded && "rotate-180")}
>
<path d="m6 9 6 6 6-6" />
</svg>
</button>

{/* Category - canCollapse */}
<div
className={cn("overflow-hidden transition-all duration-300 ease-in-out",
expanded? "max-h-[500px] opacity-100": "max-h-0 opacity-0")}
>
<div className="pl-4 pt-1 space-y-1">
{categories?.filter((cat) => cat.slug !== "small-pet-food" && cat.slug !== "pee-pads").map((cat) => (<button
key={cat.id}
type="button"
onClick={() => setParam("category", cat.slug)}
className={cn("flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all",
activeCategory === cat.slug? "bg-[#F59E0B]/10 text-[#D97706]": "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]")}
>
<span className="size-1.5 rounded-full bg-[#D97706]/40" />
{isEn && cat.name_en ? cat.name_en : cat.name}
</button>))}
</div>
</div>
</div>
</div>

{/* Divider */}
<div className="border-t border-[#E5E7EB]" />

{/* Hot Filters Section */}
<div>
<div className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-3.5">
<g data-transform-wrapper="on">
<path d="m2.25,4.25h5.586c.265,0,.52.105.707.293l5.1065,5.1065c.781.781.781,2.047,0,2.828l-3.172,3.172c-.781.781-2.047.781-2.828,0l-5.1065-5.1065c-.188-.188-.293-.442-.293-.707v-5.586Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<path d="m3.75,1.25h5.586c.265,0,.52.105.707.293l5.7705,5.7705" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
<circle cx="5.75" cy="7.75" r="1.25" fill="currentColor" strokeWidth="0" data-color="color-2" />
</g>
</svg>
{t("hotFilter")}
</div>
<div className="space-y-1">
{hotFilterKeys.map((f) => {
const isActive = activeHot === f.slug
return (<button
key={f.slug}
type="button"
onClick={() => setParam("hot", isActive? null: f.slug)}
className={cn("flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition-all",
isActive? "bg-[#FEF3C7] text-[#D97706] shadow-[inset_0_0_0_1.5px_rgba(245,158,11,0.3)]": "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]")}
>
<span className={cn("flex size-7 items-center justify-center rounded-[8px]",
isActive? "bg-[#F59E0B]/20": "")}>
<OrangeCircle className="mt-0.5" />
</span>
{t(f.key)}
</button>)
})}
</div>
</div>
</nav>)
}
