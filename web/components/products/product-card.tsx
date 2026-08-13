"use client"

import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"

interface ProductCardProps {
 product: {
 id: string
 name: string
 brand: string
 price_min: number | null
 price_max: number | null
 applicable_species: string
 applicable_age: string
 product_categories?: { name: string; name_en: string | null; slug: string } | null
 }
}

export function ProductCard({ product }: ProductCardProps) {
 const t = useTranslations("Product")
 const locale = useLocale() as string
 const isEn = locale === "en"

 return (<Link
 href={`/products/${product.id}`}
 className="group overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
 >
 {/* Product image placeholder */}
 <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] text-[40px] transition-transform duration-300 group-hover:scale-105">
 🐱
 </div>

 {/* Info section */}
 <div className="p-4">
 <p className="text-[12px] font-medium tracking-wide text-[#9CA3AF]">{product.brand}</p>
 <p className="mt-1 text-[15px] font-semibold leading-snug text-[#1A1A1A] line-clamp-2">
 {product.name}
 </p>

 {/* Tags row */}
 <div className="mt-3 flex flex-wrap items-center gap-1.5">
 <span className="inline-flex items-center rounded-[8px] bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
 {product.applicable_species === "cats"? `🐱 ${t("cat")}`: product.applicable_species === "dogs"? `🐶 ${t("dog")}`: `🐾 ${t("universal")}`}
 </span>
 {product.product_categories && (<span className="inline-flex items-center rounded-[8px] bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#D97706]">
 {isEn && product.product_categories.name_en ? product.product_categories.name_en : product.product_categories.name}
 </span>)}
 </div>

 {/* Price */}
 {product.price_min!= null && (<div className="mt-3 flex items-baseline gap-1">
 <span className="text-[17px] font-bold text-[#F59E0B]">
 ${Number(product.price_min)}
 </span>
 {product.price_max!= null && product.price_max > product.price_min && (<span className="text-[12px] text-[#9CA3AF]">
 - ${Number(product.price_max)}
 </span>)}
 </div>)}
 </div>
 </Link>)
}
