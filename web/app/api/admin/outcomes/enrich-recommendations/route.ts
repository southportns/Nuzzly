// POST /api/admin/outcomes/enrich-recommendations
// 对近 24h 新写入的 recommendation_trace_log 执行飞轮 enrichment batch jobs:
//   - computeOutcomeAttributionJob    → attributionConfidence
//   - computeLongitudinalStabilityJob → outcomeStability + horizonAgreement
//   - computeDelayedRewardProxyJob    → outcomeClarity
// 支持 admin 鉴权 (默认) 或 cron 鉴权 (?trigger=cron + Authorization: Bearer ${CRON_SECRET})

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  computeOutcomeAttributionJob,
  computeLongitudinalStabilityJob,
  computeDelayedRewardProxyJob,
} from "@/lib/jobs/handlers/flywheel-enrichment"

const CONCURRENCY = 5
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

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

export async function POST(request: Request) {
  const isCron = new URL(request.url).searchParams.get("trigger") === "cron"
  const logPrefix = isCron ? "[flywheel cron]" : "[/api/admin/outcomes/enrich-recommendations]"

  // 鉴权: cron 触发校验 CRON_SECRET, 否则走 admin 鉴权
  if (isCron) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
  } else {
    const auth = await requireAdmin()
    if ("error" in auth) return auth.error
  }

  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString()

    // 1. 查询近 24h 新写入的 recommendation_trace_log
    const { data: recentRecords, error: queryErr } = await admin
      .from("recommendation_trace_log")
      .select("id")
      .gte("created_at", since)
      .order("created_at", { ascending: true })

    if (queryErr) {
      console.error(`${logPrefix} Failed to query recent trace logs:`, queryErr.message)
      return NextResponse.json({ success: false, error: queryErr.message }, { status: 500 })
    }

    const records = (recentRecords ?? []) as Array<{ id: string }>
    if (records.length === 0) {
      console.log(`${logPrefix} No recent recommendations to enrich`)
      return NextResponse.json({ success: true, data: { processed: 0, errors: 0, results: [] } })
    }

    console.log(`${logPrefix} Enriching ${records.length} recommendations (concurrency=${CONCURRENCY})`)

    // 2. 分块并发: 每块 CONCURRENCY 条, 每条记录的 3 个 job 并行执行 (Promise.all)
    //    限制并发避免 DB 压力 (chunk 间串行, chunk 内 5 条并行)
    const results: Array<{ id: string; status: "ok" | "error"; error?: string }> = []
    let errors = 0

    for (let i = 0; i < records.length; i += CONCURRENCY) {
      const chunk = records.slice(i, i + CONCURRENCY)
      const chunkResults = await Promise.all(
        chunk.map(async (rec) => {
          try {
            await Promise.all([
              computeOutcomeAttributionJob(rec.id),
              computeLongitudinalStabilityJob(rec.id),
              computeDelayedRewardProxyJob(rec.id),
            ])
            return { id: rec.id, status: "ok" as const }
          } catch (err) {
            const msg = (err as Error).message
            console.error(`${logPrefix} Failed to enrich ${rec.id}:`, msg)
            return { id: rec.id, status: "error" as const, error: msg }
          }
        })
      )
      for (const r of chunkResults) {
        results.push(r)
        if (r.status === "error") errors++
      }
    }

    const processed = results.length
    console.log(`${logPrefix} Done: processed=${processed} errors=${errors}`)

    return NextResponse.json({
      success: true,
      data: { processed, errors, results },
    })
  } catch (error) {
    console.error(`${logPrefix} Failed:`, (error as Error).message)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
