"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldCheck, TrendingUp } from "lucide-react"

interface ProductRow {
  id: string; name: string; brand: string; price_max: number | null
  applicable_species: string; applicable_age: string
}

export function RecommendedSection() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from("products").select("id,name,brand,price_max,applicable_species,applicable_age")
      .eq("is_active", true).order("created_at", { ascending: false }).limit(4)
      .then(({ data }) => {
        setProducts((data ?? []) as unknown as ProductRow[])
        setLoading(false)
      })
  }, [])

  if (loading) return <ProductGridSkeleton />

  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-semibold">
            <TrendingUp className="size-5 text-primary" />
            社区热门产品
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">基于社区真实长期反馈的综合推荐</p>
        </div>
        <Link href="/products" className="text-sm text-primary hover:underline">全部产品 →</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`}>
            <Card className="group h-full cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.brand}</p>
                  </div>
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {p.applicable_species === "cats" ? "猫咪" : p.applicable_species === "dogs" ? "狗狗" : "通用"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">{p.applicable_age === "all" ? "全年龄" : p.applicable_age === "kitten" ? "幼年" : "成年"}</Badge>
                </div>
                {p.price_max && <p className="text-sm font-medium">¥{Number(p.price_max)}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ProductGridSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <Skeleton className="h-7 w-40 mb-2" />
      <Skeleton className="h-4 w-60 mb-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </div>
    </section>
  )
}
