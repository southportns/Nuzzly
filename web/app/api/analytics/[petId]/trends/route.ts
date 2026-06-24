import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const { petId } = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")

    const supabase = await createClient()

    // 验证用户权限
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 验证宠物属于用户
    const { data: pet } = await supabase
      .from("pets")
      .select("id, name")
      .eq("id", petId)
      .eq("profile_id", user.id)
      .single()

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 })
    }

    // 获取趋势数据
    const { data: trends, error } = await supabase
      .rpc("get_health_trends", {
        p_pet_id: petId,
        p_days: days
      })
      .single()

    if (error) {
      console.error("Trends query error:", error)
      return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 })
    }

    // 获取健康指标历史
    const { data: metrics } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("pet_id", petId)
      .gte("date", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("date", { ascending: true })

    // 计算趋势统计
    const stats = {
      weight: calculateTrendStats(metrics?.map(m => ({ date: m.date, value: m.weight_delta })) || []),
      appetite: calculateTrendStats(metrics?.map(m => ({ date: m.date, value: m.appetite_score })) || []),
      stool: calculateTrendStats(metrics?.map(m => ({ date: m.date, value: m.stool_score })) || []),
      activity: calculateTrendStats(metrics?.map(m => ({ date: m.date, value: m.activity_score })) || [])
    }

    return NextResponse.json({
      pet_id: petId,
      pet_name: pet.name,
      days: days,
      trends: trends || {},
      stats: stats,
      data_points: metrics?.length || 0
    })

  } catch (error) {
    console.error("Analytics trends error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// 计算趋势统计
function calculateTrendStats(data: { date: string; value: number | null }[]) {
  const validData = data.filter(d => d.value !== null)
  if (validData.length === 0) {
    return { current: null, avg: null, min: null, max: null, trend: "no_data" }
  }

  const values = validData.map(d => d.value as number)
  const current = values[values.length - 1]
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)

  // 判断趋势
  let trend = "stable"
  if (values.length >= 3) {
    const recent = values.slice(-3)
    const older = values.slice(0, 3)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

    if (recentAvg > olderAvg * 1.1) trend = "improving"
    else if (recentAvg < olderAvg * 0.9) trend = "declining"
  }

  return {
    current: Math.round(current * 10) / 10,
    avg: Math.round(avg * 10) / 10,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    trend: trend,
    data_points: validData.length
  }
}
