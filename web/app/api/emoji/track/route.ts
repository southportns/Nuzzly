// POST /api/emoji/track
// 记录一次 emoji 使用，用于后续统计常用 emoji
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      emoji_name?: string
      emoji_unicode?: string
      context?: string
      source?: string
    }

    if (!body.emoji_name || !body.emoji_unicode) {
      return NextResponse.json({ error: "emoji_name 和 emoji_unicode 必填" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from("emoji_usage_stats" as any).insert({
      emoji_name: body.emoji_name,
      emoji_unicode: body.emoji_unicode,
      context: body.context ?? "unknown",
      source: body.source ?? "web",
      profile_id: userData.user?.id ?? null,
    } as any)

    if (error) {
      console.error("[emoji/track] insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
