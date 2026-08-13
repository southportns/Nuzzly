"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useMemo, useState, useTransition } from "react"
import { upsertEnvironmentProfile } from "@/lib/supabase/actions/pet-form-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import type { EnvironmentProfile, ClimateType, ActivityLevel } from "@/lib/supabase/types"
import { getProvinces, getCities, getDistricts } from "@/lib/china-regions"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface EnvironmentFormProps {
petId: string
profileId: string
initialData?: EnvironmentProfile | null
onSuccess?: () => void
}

export function EnvironmentForm({ petId, profileId, initialData, onSuccess }: EnvironmentFormProps) {
const t = useTranslations("Environment")
const [isPending, startTransition] = useTransition()
const [form, setForm] = useState({
province: initialData?.region || "",
city: initialData?.city || "",
district: initialData?.district || "",
climate_type: initialData?.climate_type || "",
multi_pet_household: initialData?.multi_pet_household || false,
pet_count: initialData?.pet_count || 1,
has_children: initialData?.has_children || false,
indoor_outdoor: initialData?.indoor_outdoor || "indoor",
activity_level: initialData?.activity_level || "medium",
})
const provinces = useMemo(() => getProvinces(), [])
const [cityOptions, setCityOptions] = useState<string[]>(() => (initialData?.region && initialData?.city ? getCities(initialData.region) : []))
const [districtOptions, setDistrictOptions] = useState<string[]>(() => (initialData?.region && initialData?.city ? getDistricts(initialData.region, initialData.city) : []))

const climateOptions: SelectOption[] = [
{ value: "tropical", label: t("climateTropical") },
{ value: "subtropical", label: t("climateSubtropical") },
{ value: "temperate", label: t("climateTemperate") },
{ value: "continental", label: t("climateContinental") },
{ value: "arid", label: t("climateArid") },
{ value: "cold", label: t("climateCold") },
]

const indoorOutdoorOptions: SelectOption[] = [
{ value: "indoor", label: t("indoorOnly") },
{ value: "outdoor", label: t("outdoorOnly") },
{ value: "both", label: t("indoorOutdoorBoth") },
]

const activityOptions: SelectOption[] = [
{ value: "very_low", label: t("activityVeryLow") },
{ value: "low", label: t("activityLow") },
{ value: "medium", label: t("activityMedium") },
{ value: "high", label: t("activityHigh") },
{ value: "very_high", label: t("activityVeryHigh") },
]

function handleSubmit(e: React.FormEvent) {
e.preventDefault()
startTransition(async () => {
const { error } = await upsertEnvironmentProfile({
pet_id: petId,
profile_id: profileId,
region: form.province || null,
city: form.city || null,
district: form.district || null,
climate_type: (form.climate_type as ClimateType) || null,
multi_pet_household: form.multi_pet_household,
pet_count: form.pet_count,
has_children: form.has_children,
indoor_outdoor: form.indoor_outdoor as "indoor" | "outdoor" | "both",
activity_level: form.activity_level as ActivityLevel,
}, profileId)

if (!error) {
toast.success(t("saveSuccess"))
onSuccess?.()
} else {
toast.error(t("saveFailed", { error: error.message }))
}
})
}

return (<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2 text-base">
<EmojiIcon name="Home" className="h-4 w-4" />
{t("title")}
</CardTitle>
</CardHeader>
<CardContent>
<form onSubmit={handleSubmit} className="space-y-4">
{/* Region */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
<div className="space-y-2">
<Label className="flex items-center gap-1">
<EmojiIcon name="MapPin" className="h-3 w-3" />
{t("province")}
</Label>
<SelectDropdown
value={form.province}
onChange={(value) => {
setForm({ ...form, province: value, city: "", district: "" })
setCityOptions(getCities(value))
setDistrictOptions([])
}}
options={provinces.map((p) => ({ value: p, label: p }))}
placeholder={t("selectProvince")}
/>
</div>
<div className="space-y-2">
<Label>{t("city")}</Label>
<SelectDropdown
value={form.city}
disabled={!form.province}
onChange={(value) => {
setForm({ ...form, city: value, district: "" })
setDistrictOptions(getDistricts(form.province, value))
}}
options={cityOptions.map((c) => ({ value: c, label: c }))}
placeholder={form.province ? t("selectCity") : t("selectCityAfterProvince")}
/>
</div>
<div className="space-y-2">
<Label>{t("district")}</Label>
<SelectDropdown
value={form.district}
disabled={!form.city}
onChange={(value) => setForm({ ...form, district: value })}
options={districtOptions.map((d) => ({ value: d, label: d }))}
placeholder={form.city ? t("selectDistrict") : t("selectDistrictAfterCity")}
/>
</div>
</div>

{/* Climate Type */}
<div className="space-y-2">
<Label>{t("climateType")}</Label>
<SelectDropdown
value={form.climate_type}
onChange={(value) => setForm({ ...form, climate_type: value })}
options={climateOptions}
placeholder={t("selectClimateType")}
/>
</div>

{/* Household */}
<div className="space-y-3 p-3 bg-muted/50 rounded-lg">
<Label className="text-sm font-medium">{t("household")}</Label>

<div className="flex items-center justify-between">
<Label htmlFor="multi-pet" className="text-sm font-normal">{t("multiPetHousehold")}</Label>
<Switch
id="multi-pet"
checked={form.multi_pet_household}
onCheckedChange={(checked) => setForm({ ...form, multi_pet_household: checked })}
/>
</div>

{form.multi_pet_household && (<div className="space-y-2">
<Label htmlFor="pet-count" className="text-sm font-normal">{t("petCount")}</Label>
<Input
id="pet-count"
type="number"
min={2}
value={form.pet_count}
onChange={(e) => setForm({ ...form, pet_count: parseInt(e.target.value) || 2 })}
/>
</div>)}

<div className="flex items-center justify-between">
<Label htmlFor="has-children" className="text-sm font-normal">{t("hasChildren")}</Label>
<Switch
id="has-children"
checked={form.has_children}
onCheckedChange={(checked) => setForm({ ...form, has_children: checked })}
/>
</div>
</div>

{/* Indoor/Outdoor */}
<div className="space-y-2">
<Label>{t("indoorOutdoor")}</Label>
<SelectDropdown
value={form.indoor_outdoor}
onChange={(value) => setForm({ ...form, indoor_outdoor: value })}
options={indoorOutdoorOptions}
/>
</div>

{/* Activity Level */}
<div className="space-y-2">
<Label className="flex items-center gap-1">
<EmojiIcon name="Activity" className="h-3 w-3" />
{t("activityLevel")}
</Label>
<SelectDropdown
value={form.activity_level}
onChange={(value) => setForm({ ...form, activity_level: value as ActivityLevel })}
options={activityOptions}
/>
</div>

<Button type="submit" disabled={isPending} className="w-full">
{isPending ? (<>
<EmojiIcon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
{t("saving")}
</>) : (t("saveProfile"))}
</Button>
</form>
</CardContent>
</Card>)
}
