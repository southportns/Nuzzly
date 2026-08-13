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

const body = await request.json()
const { medication_id, ended_on } = body

if (!medication_id) {
return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
}

// 验证Permissions
const { data: medication, error: fetchError } = await supabase.from("pet_medication_records").select("id, pet_id, is_ongoing").eq("id", medication_id).single()

if (fetchError ||!medication) {
return NextResponse.json({ error: "Recorddoes not exist " }, { status: 404 })
}

// 验证Pet归属
const { data: pet } = await supabase.from("pets").select("id").eq("id", medication.pet_id).eq("profile_id", user.id).single()

if (!pet) {
return NextResponse.json({ error: "NoPermissions" }, { status: 403 })
}

if (!medication.is_ongoing) {
return NextResponse.json({ message: "already" }, { status: 200 })
}

// 停止Medication
const { data, error } = await supabase.from("pet_medication_records").update({
is_ongoing: false,
ended_on: ended_on || new Date().toISOString().split("T")[0],
updated_at: new Date().toISOString(),
}).eq("id", medication_id).select().single()

if (error) {
console.error("[medications/stop] error:", error)
return NextResponse.json({ error: "Medicationfailed" }, { status: 500 })
}

return NextResponse.json({ success: true, data })
} catch (error) {
console.error("[medications/stop] error:", error)
return NextResponse.json({ error: "ServerError" }, { status: 500 })
}
}
