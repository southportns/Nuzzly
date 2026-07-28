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

  // 构建单一户口簿：户主=用户，成员=所有宠物
  const allergiesMap: Record<string, any[]> = {}
  const medsMap: Record<string, any[]> = {}
  const weightLogsMap: Record<string, any[]> = {}

  if (pets && pets.length > 0) {
    const petIds = pets.map((pet) => pet.id)
    const [allergiesRes, medsRes, weightLogsRes] = await Promise.all([
      supabase.from("pet_allergies").select("*").in("pet_id", petIds),
      supabase.from("pet_medication_records").select("*").in("pet_id", petIds).order("started_on", { ascending: false }),
      supabase
        .from("health_records")
        .select("id, weight_kg, record_time, pet_id")
        .in("pet_id", petIds)
        .eq("record_type", "weight")
        .not("weight_kg", "is", null)
        .order("record_time", { ascending: true }),
    ])

    for (const pet of pets) {
      allergiesMap[pet.id] = (allergiesRes.data ?? []).filter((a) => a.pet_id === pet.id)
      medsMap[pet.id] = (medsRes.data ?? []).filter((m) => m.pet_id === pet.id)
      weightLogsMap[pet.id] = (weightLogsRes.data ?? [])
        .filter((w) => w.pet_id === pet.id)
        .map((d) => ({
          id: d.id,
          weight_kg: d.weight_kg!,
          logged_date: d.record_time?.split("T")[0] || new Date().toISOString().split("T")[0],
        }))
    }
  }

  const residentBook = buildResidentBookData(
    profile,
    pets ?? [],
    allergiesMap,
    medsMap,
    weightLogsMap
  )

  return (
    <ResidentBookSection book={residentBook} hasPets={hasPets ?? false} />
  )
}
