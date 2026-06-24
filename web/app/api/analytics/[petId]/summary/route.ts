import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const { petId } = await params
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "7d"

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

    // 获取最新的 daily_summary
    const { data: summary } = await supabase
      .from("daily_summary")
      .select("*")
      .eq("pet_id", petId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle()

    // 如果没有总结，尝试生成
    if (!summary) {
      // 调用数据库函数生成总结
      const { data: jobId } = await supabase
        .rpc("run_analytics_job", {
          p_pet_id: petId,
          p_date: new Date().toISOString().split("T")[0]
        })
        .single()

      // 重新获取总结
      const { data: newSummary } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({
        pet_id: petId,
        pet_name: pet.name,
        range: range,
        summary: newSummary || null,
        generated: true,
        job_id: jobId
      })
    }

    return NextResponse.json({
      pet_id: petId,
      pet_name: pet.name,
      range: range,
      summary: summary,
      generated: false
    })

  } catch (error) {
    console.error("Analytics summary error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
