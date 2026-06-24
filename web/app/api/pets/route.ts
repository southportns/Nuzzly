// GET /api/pets?petId=xxx — 拉单只宠物档案详情(供 mobile 查看/编辑回显)
// 鉴权:Bearer token 优先(mobile),fallback cookie(web)
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

    // 用 admin 查(避免 RLS 在 cookie↔Bearer 切换时的不一致),手动校验 owner
    const db = createAdminClient()
    const { data, error } = await db
      .from("pets")
      .select("id, profile_id, name, species, breed, age_years, age_months, gender, weight_kg, stomach_health, photo_url, is_active, created_at, updated_at")
      .eq("id", petId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "宠物不存在" }, { status: 404 })
    if (data.profile_id !== user.id) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    return NextResponse.json({ pet: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
