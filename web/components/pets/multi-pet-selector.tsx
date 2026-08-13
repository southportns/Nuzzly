"use client"

import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useTranslations } from "next-intl"

// ── Types ──
interface SiblingPet {
id: string
name: string
species: string
avatar_url: string | null
photo_url: string | null
breed: string | null
}

interface MultiPetSelectorProps {
/** Current pet ID (excluded from the list) */
currentPetId: string
/** Selected pet IDs */
selectedPetIds: string[]
/** Callback when selection changes */
onChange: (ids: string[]) => void
/** Optional: filter by species (e.g. only show cats if current pet is a cat) */
speciesFilter?: string | null
/** Optional: custom hint text shown when expanded */
hint?: string
}

/**
* Fetches all pets belonging to the current user (excluding currentPetId)
* and renders a compact multi-select list.
*/
export function MultiPetSelector({
currentPetId,
selectedPetIds,
onChange,
speciesFilter,
hint,
}: MultiPetSelectorProps) {
const tPet = useTranslations("Pet")
const { user } = useAuth()
const [pets, setPets] = useState<SiblingPet[]>([])
const [loading, setLoading] = useState(true)
const [expanded, setExpanded] = useState(false)
const supabase = createClient()

useEffect(() => {
if (!user) {
setLoading(false)
return
}
async function loadPets() {
const { data } = await supabase.from("pets").select("id, name, species, avatar_url, photo_url, breed").eq("profile_id", user!.id).eq("is_active", true).neq("id", currentPetId).order("created_at", { ascending: false })
setPets((data as SiblingPet[]) || [])
setLoading(false)
}
loadPets()
}, [user, currentPetId, supabase])

// Filter by species if specified
const filteredPets = useMemo(() => {
if (!speciesFilter) return pets
return pets.filter((p) => p.species === speciesFilter)
}, [pets, speciesFilter])

const selectedCount = selectedPetIds.length

if (loading || filteredPets.length === 0) return null

function togglePet(petId: string) {
if (selectedPetIds.includes(petId)) {
onChange(selectedPetIds.filter((id) => id!== petId))
} else {
onChange([...selectedPetIds, petId])
}
}

return (<div className="rounded-[12px] border border-[#FF7A59]/15 bg-[#FF7A59]/[0.03] p-3">
{/* Header — click to expand/collapse */}
<button
type="button"
onClick={() => setExpanded(!expanded)}
className="flex w-full items-center gap-2 text-left"
>
<FluentEmoji src={FLUENT_EMOJI.pawPrints} alt="paw prints" size={16} />
<div className="flex-1">
<span className="text-[12.5px] font-medium text-[#1a1a1a]">
{tPet("applyToOtherPets")}
</span>
{selectedCount > 0 && (<span className="ml-1.5 rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-[10px] font-medium text-[#FF7A59]">
{tPet("appliedPets", { count: selectedCount })}
</span>)}
</div>
<span className={cn("text-[#86867e] transition-transform", expanded && "rotate-90")}>
›
</span>
</button>

{/* Pet list — expandable */}
{expanded && (<div className="mt-3 space-y-1.5">
<p className="text-[11px] text-[#86867e]">
{hint?? tPet("applyToPetsHint")}
</p>
<div className="flex flex-wrap gap-2">
{filteredPets.map((pet) => {
const isSelected = selectedPetIds.includes(pet.id)
const avatarSrc = pet.avatar_url || pet.photo_url
return (<button
key={pet.id}
type="button"
onClick={() => togglePet(pet.id)}
className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-all",
isSelected? "border-[#FF7A59] bg-[#FF7A59]/8 text-[#FF7A59]": "border-black/[0.08] bg-white/60 text-[#86867e] hover:text-[#555]",)}
>
{/* Avatar */}
{avatarSrc? (<Image
src={avatarSrc}
alt={pet.name}
width={18}
height={18}
className="size-[18px] rounded-full object-cover"
/>): (<FluentEmoji
src={pet.species === "cat"? FLUENT_EMOJI.catFace: pet.species === "dog"? FLUENT_EMOJI.dogFace: FLUENT_EMOJI.pawPrints}
alt={pet.species}
size={16}
/>)}
{pet.name}
{isSelected && (<FluentEmoji src={FLUENT_EMOJI.checkMark} alt="check mark" size={12} />)}
</button>)
})}
</div>
</div>)}
</div>)
}
