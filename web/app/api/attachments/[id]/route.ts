import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { id } = await params

    // 获取附件信息
    const { data: attachment, error: fetchError } = await supabase
      .from("pet_attachments")
      .select("id, file_path, pet_id")
      .eq("id", id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: "附件不存在" }, { status: 404 })
    }

    // 验证权限
    const { data: pet } = await supabase
      .from("pets")
      .select("id")
      .eq("id", attachment.pet_id as string)
      .eq("profile_id", user.id)
      .single()

    if (!pet) {
      return NextResponse.json({ error: "无权限" }, { status: 403 })
    }

    // 删除Storage文件
    if (attachment.file_path) {
      const { error: storageError } = await supabase.storage
        .from("pet-attachments")
        .remove([attachment.file_path])

      if (storageError) {
        console.warn("[attachments/[id]] storage delete warning:", storageError.message)
      }
    }

    // 删除数据库记录
    const { error } = await supabase
      .from("pet_attachments")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[attachments/[id]] db error:", error)
      return NextResponse.json({ error: "删除失败" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[attachments/[id]] error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { id } = await params

    const { data, error } = await supabase
      .from("pet_attachments")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "附件不存在" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[attachments/[id]] error:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
