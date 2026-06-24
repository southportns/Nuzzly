// =============================================
// GET /api/admin/outcome-dataset
// Export outcome dataset for AI training
// Supports: JSONL, CSV, JSON formats
// =============================================

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildFullOutcomeDataset, incrementalOutcomeDataset, exportAsJSONL, exportAsCSV, getDatasetStats } from "@/lib/timeline/outcome-dataset"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") ?? "json"
  const incremental = searchParams.get("incremental") === "true"
  const limit = parseInt(searchParams.get("limit") ?? "1000")
  const since = searchParams.get("since") ?? undefined

  try {
    const dataset = incremental
      ? await incrementalOutcomeDataset(since)
      : await buildFullOutcomeDataset(limit)

    if (!dataset) {
      return NextResponse.json(
        { success: false, error: "Failed to build dataset" },
        { status: 500 }
      )
    }

    const stats = getDatasetStats(dataset)

    // JSONL export (for ML training)
    if (format === "jsonl") {
      return new NextResponse(exportAsJSONL(dataset), {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition": `attachment; filename="outcome-dataset-${Date.now()}.jsonl"`,
        },
      })
    }

    // CSV export (for analysis)
    if (format === "csv") {
      return new NextResponse(exportAsCSV(dataset), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="outcome-dataset-${Date.now()}.csv"`,
        },
      })
    }

    // JSON export (default)
    return NextResponse.json({
      success: true,
      stats,
      dataset: {
        total_samples: dataset.total_samples,
        generated_at: dataset.generated_at,
        // Don't return full samples in JSON view (too large), just stats
      },
    })
  } catch (error) {
    console.error("[outcome-dataset] error:", error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
