import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, moderateCommunityPost } from "@/lib/supabase/query"

export async function PATCH(request: NextRequest,
{ params }: { params: Promise<{ id: string }> }) {
const { isAdmin, user } = await requireAdmin()
if (!user) return NextResponse.json({ error: "notSign In" }, { status: 401 })
if (!isAdmin) return NextResponse.json({ error: "NoPermissions" }, { status: 403 })

const { id } = await params

const body = await request.json().catch(() => ({}))
const action = body.action as "approve" | "reject" | undefined
const reason = typeof body.reason === "string"? body.reason: undefined

if (!action ||!["approve", "reject"].includes(action)) {
return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 })
}

if (action === "reject" &&!reason?.trim()) {
return NextResponse.json({ error: "Must provide reason when rejectingreason" }, { status: 400 })
}

const { error } = await moderateCommunityPost(id, action, reason)
if (error) return NextResponse.json({ error: error.message }, { status: 500 })

return NextResponse.json({ ok: true })
}
