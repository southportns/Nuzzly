import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, setUserAdmin } from "@/lib/supabase/query"

export async function PATCH(request: NextRequest,
{ params }: { params: Promise<{ id: string }> }) {
const { isAdmin, user } = await requireAdmin()
if (!user) return NextResponse.json({ error: "notSign In" }, { status: 401 })
if (!isAdmin) return NextResponse.json({ error: "NoPermissions" }, { status: 403 })

const { id } = await params
const body = await request.json().catch(() => ({}))
const next = Boolean(body.isAdmin)

if (id === user.id &&!next) {
return NextResponse.json({ error: "Cannot remove your own AdminPermissions" }, { status: 400 })
}

const { error } = await setUserAdmin(id, next)
if (error) return NextResponse.json({ error: error.message }, { status: 500 })
return NextResponse.json({ ok: true })
}
