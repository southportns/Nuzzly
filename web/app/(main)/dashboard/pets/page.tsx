import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { queryPets } from "@/lib/supabase/queries/profile-queries"
import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatPetAge } from "@/lib/utils"
import Image from "next/image"
import { PetDetailSheetClient } from "./pet-detail-sheet-client"
import { getTranslations } from "next-intl/server"

export const metadata = {
title: "MyPet — Nuzzly Town",
}

export default async function DashboardPetsPage() {
const t = await getTranslations("Pet")
const supabase = await createClient()
const {
data: { user },
} = await supabase.auth.getUser()

if (!user) {
redirect("/login")
}

// 服务端直接查询该User allPet
const { data: pets } = await queryPets(user.id)

const lifeStageLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
kitten: { label: t("kitten"), variant: "default" },
young_adult: { label: t("youngAdult"), variant: "secondary" },
adult: { label: t("adult"), variant: "outline" },
senior: { label: t("senior"), variant: "destructive" },
}

return (<div className="space-y-6">
<div className="flex items-end justify-between">
<div>
<h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
{t("myPet")}
</h1>
<p className="mt-2 text-[14px] text-[#6B6B6B]">
{t("managePets")}
</p>
</div>
<Link
href="/dashboard/pets/new"
className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#E86A4A] active:scale-[0.98]"
>
<EmojiIcon name="Plus" className="size-4" />
{t("addPet")}
</Link>
</div>

<section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
{pets && pets.length > 0? (<div className="space-y-2">
{pets.map((pet) => {
const lifeStage = pet.life_stage
const lifeStageInfo = lifeStage? lifeStageLabels[lifeStage]: null
return (<div key={pet.id} className="w-full">
{/* Click tocard open details sheet(componentmanagement state) */}
<PetDetailSheetClient
pet={pet}
lifeStageLabels={lifeStageLabels}
/>
</div>)
})}
</div>): (<div className="py-12 text-center">
<EmojiIcon name="PawPrint" className="mx-auto size-10 text-[#D2D1CF]" />
<p className="mt-3 text-[14px] text-[#6B6B6B]">{t("noPetProfile")}</p>
<p className="mt-1 text-[12px] text-[#D2D1CF]">{t("managePets")}</p>
<Link
href="/dashboard/pets/new"
className="mt-5 inline-flex h-[40px] items-center gap-1.5 rounded-full bg-[#FF7A59] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#E86A4A]"
>
<EmojiIcon name="Plus" className="size-4" />
{t("createFirstPet")}
</Link>
</div>)}
</section>
</div>)
}
