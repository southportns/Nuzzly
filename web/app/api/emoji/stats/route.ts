// GET /api/emoji/stats?limit=50&context=ai-chat
// Statistics emoji used频次,供Filter常use emoji used(仅Admin or 服务角色canuse)
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
try {
const supabase = await createClient()
const { data: userData, error: authErr } = await supabase.auth.getUser()

if (authErr ||!userData.user) {
return NextResponse.json({ error: "notSign In" }, { status: 401 })
}

// 简单Permissions校验:查询 profiles.is_admin ConfirmWhether for Admin
// Note:Mustused admin client 才can 读取 profiles 表 is_admin fields(Sensitive fieldsnot public_profiles 视图 暴露)
const { data: profile, error: profileErr } = await supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single()

if (profileErr ||!profile?.is_admin) {
return NextResponse.json({ error: "NoPermissions" }, { status: 403 })
}

const url = new URL(request.url)
const limit = Math.min(parseInt(url.searchParams.get("limit")?? "50", 10), 200)
const context = url.searchParams.get("context")

const { data, error } = await (supabase.rpc as any)("get_emoji_usage_stats", {
p_limit: limit,
p_context: context,
})

if (error) {
console.error("[emoji/stats] rpc error:", error)
return NextResponse.json({ error: error.message }, { status: 500 })
}

return NextResponse.json({ stats: (data as Array<{ emoji_name: string; emoji_unicode: string; usage_count: number }> | undefined)?? [] })
} catch (err) {
return NextResponse.json({ error: err instanceof Error? err.message: String(err) },
{ status: 500 },)
}
}
