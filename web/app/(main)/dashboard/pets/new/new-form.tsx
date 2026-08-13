"use client"

import { PetForm, type PetFormPayload } from "@/components/pets/pet-form"
import { createClient } from "@/lib/supabase/client"
import { insertPetAttachment, insertPetDisease, insertPetMedication, upsertEnvironmentProfile } from "@/lib/supabase/actions/pet-form-actions"
import { uploadPetAttachment, uploadPetAvatar } from "@/lib/supabase/storage"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"
import { useTranslations } from "next-intl"

export function NewPetForm() {
const { user } = useAuth()
const router = useRouter()
const tPet = useTranslations("Pet")
const supabase = createClient()
const [avatarFile, setAvatarFile] = useState<File | null>(null)

async function handleSubmit(payload: PetFormPayload) {
if (!user) {
return { ok: false as const, error: tPet("notSignIn") }
}
try {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const petData: Record<string, any> = {...payload.pet, profile_id: user.id }
const { data: pet, error: petErr } = await supabase.from("pets").insert(petData).select("id").single()
if (petErr ||!pet) return { ok: false as const, error: petErr?.message?? tPet("creationFailed") }
const petId = pet.id

if (avatarFile) {
const up = await uploadPetAvatar(avatarFile, user.id, petId)
if (up.url) {
await supabase.from("pets").update({ photo_url: up.url }).eq("id", petId)
}
}

for (const d of payload.diseases) {
const { data: rec, error: dErr } = await insertPetDisease({...d, pet_id: petId }, user.id)
if (dErr) {
toast.warning(tPet("diseaseRecordSaveFailed", { error: dErr.message }))
continue
}
const medicalAtts = payload.attachments.filter((a) => a.category === "medical_record" && a.is_new && a.file)
for (const a of medicalAtts) {
const up = await uploadPetAttachment(a.file!, user.id)
if (up.url && up.path) {
await insertPetAttachment({
pet_id: petId, owner_type: "pet_disease", owner_id: rec?.id?? null,
category: "medical_record", file_name: a.file_name, file_path: up.path,
file_url: up.url, file_type: a.file_type, file_size: a.file_size, uploaded_by: user.id,
})
}
}
}

for (const m of payload.medications) {
const { data: rec, error: mErr } = await insertPetMedication({...m, pet_id: petId }, user.id)
if (mErr) {
toast.warning(tPet("medicationRecordSaveFailed", { error: mErr.message }))
continue
}
const medAtts = payload.attachments.filter((a) => a.category === "medication_proof" && a.is_new && a.file)
for (const a of medAtts) {
const up = await uploadPetAttachment(a.file!, user.id)
if (up.url && up.path) {
await insertPetAttachment({
pet_id: petId, owner_type: "pet_medication", owner_id: rec?.id?? null,
category: "medication_proof", file_name: a.file_name, file_path: up.path,
file_url: up.url, file_type: a.file_type, file_size: a.file_size, uploaded_by: user.id,
})
}
}
}

const generalAtts = payload.attachments.filter((a) =>
a.is_new && a.file &&
(a.category === "purchase_proof" || a.category === "other" || a.category === "medical_record" || a.category === "medication_proof"))
for (const a of generalAtts) {
const up = await uploadPetAttachment(a.file!, user.id)
if (up.url && up.path) {
await insertPetAttachment({
pet_id: petId, owner_type: "pet_general", owner_id: null,
category: a.category, file_name: a.file_name, file_path: up.path,
file_url: up.url, file_type: a.file_type, file_size: a.file_size, uploaded_by: user.id,
})
}
}

if (payload.environment.region || payload.environment.city) {
await upsertEnvironmentProfile({
pet_id: petId, profile_id: user.id, region: payload.environment.region,
city: payload.environment.city, district: payload.environment.district,
multi_pet_household: payload.environment.multi_pet_household, pet_count: payload.environment.pet_count,
has_children: payload.environment.has_children, indoor_outdoor: payload.environment.indoor_outdoor,
activity_level: payload.environment.activity_level,
}, user.id)
}

toast.success(tPet("petCreated"))
router.refresh()
router.push("/dashboard/pets")
return { ok: true as const }
} catch (e) {
return { ok: false as const, error: e instanceof Error? e.message: tPet("unknownError") }
}
}

return (<PetForm onSubmit={handleSubmit} onAvatarChange={setAvatarFile} />)
}
