import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUser, queryProfile, queryPets } from "@/lib/supabase/query"
import ResidentBookSection from "@/components/resident-book/resident-book-section"
import { buildResidentBookData } from "@/components/resident-book/utils"

export default async function DashboardPage() {
const { data: { user } } = await getUser()
if (!user) redirect("/login")

const supabase = await createClient()

const [
{ data: profile },
{ data: pets },
] = await Promise.all([
queryProfile(user.id),
queryPets(user.id),
])
const hasPets = pets && pets.length > 0

// 构建单a户口簿:户主=User,members=allPet
const allergiesMap: Record<string, any[]> = {}
const medsMap: Record<string, any[]> = {}
const weightLogsMap: Record<string, any[]> = {}
const diseasesMap: Record<string, any[]> = {}
const vaccinationsMap: Record<string, any[]> = {}

if (pets && pets.length > 0) {
const petIds = pets.map((pet) => pet.id)
const [allergiesRes, medsRes, weightLogsRes, diseasesRes, vaccinationsRes] = await Promise.all([
supabase.from("pet_allergies").select("*").in("pet_id", petIds),
supabase.from("pet_medication_records").select("*").in("pet_id", petIds).order("started_on", { ascending: false }),
supabase.from("health_records").select("id, weight_kg, record_time, pet_id").in("pet_id", petIds).eq("record_type", "weight").not("weight_kg", "is", null).order("record_time", { ascending: true }),
// DiseaseRecord
supabase.from("pet_disease_records").select("id, name, diagnosed_on, recovered_on, status, symptoms, notes, pet_id").in("pet_id", petIds).order("diagnosed_on", { ascending: false }),
// VaccinationRecord(health_records record_type = vaccination)
supabase.from("health_records").select("id, diagnosis, record_time, notes, metadata, pet_id").in("pet_id", petIds).eq("record_type", "vaccination").order("record_time", { ascending: false }),
])

// 调试Logs:检查DiseaseRecord查询Result
if (diseasesRes.error) {
console.error("[Dashboard] DiseaseRecordQuery failed:", diseasesRes.error.message)
} else {
console.log("[Dashboard] DiseaseRecordQuery successful:", diseasesRes.data?.length?? 0, "records")
}

for (const pet of pets) {
allergiesMap[pet.id] = (allergiesRes.data?? []).filter((a) => a.pet_id === pet.id)
medsMap[pet.id] = (medsRes.data?? []).filter((m) => m.pet_id === pet.id)
weightLogsMap[pet.id] = (weightLogsRes.data?? []).filter((w) => w.pet_id === pet.id).map((d) => ({
id: d.id,
weight_kg: d.weight_kg!,
logged_date: d.record_time?.split("T")[0] || new Date().toISOString().split("T")[0],
}))
// DiseaseRecord
diseasesMap[pet.id] = (diseasesRes.data?? []).filter((d) => d.pet_id === pet.id)
// VaccineRecord:映射 health_records fieldsto VaccinationRecordLike
vaccinationsMap[pet.id] = (vaccinationsRes.data?? []).filter((v) => v.pet_id === pet.id).map((v) => {
const meta = v.metadata as Record<string, unknown> | null
return {
id: v.id,
vaccine_name: (v.diagnosis as string) || (meta?.vaccine_name as string) || "Vaccination",
administered_on: v.record_time,
next_due_date: (meta?.next_due_date as string) || null,
notes: v.notes,
}
})
}
}

const residentBook = buildResidentBookData(profile,
pets?? [],
allergiesMap,
medsMap,
weightLogsMap,
diseasesMap,
vaccinationsMap,)

return (<ResidentBookSection book={residentBook} hasPets={hasPets?? false} />)
}
