"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { deleteDietLog } from "@/lib/supabase/actions/pet-form-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

const foodTypeLabels: Record<string, string> = {
  dry_food: "干粮",
  wet_food: "湿粮/罐头",
  snack: "零食",
  supplement: "保健品",
  homemade: "自制",
  other: "其他",
}

interface DietLog {
  id: string
  food_name: string
  food_type: string | null
  product_id: string | null
  logged_date: string
  notes: string | null
  products?: { name: string; brand: string } | null
}

export function DietLogList({ initialLogs }: { initialLogs: DietLog[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useAuth()

  async function handleDelete(id: string) {
    if (!user) { toast.error("请先登录"); return }
    if (!confirm("确定要删除这条饮食记录吗？")) return

    setDeletingId(id)
    const { error } = await deleteDietLog(id, user.id)
    setDeletingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    setLogs((prev) => prev.filter((log) => log.id !== id))
    toast.success("饮食记录已删除")
    router.refresh()
  }

  if (logs.length === 0) {
    return <p className="text-sm text-[#6B6B6B]">暂无饮食记录</p>
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.06)] p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#111111]">{log.food_name}</span>
              {log.products?.brand && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.products.brand}</Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[#6B6B6B]">
              <span>{foodTypeLabels[log.food_type ?? ""] ?? log.food_type}</span>
              {log.notes && <span className="truncate max-w-[200px]">{log.notes}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#6B6B6B]">
              {new Date(log.logged_date).toLocaleDateString("zh-CN")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-[#D2D1CF] hover:text-[#E85D4A] hover:bg-[#E85D4A]/10"
              onClick={() => handleDelete(log.id)}
              disabled={deletingId === log.id}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
