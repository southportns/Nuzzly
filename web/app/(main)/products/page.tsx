import { ProductCard } from "@/components/products/product-card"
import { CategoryFilter } from "@/components/products/category-filter"
import { HotFilter } from "@/components/products/hot-filter"
import { Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense } from "react"
import { queryCategories, queryProducts } from "@/lib/supabase/query"

export const metadata = {
  title: "产品库 — PetRWD",
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; hot?: string }>
}) {
  const sp = await searchParams

  return (
    <div className="bg-[#F7F6F3]">
      <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-12">
        <div className="text-center">
          <h1 className="text-[32px] font-bold leading-[1.1] tracking-normal text-[#111111] md:text-[40px]">
            猫咪产品库
          </h1>
          <p className="mt-3 text-[17px] leading-[1.47] text-[#6B6B6B]">
            专注猫咪消费领域，查看真实长期反馈数据
          </p>
        </div>

        {/* Pill search input */}
        <div className="relative mx-auto mt-8 max-w-[600px]">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            placeholder="搜索猫粮、品牌、成分…"
            className="h-11 w-full rounded-full border border-[rgba(0,0,0,0.06)] bg-white pl-11 pr-4 text-[17px] leading-[1.47] text-[#111111] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(255,122,89,0.15)] focus:border-[#FF7A59]"
          />
        </div>

        <Suspense fallback={<CategoryFilterSkeleton />}>
          <CategoryList />
        </Suspense>

        <HotFilter activeHot={sp.hot} />

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid category={sp.category} hot={sp.hot} />
        </Suspense>
      </div>
    </div>
  )
}

async function CategoryList() {
  const { data: categories } = await queryCategories()
  // Only keep cat-related categories
  const catCategories = (categories ?? []).filter((c) =>
    ["cat-food", "cat-litter", "cat-canned", "cat-snack", "cat-health"].includes(c.slug) ||
    c.name.includes("猫")
  )
  return <CategoryFilter categories={catCategories} />
}

function CategoryFilterSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-16 rounded-full" />
      ))}
    </div>
  )
}

async function ProductGrid({ category }: { category?: string; hot?: string }) {
  const { data: products } = await queryProducts()

  let filtered = category
    ? products?.filter((p) => p.product_categories?.slug === category)
    : products

  // Filter only cat products
  filtered = filtered?.filter((p) =>
    p.applicable_species === "cats" || p.applicable_species === "both"
  )

  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {(filtered ?? []).map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      {filtered && filtered.length === 0 && (
        <div className="col-span-full py-16 text-center">
          <p className="text-[17px] text-[#6B6B6B]">暂无匹配的产品</p>
        </div>
      )}
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-[24px]" />
      ))}
    </div>
  )
}
