"use client"

import { useState } from "react"
import { QuickPetForm, type QuickPetFormPayload } from "@/components/pets/quick-pet-form"
import { PetForm, type PetFormPayload } from "@/components/pets/pet-form"
import { DietaryPreferenceForm } from "@/components/dashboard/dietary-preference-form"
import { createClient } from "@/lib/supabase/client"
import { uploadPetAvatar } from "@/lib/supabase/storage"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"

type FlowStep = "quick" | "full" | "dietary"

export function QuickPetFlow() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<FlowStep>("quick")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [createdPet, setCreatedPet] = useState<{ id: string; name: string } | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[#FF7A59]" />
      </div>
    )
  }

  async function handleQuickSubmit(payload: QuickPetFormPayload) {
    if (!user) return { ok: false as const, error: "未登录" }
    try {
      const { data: pet, error } = await supabase
        .from("pets")
        .insert({
          name: payload.name,
          species: payload.species,
          breed: payload.breed,
          age_years: payload.age_years,
          age_months: payload.age_months,
          profile_id: user.id,
        })
        .select("id, name")
        .single()

      if (error || !pet) return { ok: false as const, error: error?.message ?? "创建失败" }

      setCreatedPet({ id: pet.id, name: pet.name })
      toast.success("宠物档案已创建！")
      setStep("dietary")
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "未知错误" }
    }
  }

  async function handleFullSubmit(payload: PetFormPayload) {
    if (!user) return { ok: false as const, error: "未登录" }
    try {
      const petData: Record<string, unknown> = { ...payload.pet, profile_id: user.id }

      const { data: pet, error: petErr } = await supabase
        .from("pets")
        .insert(petData)
        .select("id, name")
        .single()

      if (petErr || !pet) return { ok: false as const, error: petErr?.message ?? "创建失败" }

      // Upload avatar with correct pet ID (single upload, no temp)
      if (avatarFile) {
        const up = await uploadPetAvatar(avatarFile, pet.id)
        if (up.url) {
          await supabase.from("pets").update({ photo_url: up.url }).eq("id", pet.id)
        }
      }

      setCreatedPet({ id: pet.id, name: pet.name })
      toast.success("宠物档案已创建")
      setStep("dietary")
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "未知错误" }
    }
  }

  function handleDietaryComplete() {
    router.push("/dashboard")
    router.refresh()
  }

  if (step === "dietary" && createdPet) {
    return (
      <DietaryPreferenceForm
        petId={createdPet.id}
        petName={createdPet.name}
        onComplete={handleDietaryComplete}
        onSkip={handleDietaryComplete}
      />
    )
  }

  if (step === "quick") {
    return (
      <div className="space-y-6">
        <QuickPetForm
          onSubmit={handleQuickSubmit}
          onSkip={() => setStep("full")}
        />
        <div className="text-center">
          <button
            onClick={() => setStep("full")}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#FF7A59] hover:underline"
          >
            <Sparkles className="size-3.5" />
            填写完整档案（可选）
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setStep("quick")}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#6B6B6B] hover:text-[#111111]"
      >
        <ArrowLeft className="size-3.5" />
        返回快速建档
      </button>
      <PetForm
        onSubmit={handleFullSubmit}
        onAvatarChange={setAvatarFile}
      />
    </div>
  )
}
