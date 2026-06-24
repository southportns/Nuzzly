// GET /api/admin/outcomes/benchmarks
// Returns health benchmark data

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getBenchmarks } from "@/lib/timeline/health-benchmarks"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) }
  }
  return { user }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") ?? undefined

    const benchmarks = await getBenchmarks(category ? { category } : undefined)

    return NextResponse.json({
      success: true,
      data: { benchmarks },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
