// GET /api/admin/outcomes/cohorts
// Returns cohort intelligence data

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCohortIntelligence, compareCohorts } from "@/lib/timeline/cohort-intelligence"

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
    const cohortKey = searchParams.get("cohortKey") ?? undefined
    const compare = searchParams.get("compare")  // comma-separated cohort keys

    if (compare) {
      const keys = compare.split(",").map((k) => k.trim())
      const result = await compareCohorts(keys)
      return NextResponse.json({ success: true, data: result })
    }

    const cohorts = await getCohortIntelligence(cohortKey ? { cohortKey } : undefined)

    return NextResponse.json({
      success: true,
      data: { cohorts },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
