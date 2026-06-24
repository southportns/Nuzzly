// GET /api/admin/outcomes/effectiveness
// Returns recommendation effectiveness scores

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEffectivenessScores, getTopEffectiveEntities, type EntityType } from "@/lib/timeline/effectiveness-scoring"

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
    const entityType = searchParams.get("entityType") as EntityType | null
    const entityId = searchParams.get("entityId") ?? undefined
    const topOnly = searchParams.get("topOnly") === "true"
    const limit = parseInt(searchParams.get("limit") ?? "20", 10)

    const scores = topOnly && entityType
      ? await getTopEffectiveEntities(entityType, limit)
      : await getEffectivenessScores({
          entityType: entityType ?? undefined,
          entityId,
          limit,
        })

    return NextResponse.json({
      success: true,
      data: { scores },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
