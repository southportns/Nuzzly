// =============================================
// GET/PUT /api/admin/flags
// Feature Flag Management — Admin API
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getFlag, updateFlag, FLAG_KEYS, type FeatureFlagValue } from "@/lib/timeline/feature-flags"
import { rolloutController } from "@/lib/timeline/rollout-controller"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) }
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const flags = Object.values(FLAG_KEYS)
  const flagValues: Record<string, FeatureFlagValue> = {}

  for (const key of flags) {
    flagValues[key] = await getFlag(key)
  }

  return NextResponse.json({ success: true, data: { flags: flagValues } })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { flagKey, value } = body as { flagKey: string; value: FeatureFlagValue }

    if (!flagKey || !value) {
      return NextResponse.json({ success: false, error: "Missing flagKey or value" }, { status: 400 })
    }

    const updatedValue = await updateFlag(flagKey as Parameters<typeof updateFlag>[0], value)

    // Clear controller cache
    rolloutController.clearCache()

    return NextResponse.json({ success: true, data: { flagKey, value: updatedValue } })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
