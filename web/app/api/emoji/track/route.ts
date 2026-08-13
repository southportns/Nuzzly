// POST /api/emoji/track
// 批量records emoji used,use on follow-upStatistics常use emoji
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface EmojiTrackRecord {
emoji_name: string
emoji_unicode: string
context?: string
source?: string
}

export async function POST(request: Request) {
try {
const body = (await request.json().catch(() => ({}))) as
| { records?: EmojiTrackRecord[] }
| EmojiTrackRecord

let records: EmojiTrackRecord[] = []

if ("records" in body && Array.isArray(body.records)) {
records = body.records
} else if ("emoji_name" in body && "emoji_unicode" in body) {
records = [body as EmojiTrackRecord]
}

const validRecords = records.filter((r) => r.emoji_name && r.emoji_unicode).map((r) => ({
emoji_name: r.emoji_name,
emoji_unicode: r.emoji_unicode,
context: r.context?? "unknown",
source: r.source?? "web",
profile_id: null,
}))

if (validRecords.length === 0) {
return NextResponse.json({ error: "emoji_name and emoji_unicode Required" }, { status: 400 })
}

const supabase = await createClient()
// not 调use auth.getUser():RLS 通past please求 session cookie 自动鉴权,
// profile_id 置empty满足existing RLS Strategy(alreadySign InUsercan写 null),同时避免每次please求all 访问 Auth 服务.
const { error } = await supabase.from("emoji_usage_stats" as any).insert(validRecords as any)

if (error) {
console.error("[emoji/track] insert error:", error)
return NextResponse.json({ error: error.message }, { status: 500 })
}

return NextResponse.json({ ok: true, count: validRecords.length })
} catch (err) {
return NextResponse.json({ error: err instanceof Error? err.message: String(err) },
{ status: 500 },)
}
}
