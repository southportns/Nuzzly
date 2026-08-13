import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, batchModerateCommunityPosts } from "@/lib/supabase/query"

export async function PATCH(request: NextRequest) {
const { isAdmin, user } = await requireAdmin()
if (!user) return NextResponse.json({ error: "notSign In" }, { status: 401 })
if (!isAdmin) return NextResponse.json({ error: "NoPermissions" }, { status: 403 })

const body = await request.json().catch(() => ({}))
const postIds = Array.isArray(body.postIds)? body.postIds: []
const action = body.action as "approve" | "reject" | undefined
const reason = typeof body.reason === "string"? body.reason: undefined

if (!action ||!["approve", "reject"].includes(action)) {
return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 })
}
if (postIds.length === 0) {
return NextResponse.json({ error: "Please selectat least one Post" }, { status: 400 })
}
if (action === "reject" &&!reason?.trim()) {
return NextResponse.json({ error: "Must provide reason when rejectingreason" }, { status: 400 })
}

const { error } = await batchModerateCommunityPosts(postIds, action, reason)
if (error) return NextResponse.json({ error: error.message }, { status: 500 })

return NextResponse.json({ ok: true, count: postIds.length })
}
