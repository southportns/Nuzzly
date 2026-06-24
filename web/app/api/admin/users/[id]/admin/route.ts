import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, setUserAdmin } from "@/lib/supabase/query"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const next = Boolean(body.isAdmin)

  if (id === user.id && !next) {
    return NextResponse.json({ error: "不能撤销自己的管理员权限" }, { status: 400 })
  }

  const { error } = await setUserAdmin(id, next)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
