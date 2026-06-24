"use client"

import { PetForm, type PetFormPayload } from "@/components/pets/pet-form"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  insertPetAttachment,
  insertPetDisease,
  insertPetMedication,
  deletePetAttachmentRecord,
  upsertEnvironmentProfile,
} from "@/lib/supabase/actions/pet-form-actions"
import { deletePetAttachment, deletePetAvatar, uploadPetAttachment, uploadPetAvatar } from "@/lib/supabase/storage"
import { useState } from "react"

interface EditPetFormProps {
  pet: {
    id: string
    name: string | null
    species: string | null
    breed: string | null
    age_years: number | null
    age_months: number | null
    age_days: number | null
    gender: string | null
    weight_kg: number | null
    neutered: boolean | null
    photo_url: string | null
    stomach_health: string | null
    pet_source: string | null
    home_age_years: number | null
    home_age_months: number | null
    home_age_days: number | null
    birth_date: string | null
    home_date: string | null
  }
  initialDiseases: Array<{
    id: string
    name: string
    diagnosed_on: string
    status: string
    severity: string
    notes: string
  }>
  initialMedications: Array<{
    id: string
    name: string
    dosage: string
    frequency: string
    started_on: string
    is_ongoing: boolean
    notes: string
  }>
  initialAttachments: Array<{
    id: string
    category: string
    file_name: string
    file_path: string
    file_url: string
    file_type: string | null
    file_size: number | null
    is_new: false
  }>
  initialEnvironment?: {
    region?: string | null
    city?: string | null
    district?: string | null
    multi_pet_household?: boolean | null
    pet_count?: number | null
    has_children?: boolean | null
    indoor_outdoor?: string | null
    activity_level?: string | null
  }
}

export function EditPetForm({
  pet,
  initialDiseases,
  initialMedications,
  initialAttachments,
  initialEnvironment,
}: EditPetFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)

  async function handleSubmit(payload: PetFormPayload) {
    if (!user) return { ok: false as const, error: "未登录" }
    try {
      // 1. Update pet
      const { error: petErr } = await supabase
        .from("pets")
        .update(payload.pet)
        .eq("id", pet.id)
      if (petErr) return { ok: false as const, error: petErr.message }

      // 1.5. Handle avatar changes
      if (avatarFile) {
        // New avatar uploaded — delete old avatar first
        const { data: petData } = await supabase
          .from("pets")
          .select("photo_url")
          .eq("id", pet.id)
          .single()

        const up = await uploadPetAvatar(avatarFile, pet.id)
        if (up.url) {
          await supabase.from("pets").update({ photo_url: up.url }).eq("id", pet.id)

          // Delete old avatar file from storage
          if (petData?.photo_url) {
            await deletePetAvatar(pet.id, petData.photo_url).catch(() => null)
          }
        }
      } else if (avatarRemoved) {
        // Avatar was explicitly removed
        await supabase.from("pets").update({ photo_url: null }).eq("id", pet.id)
      }

      // 2. Sync diseases: delete all + re-insert (simple, robust)
      await supabase.from("pet_disease_records").delete().eq("pet_id", pet.id)
      for (const d of payload.diseases) {
        const { data: rec, error: dErr } = await insertPetDisease({ ...d, pet_id: pet.id }, user.id)
        if (dErr) {
          toast.warning(`疾病记录保存失败：${dErr.message}`)
          continue
        }
        // Link medical_record attachments to this disease
        const medicalAtts = payload.attachments.filter(
          (a) => a.category === "medical_record" && a.is_new && a.file
        )
        for (const a of medicalAtts) {
          const up = await uploadPetAttachment(a.file!, user.id)
          if (up.url && up.path) {
            await insertPetAttachment({
              pet_id: pet.id,
              owner_type: "pet_disease",
              owner_id: rec?.id ?? null,
              category: "medical_record",
              file_name: a.file_name,
              file_path: up.path,
              file_url: up.url,
              file_type: a.file_type,
              file_size: a.file_size,
              uploaded_by: user.id,
            })
          }
        }
      }

      // 3. Sync medications
      await supabase.from("pet_medication_records").delete().eq("pet_id", pet.id)
      for (const m of payload.medications) {
        const { data: rec, error: mErr } = await insertPetMedication({ ...m, pet_id: pet.id }, user.id)
        if (mErr) {
          toast.warning(`用药记录保存失败：${mErr.message}`)
          continue
        }
        const medAtts = payload.attachments.filter(
          (a) => a.category === "medication_proof" && a.is_new && a.file
        )
        for (const a of medAtts) {
          const up = await uploadPetAttachment(a.file!, user.id)
          if (up.url && up.path) {
            await insertPetAttachment({
              pet_id: pet.id,
              owner_type: "pet_medication",
              owner_id: rec?.id ?? null,
              category: "medication_proof",
              file_name: a.file_name,
              file_path: up.path,
              file_url: up.url,
              file_type: a.file_type,
              file_size: a.file_size,
              uploaded_by: user.id,
            })
          }
        }
      }

      // 4. Handle removed attachments: detect by id present in initialAttachments but not in payload.attachments
      const newIds = new Set(payload.attachments.map((a) => a.id))
      for (const old of initialAttachments) {
        if (!newIds.has(old.id)) {
          // Remove DB record and storage file
          await deletePetAttachmentRecord(old.id, user.id)
          await deletePetAttachment(user.id, old.file_path).catch(() => null)
        }
      }

      // 5. Upload new general attachments
      for (const a of payload.attachments) {
        if (a.is_new && a.file) {
          const up = await uploadPetAttachment(a.file!, user.id)
          if (up.url && up.path) {
            await insertPetAttachment({
              pet_id: pet.id,
              owner_type: "pet_general",
              owner_id: null,
              category: a.category,
              file_name: a.file_name,
              file_path: up.path,
              file_url: up.url,
              file_type: a.file_type,
              file_size: a.file_size,
              uploaded_by: user.id,
            })
          }
        }
      }

      // 6. Save environment profile
      if (payload.environment.region || payload.environment.city) {
        await upsertEnvironmentProfile({
          pet_id: pet.id,
          profile_id: user.id,
          region: payload.environment.region,
          city: payload.environment.city,
          district: payload.environment.district,
          multi_pet_household: payload.environment.multi_pet_household,
          pet_count: payload.environment.pet_count,
          has_children: payload.environment.has_children,
          indoor_outdoor: payload.environment.indoor_outdoor,
          activity_level: payload.environment.activity_level,
        }, user.id)
      }

      toast.success("宠物档案已更新")
      router.push("/dashboard/pets")
      router.refresh()
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "未知错误" }
    }
  }

  return (
    <PetForm
      pet={{
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age_years: pet.age_years,
        age_months: pet.age_months,
        age_days: pet.age_days,
        gender: pet.gender,
        weight_kg: pet.weight_kg,
        neutered: pet.neutered,
        photo_url: pet.photo_url,
        stomach_health: pet.stomach_health,
        pet_source: pet.pet_source,
        home_age_years: pet.home_age_years,
        home_age_months: pet.home_age_months,
        home_age_days: pet.home_age_days,
        birth_date: pet.birth_date,
        home_date: pet.home_date,
      }}
      initialDiseases={initialDiseases}
      initialMedications={initialMedications}
      initialAttachments={initialAttachments}
      initialEnvironment={initialEnvironment}
      onSubmit={handleSubmit}
      onAvatarChange={(file) => {
        setAvatarFile(file)
        if (file === null) setAvatarRemoved(true)
      }}
    />
  )
}
