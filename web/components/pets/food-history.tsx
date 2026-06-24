"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Utensils } from "lucide-react"

interface FoodHistoryProps {
  petId: string
}

interface DietEntry {
  id: string
  food_name: string
  food_type: string | null
  product_id: string | null
  notes: string | null
  logged_date: string
  products?: { name: string; brand: string; image_url: string | null } | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const foodTypeLabels: Record<string, string> = {
  dry_food: "干粮",
  wet_food: "湿粮/罐头",
  snack: "零食",
  supplement: "保健品",
  homemade: "自制",
  other: "其他",
}

export function FoodHistory({ petId }: FoodHistoryProps) {
  const [entries, setEntries] = useState<DietEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadHistory() {
      setLoading(true)
      const { data } = await supabase
        .from("diet_logs")
        .select("id, food_name, food_type, product_id, notes, logged_date, products(name, brand, image_url)")
        .eq("pet_id", petId)
        .order("logged_date", { ascending: false })
      setEntries(data || [])
      setLoading(false)
    }
    loadHistory()
  }, [petId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Group by product to show usage history
  const productMap = new Map<string, { name: string; brand: string; image_url: string | null; dates: string[]; entries: DietEntry[] }>()
  const noProductEntries: DietEntry[] = []

  for (const entry of entries) {
    if (entry.product_id) {
      const key = entry.product_id
      const existing = productMap.get(key)
      const prod = entry.products
      if (existing) {
        existing.dates.push(entry.logged_date)
        existing.entries.push(entry)
      } else {
        productMap.set(key, {
          name: prod?.name ?? entry.food_name,
          brand: prod?.brand ?? "",
          image_url: prod?.image_url ?? null,
          dates: [entry.logged_date],
          entries: [entry],
        })
      }
    } else {
      noProductEntries.push(entry)
    }
  }

  const sortedProducts = Array.from(productMap.values()).sort((a, b) => {
    const aLatest = a.dates.sort().reverse()[0]
    const bLatest = b.dates.sort().reverse()[0]
    return bLatest.localeCompare(aLatest)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            食品使用历史
          </span>
          <Badge variant="outline">{sortedProducts.length + (noProductEntries.length > 0 ? 1 : 0)} 款产品</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Products with product_id */}
        {sortedProducts.length > 0 && (
          <div className="space-y-3">
            {sortedProducts.map((prod, idx) => {
              const sortedDates = [...prod.dates].sort()
              const firstDate = sortedDates[0]
              const lastDate = sortedDates[sortedDates.length - 1]
              const isCurrent = lastDate === entries[0]?.logged_date && idx === 0

              const start = new Date(firstDate)
              const end = new Date(lastDate)
              const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
              const duration = diffDays < 30 ? `${diffDays + 1}天` : diffDays < 365 ? `${Math.floor(diffDays / 30)}个月` : `${Math.floor(diffDays / 365)}年`

              return (
                <div key={prod.name + firstDate} className={`flex items-start gap-3 p-3 rounded-lg ${isCurrent ? "bg-green-50 border border-green-200" : "bg-muted/50"}`}>
                  {isCurrent && <Badge className="bg-green-500 shrink-0 mt-0.5">当前</Badge>}
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="w-10 h-10 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                      <Utensils className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{prod.name}</h4>
                    {prod.brand && (
                      <p className="text-xs text-muted-foreground">{prod.brand}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(firstDate)} - {formatDate(lastDate)} · {duration} · {prod.entries.length}次记录
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Entries without product_id (e.g. homemade) */}
        {noProductEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">其他饮食记录</h4>
            {noProductEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                  <Utensils className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{entry.food_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {foodTypeLabels[entry.food_type ?? ""] ?? entry.food_type} · {formatDate(entry.logged_date)}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {entries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Utensils className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无食品使用记录</p>
            <p className="text-sm mt-1">记录宠物的饮食信息，追踪长期效果</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
