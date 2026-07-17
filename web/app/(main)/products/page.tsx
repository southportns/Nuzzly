import { ProductCard } from "@/components/products/product-card"
import { SidebarNav } from "@/components/products/sidebar-nav"
import { Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense } from "react"
import { queryCategories, queryProducts } from "@/lib/supabase/query"

export const metadata = {
  title: "产品库 — Nuzzly毛球镇",
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; hot?: string }>
}) {
  const sp = await searchParams

  return (
    <div className="bg-[#F7F7F5] min-h-screen">
      <div className="mx-auto max-w-[1440px] px-6 pt-[10px] pb-6 md:px-12" style={{ marginTop: "calc(-72px - var(--safe-top) + 10px)" }}>
        {/* Main layout: Sidebar + Content */}
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <aside className="hidden w-[240px] shrink-0 lg:block">
            <div className="sticky top-24 rounded-[16px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  name="q"
                  type="search"
                  aria-label="搜索产品"
                  placeholder="搜索产品、品牌…"
                  className="h-10 w-full rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 text-[14px] leading-normal text-[#1A1A1A] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
                />
              </div>

              <Suspense fallback={<SidebarSkeleton />}>
                <SidebarNavWithData />
              </Suspense>
            </div>
          </aside>

          {/* Main Content */}
          <div className="min-w-0 flex-1 pt-24">
            {/* Mobile search - visible on small screens */}
            <div className="relative mb-6 lg:hidden">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                name="q"
                type="search"
                aria-label="搜索产品"
                placeholder="搜索猫粮、品牌、成分…"
                className="h-11 w-full rounded-full border border-[#E5E7EB] bg-white pl-11 pr-4 text-[15px] leading-normal text-[#1A1A1A] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
              />
            </div>

            {/* Mobile filters - visible on small screens */}
            <div className="mb-6 lg:hidden">
              <Suspense fallback={null}>
                <MobileFilters category={sp.category} hot={sp.hot} />
              </Suspense>
            </div>

            {/* Product Grid */}
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid category={sp.category} hot={sp.hot} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

async function MobileFilters({
  category,
  hot,
}: {
  category?: string
  hot?: string
}) {
  const { data: categories } = await queryCategories()
  const catCategories = (categories ?? []).filter((c) =>
    ["cat-food", "cat-litter", "cat-canned", "cat-snack", "cat-health"].includes(c.slug) ||
    c.name.includes("猫")
  )

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href="/products"
        className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
          !category ? "bg-[#F59E0B] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]"
        }`}
      >
        全部
      </a>
      {catCategories.map((cat) => (
        <a
          key={cat.id}
          href={`/products?category=${cat.slug}`}
          className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
            category === cat.slug ? "bg-[#F59E0B] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]"
          }`}
        >
          {cat.name}
        </a>
      ))}
    </div>
  )
}

async function ProductGrid({ category }: { category?: string; hot?: string }) {
  const { data: products } = await queryProducts()

  let filtered = category
    ? products?.filter((p) => p.product_categories?.slug === category)
    : products

  filtered = filtered?.filter((p) =>
    p.applicable_species === "cats" || p.applicable_species === "both"
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(filtered ?? []).map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      {filtered && filtered.length === 0 && (
        <div className="col-span-full py-20 text-center">
          <div className="text-[48px]">🐱</div>
          <p className="mt-4 text-[17px] font-medium text-[#1A1A1A]">暂无匹配的产品</p>
          <p className="mt-1 text-[14px] text-[#6B7280]">试试调整筛选条件</p>
        </div>
      )}
    </div>
  )
}

async function SidebarNavWithData() {
  const { data: categories } = await queryCategories()
  const catCategories = (categories ?? []).filter((c) =>
    ["cat-food", "cat-litter", "cat-canned", "cat-snack", "cat-health"].includes(c.slug) ||
    c.name.includes("猫")
  )
  return <SidebarNav categories={catCategories} />
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-[12px]" />
      ))}
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-56 rounded-[20px]" />
      ))}
    </div>
  )
}
