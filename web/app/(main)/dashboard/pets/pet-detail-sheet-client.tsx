"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatPetAge } from "@/lib/utils"
import Image from "next/image"
import { PetDeleteButton } from "@/components/pets/pet-delete-button"
import { useTranslations, useLocale } from "next-intl"

export function PetDetailSheetClient({
pet,
lifeStageLabels,
}: {
pet: any
lifeStageLabels: Record<string, { label: string; variant: string }>
}) {
const tPet = useTranslations("Pet")
const tHealth = useTranslations("Health")
const locale = useLocale()
const lifeStage = pet.life_stage
const lifeStageInfo = lifeStage? lifeStageLabels[lifeStage]: null

return (<div className="w-full overflow-hidden rounded-[14px] border border-transparent bg-[#F7F6F3] transition-all hover:border-[rgba(0,0,0,0.06)] hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
{/* Click tocard navigate to full profile page */}
<Link
href={`/dashboard/pets/${pet.id}`}
className="flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors"
>
<div className="relative flex size-12 shrink-0 overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
{pet.photo_url? (<Image src={pet.photo_url} alt={pet.name} fill className="object-cover" sizes="48px" />): (<div className="flex size-full items-center justify-center">
<EmojiIcon
name={pet.species === "cat"? "Cat": pet.species === "dog"? "Dog": "PawPrint"}
size={24}
/>
</div>)}
</div>
<div className="flex-1">
<div className="flex items-center gap-2">
<p className="text-[15px] font-semibold text-[#111111]">{pet.name}</p>
{lifeStageInfo && (<Badge variant={lifeStageInfo.variant as any} className="text-[10.5px]">
{lifeStageInfo.label}
</Badge>)}
</div>
<p className="mt-0.5 text-[12.5px] text-[#6B6B6B]">
{pet.breed?? tHealth("unknownBreed")} · {formatPetAge(pet, locale)}
{pet.stomach_health === "sensitive" && ` · ${tPet("sensitive")}`}
</p>
</div>
{/* Deletebutton(prevent propagation,not will trigger navigate) */}
{pet.id && <PetDeleteButton petId={pet.id} petName={pet.name} />}
</Link>
</div>)
}
