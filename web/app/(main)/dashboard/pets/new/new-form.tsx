"use client"

import { PetForm, type PetFormPayload } from "@/components/pets/pet-form"
import { createClient } from "@/lib/supabase/client"
import { insertPetAttachment, insertPetDisease, insertPetMedication, upsertEnvironmentProfile } from "@/lib/supabase/actions/pet-form-actions"
import { uploadPetAttachment, uploadPetAvatar } from "@/lib/supabase/storage"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"

export function NewPetForm() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  async function handleSubmit(payload: PetFormPayload) {
    if (!user) {
      return { ok: false as const, error: "未登录" }
    }
    try {
      // 1. Upload avatar first (if any)
      let photoUrl: string | null = null
      if (avatarFile) {
        const up = await uploadPetAvatar(avatarFile, "temp")
        if (up.url) {
          photoUrl = up.url
        }
      }

      // 2. Insert pet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const petData: Record<string, any> = { ...payload.pet, profile_id: user.id }
      if (photoUrl) petData.photo_url = photoUrl

      const { data: pet, error: petErr } = await supabase
        .from("pets")
        .insert(petData)
        .select("id")
        .single()
      if (petErr || !pet) return { ok: false as const, error: petErr?.message ?? "创建失败" }

      const petId = pet.id

      // Re-upload avatar with correct petId if needed
      if (avatarFile && photoUrl) {
        const up = await uploadPetAvatar(avatarFile, petId)
        if (up.url) {
          await supabase.from("pets").update({ photo_url: up.url }).eq("id", petId)
        }
      }

      // 2. Insert disease records
      for (const d of payload.diseases) {
        const { data: rec, error: dErr } = await insertPetDisease({ ...d, pet_id: petId }, user.id)
        if (dErr) {
          toast.warning(`疾病记录保存失败：${dErr.message}`)
          continue
        }
        // Link any medical_record attachments to this disease
        const medicalAtts = payload.attachments.filter(
          (a) => a.category === "medical_record" && a.is_new && a.file
        )
        for (const a of medicalAtts) {
          const up = await uploadPetAttachment(a.file!, user.id)
          if (up.url && up.path) {
            await insertPetAttachment({
              pet_id: petId,
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

      // 3. Insert medication records
      for (const m of payload.medications) {
        const { data: rec, error: mErr } = await insertPetMedication({ ...m, pet_id: petId }, user.id)
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
              pet_id: petId,
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

      // 4. Upload general attachments (purchase_proof / other)
      const generalAtts = payload.attachments.filter(
        (a) =>
          a.is_new &&
          a.file &&
          (a.category === "purchase_proof" || a.category === "other" || a.category === "medical_record" || a.category === "medication_proof")
      )
      for (const a of generalAtts) {
        // skip ones already linked above
        const up = await uploadPetAttachment(a.file!, user.id)
        if (up.url && up.path) {
          await insertPetAttachment({
            pet_id: petId,
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

      // 5. Save environment profile
      if (payload.environment.region || payload.environment.city) {
        await upsertEnvironmentProfile({
          pet_id: petId,
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

      toast.success("宠物档案已创建")
      router.refresh()
      router.push("/dashboard/pets")
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "未知错误" }
    }
  }

  return (
    <PetForm
      onSubmit={handleSubmit}
      onAvatarChange={setAvatarFile}
    />
  )
}
