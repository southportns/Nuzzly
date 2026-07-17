// GET /api/emoji/stats?limit=50&context=ai-chat
// 统计 emoji 使用频次，供筛选常用 emoji 使用（仅管理员或服务角色可用）
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: userData, error: authErr } = await supabase.auth.getUser()

    if (authErr || !userData.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 简单权限校验：查询 public_profiles 确认是否为管理员
    const { data: profile } = await supabase
      .from("public_profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single()

    if ((profile as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200)
    const context = url.searchParams.get("context")

    const { data, error } = await (supabase.rpc as any)("get_emoji_usage_stats", {
      p_limit: limit,
      p_context: context,
    })

    if (error) {
      console.error("[emoji/stats] rpc error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ stats: (data as Array<{ emoji_name: string; emoji_unicode: string; usage_count: number }> | undefined) ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
