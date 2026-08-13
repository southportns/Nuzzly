"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { createClient } from "@/lib/supabase/client"
import { createPetAllergy } from "@/lib/supabase/actions/pet-form-actions"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface AllergyEntry {
id: string
allergen: string
severity: string
}

interface DietaryPreferenceFormProps {
petId: string
petName: string
onComplete?: () => void
onSkip?: () => void
}

function genId() {
return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function DietaryPreferenceForm({ petId, petName, onComplete, onSkip }: DietaryPreferenceFormProps) {
const t = useTranslations("DietaryPreference")
const tCommon = useTranslations("Common")
const { user } = useAuth()
const supabase = createClient()
const [currentFood, setCurrentFood] = useState("")
const [stomachHealth, setStomachHealth] = useState("normal")
const [allergies, setAllergies] = useState<AllergyEntry[]>([])
const [newAllergen, setNewAllergen] = useState("")
const [newSeverity, setNewSeverity] = useState("mild")
const [notes, setNotes] = useState("")
const [submitting, setSubmitting] = useState(false)
const [completed, setCompleted] = useState(false)

const stomachOptions = useMemo<SelectOption[]>(() => [
{ value: "normal", label: t("stomachNormal"), description: t("stomachNormalDesc") },
{ value: "sensitive", label: t("stomachSensitive"), description: t("stomachSensitiveDesc") },
{ value: "very_sensitive", label: t("stomachVerySensitive"), description: t("stomachVerySensitiveDesc") },
], [t])

const severityOptions = useMemo<SelectOption[]>(() => [
{ value: "mild", label: t("severityMild") },
{ value: "moderate", label: t("severityModerate") },
{ value: "severe", label: t("severitySevere") },
], [t])

function addAllergy() {
if (!newAllergen.trim()) return
setAllergies((prev) => [...prev,
{ id: genId(), allergen: newAllergen.trim(), severity: newSeverity },
])
setNewAllergen("")
setNewSeverity("mild")
}

function removeAllergy(id: string) {
setAllergies((prev) => prev.filter((a) => a.id !== id))
}

async function handleSubmit() {
if (submitting) return
if (!user) {
toast.error(t("signInRequired"))
return
}
setSubmitting(true)

try {
const { error: petErr } = await supabase.from("pets").update({ stomach_health: stomachHealth as "normal" | "sensitive" | "very_sensitive" }).eq("id", petId)
if (petErr) throw petErr

const allergyErrors: string[] = []
for (const allergy of allergies) {
const { error } = await createPetAllergy({
pet_id: petId,
allergen: allergy.allergen,
severity: allergy.severity,
confirmed: false,
}, user.id)
if (error) allergyErrors.push(`${allergy.allergen}: ${error.message}`)
}
if (allergyErrors.length > 0) {
toast.warning(t("allergySavePartialFailed", { errors: allergyErrors.join(", ") }))
}

if (currentFood.trim()) {
await supabase.from("diet_logs").insert({
pet_id: petId,
profile_id: user.id,
food_name: currentFood.trim(),
food_type: "dry_food",
notes: notes.trim() || tCommon("noData"),
logged_date: new Date().toISOString().split("T")[0],
})
}

setCompleted(true)
toast.success(t("saveSuccess"))
} catch (e) {
toast.error(e instanceof Error ? e.message : t("saveFailed"))
} finally {
setSubmitting(false)
}
}

if (completed) {
return (<div className="mx-auto max-w-[480px] text-center">
<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#A8C5A0]/15">
<EmojiIcon name="Check" className="size-8 text-[#A8C5A0]" />
</div>
<h3 className="text-[18px] font-semibold text-[#111111]">{t("settingsDone")}</h3>
<p className="mt-2 text-[14px] text-[#6B6B6B]">
{t("settingsDoneDesc", { name: petName })}
</p>
<Button
onClick={onComplete}
className="mt-6 h-11 rounded-full bg-[#FF7A59] px-8 text-[14px] font-semibold text-white hover:bg-[#E86A4A]"
>
{t("viewRecommendations")}
</Button>
</div>)
}

return (<div className="mx-auto max-w-[480px] space-y-6">
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
<div className="mb-5 flex items-start gap-3">
<div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC] text-[#FF7A59]">
<EmojiIcon name="Utensils" className="size-4" />
</div>
<div>
<h2 className="text-[16px] font-semibold text-[#111111]">{t("title")}</h2>
<p className="mt-1 text-[12.5px] text-[#6B6B6B]">
{t("subtitle", { name: petName })}
</p>
</div>
</div>

<div className="space-y-5">
<div className="space-y-1.5">
<Label className="text-[12.5px] font-medium text-[#444444]">{t("currentFood")}</Label>
<Input
value={currentFood}
onChange={(e) => setCurrentFood(e.target.value)}
placeholder={t("currentFoodPlaceholder")}
className="h-11 rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:ring-[3px] focus-visible:ring-[#FF7A59]/12 focus-visible:outline-none"
/>
</div>

<div className="space-y-1.5">
<Label className="text-[12.5px] font-medium text-[#444444]">{t("stomachCondition")}</Label>
<SelectDropdown
value={stomachHealth}
onChange={setStomachHealth}
options={stomachOptions}
/>
</div>

<div className="space-y-1.5">
<Label className="text-[12.5px] font-medium text-[#444444]">
<span className="flex items-center gap-1.5">
<EmojiIcon name="AlertTriangle" className="size-3.5 text-[#ff9500]" />
{t("allergy")}
</span>
</Label>
{allergies.length > 0 && (<div className="mb-2 flex flex-wrap gap-2">
{allergies.map((a) => (<span
key={a.id}
className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.06)] bg-white px-3 py-1.5 text-[12.5px] text-[#444444]"
>
{a.allergen}
<span className="text-[10px] text-[#9A9A95]">
{severityOptions.find((s) => s.value === a.severity)?.label}
</span>
<button
type="button"
onClick={() => removeAllergy(a.id)}
className="ml-0.5 text-[#9A9A95] hover:text-[#FF3B30]"
>
<EmojiIcon name="X" className="size-3" />
</button>
</span>))}
</div>)}
<div className="flex gap-2">
<Input
value={newAllergen}
onChange={(e) => setNewAllergen(e.target.value)}
placeholder={t("allergyPlaceholder")}
className="h-9 flex-1 rounded-[10px] border-[rgba(0,0,0,0.08)] bg-white px-3 text-[13px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:outline-none"
onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
/>
<SelectDropdown
value={newSeverity}
onChange={setNewSeverity}
options={severityOptions}
triggerClassName="h-9 w-[80px] text-[12px]"
contentClassName="min-w-[100px]"
/>
<Button
type="button"
variant="outline"
size="sm"
onClick={addAllergy}
disabled={!newAllergen.trim()}
className="h-9 rounded-[10px] border-[rgba(0,0,0,0.08)] px-3"
>
<EmojiIcon name="Plus" className="size-3.5" />
</Button>
</div>
</div>

<div className="space-y-1.5">
<Label className="text-[12.5px] font-medium text-[#444444]">{t("otherNotes")}</Label>
<Textarea
value={notes}
onChange={(e) => setNotes(e.target.value)}
placeholder={t("notesPlaceholder")}
className="min-h-[60px] rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-2.5 text-[14px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:outline-none"
rows={2}
/>
</div>
</div>
</div>

<div className="flex flex-col gap-3">
<Button
onClick={handleSubmit}
disabled={submitting}
className="h-12 rounded-full bg-[#FF7A59] text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(255,122,89,0.3)] hover:bg-[#E86A4A]"
>
{submitting && <EmojiIcon name="Loader2" className="mr-2 size-4 animate-spin" />}
{t("saveAndRecommend")}
</Button>
{onSkip && (<button
type="button"
onClick={onSkip}
className="text-[13px] text-[#6B6B6B] hover:text-[#111111]"
>
{t("skipForNow")}
</button>)}
</div>
</div>)
}
