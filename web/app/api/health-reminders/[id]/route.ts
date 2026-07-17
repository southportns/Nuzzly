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

// PATCH /api/health-reminders/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const db = createAdminClient()

    // 校验所有权
    const { data: existing } = await db
      .from("health_reminders")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: "提醒不存在" }, { status: 404 })
    if (existing.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    // 可更新字段白名单
    const allowed: Record<string, unknown> = {}
    const fields = ["title", "description", "dueDate", "repeatInterval", "repeatEndDate", "isCompleted"]
    const dbFields = ["title", "description", "due_date", "repeat_interval", "repeat_end_date", "is_completed"]
    for (let i = 0; i < fields.length; i++) {
      if (body[fields[i]] !== undefined) allowed[dbFields[i]] = body[fields[i]]
    }
    if (body.isCompleted) {
      allowed.completed_at = new Date().toISOString()
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "无更新字段" }, { status: 400 })
    }

    const { data, error } = await db
      .from("health_reminders")
      .update(allowed)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reminder: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// DELETE /api/health-reminders/[id]
export async function DELETE(
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

    const { data: existing } = await db
      .from("health_reminders")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: "提醒不存在" }, { status: 404 })
    if (existing.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const { error } = await db.from("health_reminders").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
