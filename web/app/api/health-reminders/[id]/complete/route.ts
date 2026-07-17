import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function getAuthUser(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null
  if (bearer) {
    const r = await supabase.auth.getUser(bearer)
    return { user: r.data?.user ?? null, error: r.error ?? null }
  }
  const r = await supabase.auth.getUser()
  return { user: r.data?.user ?? null, error: r.error ?? null }
}

function addInterval(dateStr: string, interval: string): string {
  const d = new Date(dateStr)
  switch (interval) {
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
    case "quarterly":
      d.setMonth(d.getMonth() + 3)
      break
    case "yearly":
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().slice(0, 10)
}

// POST /api/health-reminders/[id]/complete
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const db = createAdminClient()

    // 获取提醒并校验所有权
    const { data: reminder, error: fetchErr } = await db
      .from("health_reminders")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (!reminder) return NextResponse.json({ error: "提醒不存在" }, { status: 404 })
    if (reminder.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    // 标记完成
    const now = new Date().toISOString()
    const { error: updateErr } = await db
      .from("health_reminders")
      .update({ is_completed: true, completed_at: now })
      .eq("id", id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // 循环提醒：自动创建下一期
    let nextReminder = null
    if (reminder.repeat_interval && reminder.repeat_interval !== "none") {
      const nextDueDate = addInterval(reminder.due_date, reminder.repeat_interval)

      // 检查是否超过结束日期
      if (!reminder.repeat_end_date || nextDueDate <= reminder.repeat_end_date) {
        const { data: created, error: createErr } = await db
          .from("health_reminders")
          .insert({
            pet_id: reminder.pet_id,
            profile_id: reminder.profile_id,
            reminder_type: reminder.reminder_type,
            title: reminder.title,
            description: reminder.description,
            due_date: nextDueDate,
            repeat_interval: reminder.repeat_interval,
            repeat_end_date: reminder.repeat_end_date,
          })
          .select()
          .single()

        if (!createErr) nextReminder = created
      }
    }

    return NextResponse.json({ success: true, nextReminder })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
