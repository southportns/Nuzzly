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

// GET /api/diseases?petId=xxx
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

    const { data, error } = await db
      .from("pet_disease_records")
      .select("*")
      .eq("pet_id", petId)
      .order("diagnosed_on", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ diseases: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// POST /api/diseases
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pet_id, name, severity, status, diagnosed_on, notes } = body

    if (!pet_id || !name) {
      return NextResponse.json({ error: "pet_id 和 name 必填" }, { status: 400 })
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
      .eq("id", pet_id)
      .maybeSingle()
    if (!pet || pet.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const { data, error } = await db
      .from("pet_disease_records")
      .insert({
        pet_id,
        name: name.trim(),
        severity: severity || "unknown",
        status: status || "active",
        diagnosed_on: diagnosed_on || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ disease: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// DELETE /api/diseases?id=xxx
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id 必填" }, { status: 400 })
    }

    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const db = createAdminClient()

    // 校验记录归属
    const { data: record } = await db
      .from("pet_disease_records")
      .select("id, pet_id, pets!inner(profile_id)")
      .eq("id", id)
      .maybeSingle()
    if (!record || (record.pets as { profile_id: string })?.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const { error } = await db
      .from("pet_disease_records")
      .delete()
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
