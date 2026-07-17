import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { task_id, pet_id, task_date } = body

    if (!task_id || !pet_id || !task_date) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 检查是否已经完成
    const { data: existingLog } = await supabase
      .from("daily_task_logs")
      .select("id")
      .eq("task_id", task_id)
      .eq("pet_id", pet_id)
      .eq("task_date", task_date)
      .eq("profile_id", user.id)
      .single()

    if (existingLog) {
      return NextResponse.json({ message: "任务已完成" }, { status: 200 })
    }

    // 创建任务完成记录
    const { data, error } = await supabase
      .from("daily_task_logs")
      .insert({
        task_id,
        pet_id,
        profile_id: user.id,
        task_date,
        completed: true,
        completed_at: new Date().toISOString(),
        skipped: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[daily-tasks/complete] error:", error)
      return NextResponse.json({ error: "完成任务失败" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[daily-tasks/complete] error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
