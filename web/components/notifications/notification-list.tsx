"use client"

import { EmojiIcon, emojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { markNotificationRead } from "@/lib/supabase/queries/notification-queries"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"

interface Notification {
 id: string
 title: string
 body: string | null
 type: string
 action_url: string | null
 is_read: boolean
 created_at: string
}

const typeConfig: Record<string, { icon: ReturnType<typeof emojiIcon>; color: string }> = {
 followup_reminder: { icon: emojiIcon("Clock"), color: "text-[#FF7A59]" },
 followup_overdue: { icon: emojiIcon("AlertTriangle"), color: "text-[#E85D4A]" },
 review_published: { icon: emojiIcon("CheckCircle"), color: "text-[#A8C5A0]" },
 trust_score_change: { icon: emojiIcon("ShieldCheck"), color: "text-[#7BA7BC]" },
}

export function NotificationList({ initialNotifications }: { initialNotifications: Notification[] }) {
 const [notifications, setNotifications] = useState(initialNotifications)
 const router = useRouter()
 const { user } = useAuth()
 const t = useTranslations("Notifications")
 const locale = useLocale() as string

 async function markAsRead(id: string, actionUrl: string | null) {
 // Optimistic UI: mark read first
 setNotifications((prev) =>
 prev.map((n) => (n.id === id? {...n, is_read: true }: n)))
 // P1: route through Write Gateway (MARK_NOTIFICATION_READ)
 await markNotificationRead(id, user?.id?? "self")
 if (actionUrl) router.push(actionUrl)
 }

 if (notifications.length === 0) {
 return (<div className="py-12 text-center">
 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 18 18" className="mx-auto text-[#D2D1CF]">
 <path d="M15.75 12.75C14.645 12.75 13.75 11.855 13.75 10.75V6.5C13.75 3.877 11.623 1.75 9 1.75C6.377 1.75 4.25 3.877 4.25 6.5V10.75C4.25 11.855 3.355 12.75 2.25 12.75H15.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
 <path d="M10.5 15.3843C10.2005 15.9018 9.6409 16.25 9 16.25C8.3591 16.25 7.7995 15.9018 7.5 15.3843" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
 </svg>
 <p className="mt-3 text-[14px] text-[#6B6B6B]">{t("noNotifications")}</p>
 </div>)
 }

 return (<div className="space-y-2">
 {notifications.map((n) => {
 const config = typeConfig[n.type]?? typeConfig.followup_reminder
 const Icon = config.icon
 return (<button
 key={n.id}
 type="button"
 onClick={() => markAsRead(n.id, n.action_url)}
 className={cn("flex w-full items-start gap-3 rounded-[12px] p-4 text-left transition-colors",
 n.is_read? "bg-[#F0EFED]": "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]")}
 >
 <div className={cn("mt-0.5 shrink-0", config.color)}>
 <Icon className="size-4" />
 </div>
 <div className="flex-1 min-w-0">
 <p className={cn("text-[14px] truncate",
 n.is_read? "font-normal text-[#6B6B6B]": "font-semibold text-[#111111]")}>
 {n.title}
 </p>
 {n.body && (<p className="mt-0.5 text-[13px] text-[#6B6B6B] line-clamp-2">{n.body}</p>)}
 <p className="mt-1 text-[11px] text-[#D2D1CF]">
{new Date(n.created_at).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}{" "}
{new Date(n.created_at).toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
 </p>
 </div>
 {!n.is_read && (<div className="mt-1.5 size-2 shrink-0 rounded-full bg-[#FF7A59]" />)}
 </button>)
 })}
 </div>)
}
