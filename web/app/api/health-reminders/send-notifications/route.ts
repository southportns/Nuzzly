// =============================================
// Cron Endpoint: SendDue a天 Vaccine/DewormingReminderNotifications
// =============================================
// 由 部 cron 服务Daily调use a次(Advice UTC 00:00 / 北京Time 08:00)
// 查找 due_date = Tomorrow notDoneHealthReminder,创建 in_app Notifications
//
// 鉴权: Authorization: Bearer ${CRON_SECRET}
// =============================================

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
// 验证 cron secret
const authHeader = request.headers.get("authorization")
const cronSecret = process.env.CRON_SECRET
if (cronSecret && authHeader!== `Bearer ${cronSecret}`) {
return NextResponse.json({ error: "unauthorized" }, { status: 401 })
}

try {
const admin = createAdminClient()

// 计算Tomorrow Date(Due a天 = TomorrowDue Reminder)
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowStr = tomorrow.toISOString().slice(0, 10)

// 查找TomorrowDue,notDone,and notSendpast Notifications HealthReminder
const { data: dueReminders, error: fetchError } = await admin.from("health_reminders").select(`
id, pet_id, profile_id, reminder_type, title, description, due_date,
pets!inner(name, species)
`).eq("due_date", tomorrowStr).eq("is_completed", false).is("last_notified_at", null).in("reminder_type", ["vaccination", "medication"])

if (fetchError) {
console.error("[health-reminder-cron] fetch error:", fetchError.message)
return NextResponse.json({ error: fetchError.message }, { status: 500 })
}

if (!dueReminders || dueReminders.length === 0) {
return NextResponse.json({ status: "ok", sent: 0, message: "no reminders due tomorrow" })
}

// for 每 Reminder创建Notifications
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const petData = dueReminders as any[]
const notifications = petData.map((reminder) => {
const petName = reminder.pets?.name?? "Pet"
const isVaccine = reminder.reminder_type === "vaccination"
const typeLabel = isVaccine? "Vaccine": "Deworming"
const title = `${petName} ${typeLabel}ReminderTomorrowDue`
const body = reminder.description? `${reminder.title}:${reminder.description}`: `${reminder.title} — Tomorrow Yes${petName} ${typeLabel}Due,some ！`

return {
profile_id: reminder.profile_id,
title,
body,
type: "followup_reminder" as const,
channel: "in_app" as const,
action_url: `/dashboard/pets/${reminder.pet_id}?tab=vaccine`,
is_read: false,
is_sent: true,
sent_at: new Date().toISOString(),
}
})

// 批量插 Notifications
const { error: notifError } = await admin.from("notifications").insert(notifications)

if (notifError) {
console.error("[health-reminder-cron] notification insert error:", notifError.message)
return NextResponse.json({ error: notifError.message }, { status: 500 })
}

// Update last_notified_at 防止DuplicateNotifications
const reminderIds = petData.map((r) => r.id)
const { error: updateError } = await admin.from("health_reminders").update({ last_notified_at: new Date().toISOString() }).in("id", reminderIds)

if (updateError) {
console.error("[health-reminder-cron] update last_notified_at error:", updateError.message)
// Notificationsalready发,not 阻塞
}

return NextResponse.json({
status: "ok",
sent: notifications.length,
date: tomorrowStr,
})
} catch (err) {
console.error("[health-reminder-cron] unexpected error:", err)
return NextResponse.json({ error: err instanceof Error? err.message: String(err) },
{ status: 500 },)
}
}

// also 支持 GET please求(方 浏览器测试)
export async function GET(request: Request) {
return POST(request)
}
