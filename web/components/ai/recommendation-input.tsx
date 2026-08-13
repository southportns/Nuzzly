"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations } from "next-intl"

interface Pet {
id: string
name: string
breed: string | null
species: string
stomach_health: string
}

interface Props {
onRecommend: (petId: string, query: string) => void
loading: boolean
}

export function RecommendationInput({ onRecommend, loading }: Props) {
const { user } = useAuth()
const supabase = createClient()
const [pets, setPets] = useState<Pet[]>([])
const [selectedPetId, setSelectedPetId] = useState("")
const [query, setQuery] = useState("")
const [loadingPets, setLoadingPets] = useState(true)
const t = useTranslations("AI")

useEffect(() => {
if (user) {
supabase.from("pets").select("id,name,breed,species,stomach_health").eq("profile_id", user.id).eq("is_active", true).then(({ data }) => {
const petsData = data as unknown as Pet[] | null
setPets(petsData?? [])
setLoadingPets(false)
})
}
}, [user])

function handleSubmit(e: React.FormEvent) {
e.preventDefault()
if (!selectedPetId) return
onRecommend(selectedPetId, query)
}

return (<Card className="border-primary/20 bg-gradient-to-br from-primary/3 to-transparent mb-8">
<CardHeader>
<CardTitle className="flex items-center gap-2 text-base">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-primary">
<circle cx="9" cy="9" r="1.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<path d="m10.5025,16.0509c-.4686.2906-.9744.4491-1.5025.4491-2.428,0-4.397-3.358-4.397-7.5S6.572,1.5,9,1.5s4.397,3.358,4.397,7.5c0,1.384-.22,2.681-.603,3.793" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<path d="m8.5735,4.6109c.1413-.0046.2836-.0069.4265-.0069,4.142,0,7.5,1.968,7.5,4.397s-3.358,4.397-7.5,4.397-7.5-1.97-7.5-4.398c0-1.617,1.489-3.03,3.707-3.794" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</svg>
{t("aiSmartRecTitle")}
</CardTitle>
<p className="text-xs text-muted-foreground">
{t("aiSmartRecDesc")}
</p>
</CardHeader>
<CardContent>
<form onSubmit={handleSubmit} className="space-y-4">
{loadingPets? (<Skeleton className="h-10 w-full rounded-lg" />): pets.length === 0? (<div className="text-center py-3 text-sm text-muted-foreground">
{t("noPetForRec")}
<Link href="/dashboard/pets/new" className="text-primary mx-1 hover:underline">{t("addPetForRec")}</Link>
{t("addPetForRecSuffix")}
</div>): (<>
<div>
<label className="text-xs text-muted-foreground mb-1.5 block">{t("selectPet")}</label>
<SelectDropdown
value={selectedPetId}
onChange={setSelectedPetId}
options={pets.map<SelectOption>((pet) => ({
value: pet.id,
label: `${pet.name} · ${pet.breed?? t("unknownBreed")}${pet.stomach_health === "sensitive"? ` · ${t("sensitiveStomach")}`: ""}`,
}))}
placeholder={t("selectPetPlaceholder")}
/>
</div>

<div>
<label className="text-xs text-muted-foreground mb-1.5 block">
{t("specificNeeds")}
</label>
<Input
value={query}
onChange={(e) => setQuery(e.target.value)}
placeholder={t("specificNeedsPlaceholder")}
/>
</div>

<Button type="submit" className="w-full gap-2" disabled={loading ||!selectedPetId}>
{loading? (<EmojiIcon name="Loader2" className="size-4 animate-spin" />): (<EmojiIcon name="Search" className="size-4" />)}
{loading? t("analyzing"): t("getSmartRec")}
</Button>
</>)}
</form>
</CardContent>
</Card>)
}
