// GET /api/ai/chat/history — 获取当前用户的聊天历史
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function getAuthUser(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null
  if (bearer) {
    const r = await supabase.auth.getUser(bearer)
    return { user: r.data?.user ?? null, error: r.error ?? null }
  }
  const r = await supabase.auth.getUser()
  return { user: r.data?.user ?? null, error: r.error ?? null }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { user } = await getAuthUser(request, supabase)
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })

    // 获取用户所有宠物的聊天记录
    const { data, error } = await supabase
      .from("health_chat_sessions")
      .select("id, user_message, ai_response, created_at, pet_id, model_used")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ sessions: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
