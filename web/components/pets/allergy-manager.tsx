"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { createPetAllergy, deletePetAllergy } from "@/lib/supabase/actions/pet-form-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Allergy {
id: string
allergen: string
severity: string
confirmed: boolean | null
}

const severityConfig: Record<string, { label: string; className: string }> = {
mild: { label: "Mild", className: "bg-[#A8C5A0]/20 text-[#5A8A50]" },
moderate: { label: "Moderate", className: "bg-[#E8A87C]/20 text-[#C47A3C]" },
severe: { label: "Severe", className: "bg-[#E85D4A]/20 text-[#C43A2A]" },
}

const severityOptions: SelectOption[] = [
{ value: "mild", label: "Mild" },
{ value: "moderate", label: "Moderate" },
{ value: "severe", label: "Severe" },
]

export function AllergyManager({ petId, initialAllergies }: { petId: string; initialAllergies: Allergy[] }) {
const [allergies, setAllergies] = useState(initialAllergies)
const [showForm, setShowForm] = useState(false)
const [loading, setLoading] = useState(false)
const [allergen, setAllergen] = useState("")
const [severity, setSeverity] = useState("mild")
const [confirmed, setConfirmed] = useState(false)
const router = useRouter()
const { user } = useAuth()

async function handleAdd() {
if (loading) return
if (!allergen.trim()) return
if (!user) { openLoginModal(); return }
setLoading(true)

// P1: route through Write Gateway
const { error } = await createPetAllergy({
pet_id: petId,
allergen: allergen.trim(),
severity,
confirmed,
}, user.id)

setLoading(false)
if (error) {
toast.error(error.message)
return
}

// Optimistic insert (full row returned by DB; locally re-create id)
setAllergies((prev) => [...prev,
{
id: crypto.randomUUID(),
allergen: allergen.trim(),
severity,
confirmed,
},
])
setAllergen("")
setSeverity("mild")
setConfirmed(false)
setShowForm(false)
toast.success("AllergyalreadyAdd")
router.refresh()
}

async function handleDelete(id: string, isConfirmed: boolean) {
if (isConfirmed &&!confirm("AllergyalreadyConfirm, Delete？")) return
if (!user) { openLoginModal(); return }

// P1: route through Write Gateway
await deletePetAllergy(id, user.id)
setAllergies((prev) => prev.filter((a) => a.id!== id))
toast.success("AllergyalreadyDelete")
router.refresh()
}

return (<div>
{allergies.length === 0 &&!showForm? (<div className="py-6 text-center">
<p className="text-[14px] text-[#6B6B6B]">NoAllergy</p>
<Button
variant="ghost"
size="sm"
className="mt-2 text-[#FF7A59]"
onClick={() => setShowForm(true)}
>
<EmojiIcon name="Plus" className="mr-1 size-3.5" />AddAllergy
</Button>
</div>): (<>
<div className="flex flex-wrap gap-2">
{allergies.map((a) => {
const config = severityConfig[a.severity]?? severityConfig.mild
return (<div key={a.id} className="flex items-center gap-1.5">
<Badge variant="secondary" className={cn("gap-1.5", config.className)}>
{a.allergen}
<span className="text-[10px] opacity-70">{config.label}</span>
{a.confirmed && <span className="text-[10px]">✓</span>}
</Badge>
<button
type="button"
onClick={() => handleDelete(a.id,!!a.confirmed)}
className="text-[#D2D1CF] hover:text-[#E85D4A] transition-colors"
>
<EmojiIcon name="X" className="size-3.5" />
</button>
</div>)
})}
{!showForm && (<button
type="button"
onClick={() => setShowForm(true)}
className="flex items-center gap-1 rounded-full border border-dashed border-[rgba(0,0,0,0.1)] px-3 py-1 text-[13px] text-[#6B6B6B] hover:border-[#FF7A59] hover:text-[#FF7A59] transition-colors"
>
<EmojiIcon name="Plus" className="size-3" />Add
</button>)}
</div>
</>)}

{showForm && (<div className="mt-4 space-y-3 rounded-[12px] bg-[#F0EFED] p-4">
<div className="space-y-1.5">
<Label htmlFor="allergen">AllergyName</Label>
<Input
id="allergen"
value={allergen}
onChange={(e) => setAllergen(e.target.value)}
placeholder="e.g.:,,"
/>
</div>
<div className="grid grid-cols-2 gap-3">
<div className="space-y-1.5">
<Label>Severity</Label>
<SelectDropdown
value={severity}
onChange={setSeverity}
options={severityOptions}
/>
</div>
<div className="flex items-end gap-2 pb-1">
<Checkbox
id="confirmed"
checked={confirmed}
onCheckedChange={(v) => setConfirmed(v === true)}
/>
<Label htmlFor="confirmed" className="text-sm">alreadyConfirm</Label>
</div>
</div>
<div className="flex gap-2">
<Button size="sm" onClick={handleAdd} disabled={loading ||!allergen.trim()}>
{loading && <EmojiIcon name="Loader2" className="mr-1 size-3 animate-spin" />}
Add
</Button>
<Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
Cancel
</Button>
</div>
</div>)}
</div>)
}
