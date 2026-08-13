import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
try {
const supabase = await createClient()

// 验证UserSign In
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError ||!user) {
return NextResponse.json({ error: "notSign In" }, { status: 401 })
}

const formData = await request.formData()
const file = formData.get("file") as File
const pet_id = formData.get("pet_id") as string
const category = formData.get("category") as string || "other"

if (!file ||!pet_id) {
return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
}

// 验证Pet归属
const { data: pet } = await supabase.from("pets").select("id").eq("id", pet_id).eq("profile_id", user.id).single()

if (!pet) {
return NextResponse.json({ error: "NoPermissions" }, { status: 403 })
}

// 生成文conditions路径
const fileExt = file.name.split(".").pop()
const fileName = `${pet_id}/${Date.now()}.${fileExt}`

// File uploadto Storage
const { data: uploadData, error: uploadError } = await supabase.storage.from("pet-attachments").upload(fileName, file)

if (uploadError) {
console.error("[attachments/upload] upload error:", uploadError)
return NextResponse.json({ error: "File uploadfailed" }, { status: 500 })
}

// 获取文conditionsURL
const { data: urlData } = supabase.storage.from("pet-attachments").getPublicUrl(fileName)

// SaveAttachmentRecord
const { data, error } = await supabase.from("pet_attachments").insert({
pet_id,
uploaded_by: user.id,
file_name: file.name,
file_path: fileName,
file_url: urlData.publicUrl,
file_type: file.type,
file_size: file.size,
category,
owner_type: "pet",
owner_id: pet_id,
}).select().single()

if (error) {
console.error("[attachments/upload] db error:", error)
return NextResponse.json({ error: "SaveRecordfailed" }, { status: 500 })
}

return NextResponse.json({ success: true, data })
} catch (error) {
console.error("[attachments/upload] error:", error)
return NextResponse.json({ error: "ServerError" }, { status: 500 })
}
}
