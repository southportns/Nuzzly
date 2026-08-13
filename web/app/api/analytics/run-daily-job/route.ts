import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
try {
const supabase = await createClient()

// 验证UserPermissions
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

// 解析please求体
const body = await request.json().catch(() => ({}))
const { pet_id, date } = body

// if果指定 Pet,验证all权
if (pet_id) {
const { data: pet } = await supabase.from("pets").select("id").eq("id", pet_id).eq("profile_id", user.id).single()

if (!pet) {
return NextResponse.json({ error: "Pet not found" }, { status: 404 })
}
} else {
// if果not指定Pet,only 处理User Pet
const { data: pets } = await supabase.from("pets").select("id").eq("profile_id", user.id).eq("is_active", true)

if (!pets || pets.length === 0) {
return NextResponse.json({ error: "No active pets found" }, { status: 404 })
}
}

// 执行AnalysisTask
const targetDate = date || new Date().toISOString().split("T")[0]

const { data: jobId, error } = await supabase.rpc("run_analytics_job", {
p_pet_id: pet_id || null,
p_date: targetDate
}).single()

if (error) {
console.error("Analytics job error:", error)
return NextResponse.json({ error: "failed to run analytics job" }, { status: 500 })
}

// 获取TaskStatus
const { data: job } = await supabase.from("analytics_jobs").select("*").eq("id", jobId).single()

return NextResponse.json({
success: true,
job_id: jobId,
job: job,
message: pet_id? `Analytics job started for pet ${pet_id}`: "Analytics job started for all active pets"
})

} catch (error) {
console.error("Run daily job error:", error)
return NextResponse.json({ error: "Internal server error" },
{ status: 500 })
}
}
