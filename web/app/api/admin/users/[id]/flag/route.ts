import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, setUserFlag } from "@/lib/supabase/query"

export async function PATCH(request: NextRequest,
{ params }: { params: Promise<{ id: string }> }) {
const { isAdmin, user } = await requireAdmin()
if (!user) return NextResponse.json({ error: "notSign In" }, { status: 401 })
if (!isAdmin) return NextResponse.json({ error: "NoPermissions" }, { status: 403 })

const { id } = await params
if (id === user.id) {
return NextResponse.json({ error: "Cannot flag yourself" }, { status: 400 })
}

const body = await request.json().catch(() => ({}))
const flagged = Boolean(body.flagged)
const reason = typeof body.reason === "string"? body.reason: null

if (flagged &&!reason?.trim()) {
return NextResponse.json({ error: "Must provide reason when flaggingreason" }, { status: 400 })
}

const { error } = await setUserFlag(id, flagged, reason?? undefined)
if (error) return NextResponse.json({ error: error.message }, { status: 500 })
return NextResponse.json({ ok: true })
}
