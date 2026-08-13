import { redirect } from "next/navigation"
import { EmojiIcon } from "@/components/ui/emoji-icon"
import { getUser, queryNotifications } from "@/lib/supabase/query"
import { NotificationList } from "@/components/notifications/notification-list"
import { getTranslations } from "next-intl/server"

export const metadata = {
  title: "Notifications — Nuzzly Town",
}

export default async function NotificationsPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const t = await getTranslations("Notifications")

  const { data: notifications } = await queryNotifications(user.id, 50)
  const unread = notifications?.filter((n) => !n.is_read).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
            {t("title")}
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">
            {unread > 0 ? t("unread", { count: unread }) : t("allRead")}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[12px] text-[#6B6B6B]">
          {t("total", { count: notifications?.length ?? 0 })}
        </span>
      </div>

      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <EmojiIcon name="Bell" className="size-4 text-[#FF7A59]" />
          <span className="text-[15px] font-semibold text-[#111111]">{t("allNotifications")}</span>
        </div>
        {notifications && notifications.length > 0 ? (
          <NotificationList initialNotifications={notifications} />
        ) : (
          <div className="py-12 text-center">
            <EmojiIcon name="Bell" className="mx-auto size-8 text-[#D2D1CF]" />
            <p className="mt-3 text-[14px] text-[#6B6B6B]">{t("noNotifications")}</p>
          </div>
        )}
      </section>
    </div>
  )
}
