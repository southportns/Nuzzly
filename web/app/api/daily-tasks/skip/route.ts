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

    // 检查是否已经有记录
    const { data: existingLog } = await supabase
      .from("daily_task_logs")
      .select("id, completed")
      .eq("task_id", task_id)
      .eq("pet_id", pet_id)
      .eq("task_date", task_date)
      .eq("profile_id", user.id)
      .single()

    if (existingLog?.completed) {
      return NextResponse.json({ message: "任务已完成，无法跳过" }, { status: 400 })
    }

    if (existingLog) {
      return NextResponse.json({ message: "已跳过" }, { status: 200 })
    }

    // 创建跳过记录
    const { data, error } = await supabase
      .from("daily_task_logs")
      .insert({
        task_id,
        pet_id,
        profile_id: user.id,
        task_date,
        completed: false,
        skipped: true,
      })
      .select()
      .single()

    if (error) {
      console.error("[daily-tasks/skip] error:", error)
      return NextResponse.json({ error: "跳过任务失败" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[daily-tasks/skip] error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
