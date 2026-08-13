import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, resolveReport } from "@/lib/supabase/query"

export async function PATCH(request: NextRequest,
{ params }: { params: Promise<{ id: string }> }) {
const { isAdmin, user } = await requireAdmin()
if (!user) return NextResponse.json({ error: "notSign In" }, { status: 401 })
if (!isAdmin) return NextResponse.json({ error: "NoPermissions" }, { status: 403 })

const { id } = await params

const body = await request.json().catch(() => ({}))
const resolution = body.resolution as "resolved" | "dismissed" | undefined

if (!resolution ||!["resolved", "dismissed"].includes(resolution)) {
return NextResponse.json({ error: "resolution must be resolved or dismissed" }, { status: 400 })
}

const { error } = await resolveReport(id, resolution)
if (error) return NextResponse.json({ error: error.message }, { status: 500 })

return NextResponse.json({ ok: true })
}
