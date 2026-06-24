import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, setUserFlag } from "@/lib/supabase/query"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { id } = await params
  if (id === user.id) {
    return NextResponse.json({ error: "不能标记自己" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const flagged = Boolean(body.flagged)
  const reason = typeof body.reason === "string" ? body.reason : null

  if (flagged && !reason?.trim()) {
    return NextResponse.json({ error: "标记时必须填写原因" }, { status: 400 })
  }

  const { error } = await setUserFlag(id, flagged, reason ?? undefined)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
