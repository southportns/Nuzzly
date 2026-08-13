import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function getAuthUser(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
const auth = request.headers.get("authorization") || request.headers.get("Authorization")
const bearer = auth?.toLowerCase().startsWith("bearer ")? auth.slice(7).trim(): null
if (bearer) {
const r = await supabase.auth.getUser(bearer)
return { user: r.data?.user?? null, error: r.error?? null }
}
const r = await supabase.auth.getUser()
return { user: r.data?.user?? null, error: r.error?? null }
}

// PATCH /api/diseases/[id] — UpdateDiseaseRecord
export async function PATCH(request: Request,
{ params }: { params: Promise<{ id: string }> }) {
try {
const { id } = await params
if (!id) {
return NextResponse.json({ error: "id Required" }, { status: 400 })
}

const body = await request.json()
const { name, severity, status, diagnosed_on, recovered_on, symptoms, notes } = body

const supabase = await createClient()
const { user, error: userErr } = await getAuthUser(request, supabase)
if (userErr ||!user) {
return NextResponse.json({ error: "notSign In" }, { status: 401 })
}

const db = createAdminClient()

// 校验Record归属
const { data: record } = await db.from("pet_disease_records").select("id, pet_id, pets!inner(profile_id)").eq("id", id).maybeSingle()

if (!record || (record.pets as { profile_id: string })?.profile_id!== user.id) {
return NextResponse.json({ error: "NoPermissions" }, { status: 403 })
}

// only Update提供 fields
const updates: {
  updated_at: string
  name?: string
  severity?: string
  status?: string
  diagnosed_on?: string | null
  recovered_on?: string | null
  symptoms?: string | null
  notes?: string | null
} = { updated_at: new Date().toISOString() }
if (name!== undefined) updates.name = String(name).trim()
if (severity!== undefined) updates.severity = severity
if (status!== undefined) updates.status = status
if (diagnosed_on!== undefined) updates.diagnosed_on = diagnosed_on || null
if (recovered_on!== undefined) updates.recovered_on = recovered_on || null
if (symptoms!== undefined) updates.symptoms = symptoms || null
if (notes!== undefined) updates.notes = notes || null

const { data, error } = await db.from("pet_disease_records").update(updates).eq("id", id).select().single()

if (error) return NextResponse.json({ error: error.message }, { status: 500 })

return NextResponse.json({ disease: data })
} catch (err) {
return NextResponse.json({ error: err instanceof Error? err.message: String(err) },
{ status: 500 })
}
}

// DELETE /api/diseases/[id] — DeleteDiseaseRecord
export async function DELETE(request: Request,
{ params }: { params: Promise<{ id: string }> }) {
try {
const { id } = await params
if (!id) {
return NextResponse.json({ error: "id Required" }, { status: 400 })
}

const supabase = await createClient()
const { user, error: userErr } = await getAuthUser(request, supabase)
if (userErr ||!user) {
return NextResponse.json({ error: "notSign In" }, { status: 401 })
}

const db = createAdminClient()

// 校验Record归属
const { data: record } = await db.from("pet_disease_records").select("id, pet_id, pets!inner(profile_id)").eq("id", id).maybeSingle()

if (!record || (record.pets as { profile_id: string })?.profile_id!== user.id) {
return NextResponse.json({ error: "NoPermissions" }, { status: 403 })
}

const { error } = await db.from("pet_disease_records").delete().eq("id", id)

if (error) return NextResponse.json({ error: error.message }, { status: 500 })

return NextResponse.json({ success: true })
} catch (err) {
return NextResponse.json({ error: err instanceof Error? err.message: String(err) },
{ status: 500 })
}
}
