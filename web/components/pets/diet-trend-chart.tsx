"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Utensils } from "lucide-react"

interface DietTrendChartProps {
  petId: string
}

interface DietDataPoint {
  date: string
  food_name: string
  food_type: string
  notes: string | null
}

export function DietTrendChart({ petId }: DietTrendChartProps) {
  const [data, setData] = useState<DietDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDietLogs = async () => {
      const supabase = createClient()
      const { data: logs } = await supabase
        .from("diet_logs")
        .select("logged_date, food_name, food_type, notes")
        .eq("pet_id", petId)
        .order("logged_date", { ascending: true })
        .limit(30)

      if (logs) {
        setData(logs.map((l) => ({ ...l, date: l.logged_date })) as DietDataPoint[])
      }
      setLoading(false)
    }

    fetchDietLogs()
  }, [petId])

  if (loading) {
    return (
      <div className="rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="h-40 animate-pulse rounded-[12px] bg-[#F7F6F3]" />
      </div>
    )
  }

  if (data.length === 0) {
    return null
  }

  // Food type distribution
  const foodTypeCount: Record<string, number> = {}
  data.forEach((d) => {
    foodTypeCount[d.food_type] = (foodTypeCount[d.food_type] ?? 0) + 1
  })
  const topFood = Object.entries(foodTypeCount).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <Card className="rounded-[16px] border-[rgba(0,0,0,0.05)] bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Utensils className="size-4 text-[#FF7A59]" />
          饮食趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Food Type Distribution */}
        <div>
          <p className="mb-2 text-[12px] text-[#6B6B6B]">主食分布</p>
          <div className="space-y-2">
            {topFood.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="w-16 text-[12px] text-[#6B6B6B]">{type}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-[#F0EFED]">
                  <div
                    className="h-2 rounded-full bg-[#FF7A59] transition-all"
                    style={{ width: `${(count / data.length) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[12px] text-[#6B6B6B]">{count}次</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Foods */}
        <div className="mt-4">
          <p className="mb-2 text-[12px] text-[#6B6B6B]">最近喂食</p>
          <div className="flex flex-wrap gap-1.5">
            {data.slice(-5).reverse().map((d, i) => (
              <span key={i} className="rounded-full bg-[#F7F6F3] px-2.5 py-1 text-[11px] text-[#6B6B6B]">
                {d.food_name}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
