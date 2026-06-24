"use client"

import { useEffect, useState } from "react"
import { createIntentEvent } from "@/lib/supabase/queries/intent-event-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Clock, Calendar, Check } from "lucide-react"
import { toast } from "sonner"

interface RepurchaseReminderProps {
  petId: string
  userId: string
}

interface DietLog {
  id: string
  food_name: string
  logged_date: string
}

export function RepurchaseReminder({ petId, userId }: RepurchaseReminderProps) {
  const [dietLogs, setDietLogs] = useState<DietLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDietLogs = async () => {
      // Reads remain on the regular client (P1: only mutations migrate)
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data } = await supabase
        .from("diet_logs")
        .select("id, food_name, logged_date")
        .eq("pet_id", petId)
        .order("logged_date", { ascending: false })
        .limit(30)

      if (data) {
        setDietLogs(data as DietLog[])
      }
      setLoading(false)
    }

    fetchDietLogs()
  }, [petId])

  if (loading || dietLogs.length === 0) return null

  // Find most frequently used food
  const foodCount: Record<string, { count: number; lastDate: string }> = {}
  dietLogs.forEach((log) => {
    if (!foodCount[log.food_name]) {
      foodCount[log.food_name] = { count: 0, lastDate: log.logged_date }
    }
    foodCount[log.food_name].count++
    foodCount[log.food_name].lastDate = log.logged_date
  })

  const topFood = Object.entries(foodCount).sort((a, b) => b[1].count - a[1].count)[0]
  if (!topFood) return null

  const [foodName, foodData] = topFood
  const lastDate = new Date(foodData.lastDate)
  const daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  // Assume a bag lasts ~30 days based on feeding frequency
  const estimatedDaysLeft = Math.max(0, 30 - (foodData.count * 2)) // rough estimate
  const needsReminder = estimatedDaysLeft <= 7 || daysSinceLast > 25

  const handleDismiss = async () => {
    try {
      // P1: route through Write Gateway
      const { error } = await createIntentEvent({
        profile_id: userId,
        event_type: "product_view",
        source: "repurchase_reminder",
        metadata: { action: "dismiss_repurchase_reminder", food_name: foodName },
      }, userId)
      if (error) {
        toast.error(error.message || "操作失败")
        return
      }
      toast.success("已关闭提醒")
    } catch {
      toast.error("操作失败")
    }
  }

  if (!needsReminder) return null

  return (
    <Card className="rounded-[16px] border-[#FF9500]/20 bg-[#FF9500]/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-[#FF9500]" />
          补货提醒
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-[12px] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FF9500]/10">
              <Calendar className="size-5 text-[#FF9500]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[#111111]">{foodName}</p>
              <p className="mt-1 text-[13px] text-[#6B6B6B]">
                上次喂食是 <span className="font-medium text-[#111111]">{daysSinceLast}天前</span>，预计余粮不足
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[11px] border-[#FF9500] text-[#FF9500]">
                  <Clock className="mr-1 size-3" />
                  建议补货
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" className="flex-1 rounded-full bg-[#FF9500] text-[13px] text-white hover:bg-[#E88600]">
              去选购
            </Button>
            <Button size="sm" variant="outline" className="rounded-full text-[13px]" onClick={handleDismiss}>
              <Check className="mr-1 size-3.5" />
              已补货
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
