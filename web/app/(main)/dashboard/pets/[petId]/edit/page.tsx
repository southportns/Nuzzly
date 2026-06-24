import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { EditPetForm } from "./edit-form"

export const metadata = {
  title: "编辑宠物档案 — PetRWD",
}

export default async function EditPetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const supabase = await createClient()
  const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single()
  if (!pet) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const [{ data: diseases }, { data: medications }, { data: attachments }, { data: environment }] = await Promise.all([
    db.from("pet_disease_records").select("*").eq("pet_id", petId).order("diagnosed_on", { ascending: false, nullsFirst: false }),
    db.from("pet_medication_records").select("*").eq("pet_id", petId).order("started_on", { ascending: false, nullsFirst: false }),
    db.from("pet_attachments").select("*").eq("pet_id", petId).order("created_at", { ascending: false }),
    db.from("environment_profiles").select("*").eq("pet_id", petId).single(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          编辑宠物档案
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">更新 {pet.name} 的资料</p>
      </div>
      <EditPetForm
        pet={pet}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDiseases={(diseases ?? []).map((d: any) => ({
          id: d.id,
          name: d.name ?? "",
          diagnosed_on: d.diagnosed_on ?? "",
          status: d.status ?? "active",
          severity: d.severity ?? "unknown",
          notes: d.notes ?? "",
        }))}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialMedications={(medications ?? []).map((m: any) => ({
          id: m.id,
          name: m.name ?? "",
          dosage: m.dosage ?? "",
          frequency: m.frequency ?? "",
          started_on: m.started_on ?? "",
          is_ongoing: m.is_ongoing ?? true,
          notes: m.notes ?? "",
        }))}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialAttachments={(attachments ?? []).map((a: any) => ({
          id: a.id,
          category: a.category ?? "other",
          file_name: a.file_name,
          file_path: a.file_path,
          file_url: a.file_url,
          file_type: a.file_type,
          file_size: a.file_size,
          is_new: false,
        }))}
        initialEnvironment={environment ? {
          region: environment.region ?? null,
          city: environment.city ?? null,
          district: environment.district ?? null,
          multi_pet_household: environment.multi_pet_household ?? null,
          pet_count: environment.pet_count ?? null,
          has_children: environment.has_children ?? null,
          indoor_outdoor: environment.indoor_outdoor ?? null,
          activity_level: environment.activity_level ?? null,
        } : undefined}
      />
    </div>
  )
}
