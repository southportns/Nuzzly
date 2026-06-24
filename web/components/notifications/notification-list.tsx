"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { markNotificationRead } from "@/lib/supabase/queries/notification-queries"
import { useAuth } from "@/hooks/use-auth"
import { Bell, Clock, AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  body: string | null
  type: string
  action_url: string | null
  is_read: boolean
  created_at: string
}

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  followup_reminder: { icon: Clock, color: "text-[#FF7A59]" },
  followup_overdue: { icon: AlertTriangle, color: "text-[#E85D4A]" },
  review_published: { icon: CheckCircle, color: "text-[#A8C5A0]" },
  trust_score_change: { icon: ShieldCheck, color: "text-[#7BA7BC]" },
}

export function NotificationList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const router = useRouter()
  const { user } = useAuth()

  async function markAsRead(id: string, actionUrl: string | null) {
    // Optimistic UI: mark read first
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    // P1: route through Write Gateway (MARK_NOTIFICATION_READ)
    await markNotificationRead(id, user?.id ?? "self")
    if (actionUrl) router.push(actionUrl)
  }

  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <Bell className="mx-auto size-8 text-[#D2D1CF]" />
        <p className="mt-3 text-[14px] text-[#6B6B6B]">暂无通知</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const config = typeConfig[n.type] ?? typeConfig.followup_reminder
        const Icon = config.icon
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => markAsRead(n.id, n.action_url)}
            className={cn(
              "flex w-full items-start gap-3 rounded-[12px] p-4 text-left transition-colors",
              n.is_read
                ? "bg-[#F0EFED]"
                : "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            )}
          >
            <div className={cn("mt-0.5 shrink-0", config.color)}>
              <Icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[14px] truncate",
                n.is_read ? "font-normal text-[#6B6B6B]" : "font-semibold text-[#111111]"
              )}>
                {n.title}
              </p>
              {n.body && (
                <p className="mt-0.5 text-[13px] text-[#6B6B6B] line-clamp-2">{n.body}</p>
              )}
              <p className="mt-1 text-[11px] text-[#D2D1CF]">
                {new Date(n.created_at).toLocaleDateString("zh-CN")}{" "}
                {new Date(n.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {!n.is_read && (
              <div className="mt-1.5 size-2 shrink-0 rounded-full bg-[#FF7A59]" />
            )}
          </button>
        )
      })}
    </div>
  )
}
