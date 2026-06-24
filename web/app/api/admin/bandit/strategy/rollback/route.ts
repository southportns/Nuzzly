// POST /api/admin/bandit/strategy/rollback
// Phase 3.8: Roll back to a previous strategy by cloning it
// Body: { sourceStrategyId, newVersion, newName?, reason }

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/supabase/queries/admin-queries"
import { rollbackToStrategy, getStrategy } from "@/lib/timeline/strategy-registry"

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.isAdmin) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { sourceStrategyId, newVersion, newName, reason } = body as {
      sourceStrategyId: string
      newVersion: string
      newName?: string
      reason: string
    }

    if (!sourceStrategyId || !newVersion || !reason) {
      return NextResponse.json(
        { success: false, error: "sourceStrategyId, newVersion, reason are required" },
        { status: 400 }
      )
    }

    // Verify source exists
    const source = await getStrategy(sourceStrategyId)
    if (!source) {
      return NextResponse.json(
        { success: false, error: `Source strategy ${sourceStrategyId} not found` },
        { status: 404 }
      )
    }

    const newStrategy = await rollbackToStrategy({
      sourceStrategyId,
      newVersion,
      newName,
      reason,
      createdBy: auth.user?.id ?? null,
    })

    return NextResponse.json({
      success: true,
      data: {
        new_strategy: newStrategy,
        source_strategy: source,
      },
    })
  } catch (error) {
    console.error("[bandit/strategy/rollback] error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
