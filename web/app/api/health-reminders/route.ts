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

// GET /api/health-reminders?petId=xxx&type=vaccination
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const petId = url.searchParams.get("petId")
    if (!petId) {
      return NextResponse.json({ error: "petId 必填" }, { status: 400 })
    }

    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const db = createAdminClient()

    // 校验宠物归属
    const { data: pet } = await db
      .from("pets")
      .select("id, profile_id")
      .eq("id", petId)
      .maybeSingle()
    if (!pet || pet.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    let query = db
      .from("health_reminders")
      .select("*")
      .eq("pet_id", petId)
      .order("due_date", { ascending: true })

    const type = url.searchParams.get("type")
    if (type) {
      query = query.eq("reminder_type", type)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reminders: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// POST /api/health-reminders
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { petId, reminderType, title, description, dueDate, repeatInterval, repeatEndDate } = body

    if (!petId || !reminderType || !title || !dueDate) {
      return NextResponse.json({ error: "petId, reminderType, title, dueDate 必填" }, { status: 400 })
    }

    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const db = createAdminClient()

    // 校验宠物归属
    const { data: pet } = await db
      .from("pets")
      .select("id, profile_id")
      .eq("id", petId)
      .maybeSingle()
    if (!pet || pet.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const { data, error } = await db
      .from("health_reminders")
      .insert({
        pet_id: petId,
        profile_id: user.id,
        reminder_type: reminderType,
        title,
        description: description || null,
        due_date: dueDate,
        repeat_interval: repeatInterval || "none",
        repeat_end_date: repeatEndDate || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reminder: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
