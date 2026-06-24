// GET /api/pets/breeds?species=cat&q=布偶 — 品种下拉(供 mobile combobox)
// 鉴权:Bearer token 优先(mobile),fallback cookie(web)
// 返回:经 alias 去重后的 canonical 列表,带可选 q 模糊匹配
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
    const url = new URL(request.url)
    const species = url.searchParams.get("species")
    const q = url.searchParams.get("q")?.trim() ?? ""

    if (!species || !["cat", "dog", "other"].includes(species)) {
      return NextResponse.json({ error: "species 必填且为 cat/dog/other" }, { status: 400 })
    }

    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // breed_aliases 是公开知识库,走 RLS anon 可读;这里 admin 是稳一点
    const db = createAdminClient()
    let query = db
      .from("breed_aliases")
      .select("alias, canonical, species")
      .eq("species", species)
      .order("canonical", { ascending: true })
      .limit(500)

    if (q) {
      // 同时匹配 alias 和 canonical
      query = query.or(`alias.ilike.%${q}%,canonical.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 去重 canonical,合并所有 alias 用于客户端做高亮 / 反向搜索
    const map = new Map<string, { canonical: string; species: string; aliases: string[] }>()
    for (const row of data ?? []) {
      const key = row.canonical
      if (!map.has(key)) {
        map.set(key, { canonical: row.canonical, species: row.species, aliases: [] })
      }
      if (!map.get(key)!.aliases.includes(row.alias)) {
        map.get(key)!.aliases.push(row.alias)
      }
    }
    const breeds = Array.from(map.values())

    return NextResponse.json({ breeds })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
