"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { BreedCombobox } from "@/components/pets/breed-combobox"
import { AvatarCropper } from "@/components/pets/avatar-cropper"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { getProvinces, getCities, getDistricts } from "@/lib/china-regions"
import { useMemo } from "react"
import { useTranslations } from "next-intl"

// ── Section sub-components ──
function Section({
id,
title,
description,
icon,
children,
}: {
id: string
title: string
description?: string
icon: React.ReactNode
children: React.ReactNode
}) {
return (<section id={id} className="scroll-mt-24 rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
<div className="mb-5 flex items-start gap-3">
<div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC] text-[#FF7A59]">
{icon}
</div>
<div className="min-w-0 flex-1">
<h2 className="text-[16px] font-semibold leading-tight text-[#111111]">{title}</h2>
{description && (<p className="mt-1 text-[12.5px] leading-relaxed text-[#6B6B6B]">{description}</p>)}
</div>
</div>
{children}
</section>)
}

function Field({
label,
hint,
required,
htmlFor,
className,
children,
}: {
label: string
hint?: string
required?: boolean
htmlFor?: string
className?: string
children: React.ReactNode
}) {
return (<div className={cn("space-y-1.5", className)}>
<div className="flex items-center justify-between">
<Label htmlFor={htmlFor} className="text-[12.5px] font-medium text-[#444444]">
{label}
{required && <span className="ml-0.5 text-[#FF7A59]">*</span>}
</Label>
{hint && <span className="text-[11px] text-[#9A9A95]">{hint}</span>}
</div>
{children}
</div>)
}

function inputClass() {
return "h-11 rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:ring-[3px] focus-visible:ring-[#FF7A59]/12 focus-visible:outline-none"
}

function textareaClass() {
return "min-h-[80px] rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-2.5 text-[14px] text-[#111111] placeholder:text-[#9A9A95] focus-visible:border-[#FF7A59]/50 focus-visible:ring-[3px] focus-visible:ring-[#FF7A59]/12 focus-visible:outline-none"
}

// ── Disease entry (local form state) ──
interface DiseaseEntry {
id: string
name: string
diagnosed_on: string
status: string
severity: string
notes: string
}

interface MedicationEntry {
id: string
name: string
dosage: string
frequency: string
started_on: string
is_ongoing: boolean
notes: string
}

interface AttachmentEntry {
id: string
category: string
file_name: string
file_path: string
file_url: string
file_type: string | null
file_size: number | null
is_new: boolean
file?: File
}

function genId() {
return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function formatSize(bytes: number | null | undefined) {
if (!bytes) return ""
if (bytes < 1024) return `${bytes} B`
if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function isImage(type: string | null | undefined) {
return!!type && type.startsWith("image/")
}

interface PetFormProps {
pet?: {
id?: string
name?: string | null
species?: string | null
breed?: string | null
age_years?: number | null
age_months?: number | null
age_days?: number | null
gender?: string | null
weight_kg?: number | null
neutered?: boolean | null
photo_url?: string | null
stomach_health?: string | null
pet_source?: string | null
home_age_years?: number | null
home_age_months?: number | null
home_age_days?: number | null
birth_date?: string | null
home_date?: string | null
}
initialDiseases?: DiseaseEntry[]
initialMedications?: MedicationEntry[]
initialAttachments?: AttachmentEntry[]
initialEnvironment?: {
region?: string | null
city?: string | null
district?: string | null
multi_pet_household?: boolean | null
pet_count?: number | null
has_children?: boolean | null
indoor_outdoor?: string | null
activity_level?: string | null
}
onSubmit: (payload: PetFormPayload) => Promise<{ ok: boolean; error?: string }>
onAvatarChange?: (file: File | null) => void
}

export interface PetFormPayload {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
pet: Record<string, any>
diseases: Array<Omit<DiseaseEntry, "id">>
medications: Array<Omit<MedicationEntry, "id">>
attachments: AttachmentEntry[]
environment: {
region: string | null
city: string | null
district: string | null
multi_pet_household: boolean
pet_count: number
has_children: boolean
indoor_outdoor: string
activity_level: string
}
}

export function PetForm({
pet,
initialDiseases = [],
initialMedications = [],
initialAttachments = [],
initialEnvironment,
onSubmit,
onAvatarChange,
}: PetFormProps) {
const tPet = useTranslations("Pet")
const tHealth = useTranslations("Health")
const [name, setName] = useState(pet?.name?? "")
const [species, setSpecies] = useState(pet?.species?? "cat")
const [breed, setBreed] = useState(pet?.breed?? "")
const [birthDate, setBirthDate] = useState<string>(pet?.birth_date?? "")
const [homeDate, setHomeDate] = useState<string>(pet?.home_date?? "")
const [gender, setGender] = useState(pet?.gender?? "unknown")
const [neutered, setNeutered] = useState(pet?.neutered === true? "true": "false")
const [weight, setWeight] = useState<string>(pet?.weight_kg!= null? String(pet.weight_kg): "")
const [stomach, setStomach] = useState(pet?.stomach_health?? "normal")
const [source, setSource] = useState(pet?.pet_source?? "other")
const [avatarPreview, setAvatarPreview] = useState<string>(pet?.photo_url?? "")
const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

const [diseases, setDiseases] = useState<DiseaseEntry[]>(initialDiseases)
const [medications, setMedications] = useState<MedicationEntry[]>(initialMedications)
const [attachments, setAttachments] = useState<AttachmentEntry[]>(initialAttachments)
const [submitting, setSubmitting] = useState(false)

// Environment state
const [envProvince, setEnvProvince] = useState(initialEnvironment?.region?? "")
const [envCity, setEnvCity] = useState(initialEnvironment?.city?? "")
const [envDistrict, setEnvDistrict] = useState(initialEnvironment?.district?? "")
const [envMultiPet, setEnvMultiPet] = useState(initialEnvironment?.multi_pet_household?? false)
const [envPetCount, setEnvPetCount] = useState(initialEnvironment?.pet_count?? 1)
const [envHasChildren, setEnvHasChildren] = useState(initialEnvironment?.has_children?? false)
const [envIndoorOutdoor, setEnvIndoorOutdoor] = useState(initialEnvironment?.indoor_outdoor?? "indoor")
const [envActivityLevel, setEnvActivityLevel] = useState(initialEnvironment?.activity_level?? "medium")
const provinces = useMemo(() => getProvinces(), [])
const [envCityOptions, setEnvCityOptions] = useState<string[]>(() => (initialEnvironment?.region && initialEnvironment?.city? getCities(initialEnvironment.region): []),)
const [envDistrictOptions, setEnvDistrictOptions] = useState<string[]>(() => (initialEnvironment?.region && initialEnvironment?.city? getDistricts(initialEnvironment.region, initialEnvironment.city): []),)

// ── Translated option lists ──
const speciesOptions: SelectOption[] = [
{ value: "cat", label: tPet("cat"), icon: <EmojiIcon name="Cat" className="size-4 text-[#FF7A59]" /> },
{ value: "dog", label: tPet("dog"), icon: <EmojiIcon name="Dog" className="size-4 text-[#FF7A59]" /> },
{ value: "other", label: tPet("other"), icon: <EmojiIcon name="PawPrint" className="size-4 text-[#FF7A59]" /> },
]

const genderOptions: SelectOption[] = [
{ value: "male", label: tPet("male") },
{ value: "female", label: tPet("female") },
{ value: "unknown", label: tPet("unknown") },
]

const neuteredOptions: SelectOption[] = [
{ value: "true", label: tHealth("neuteredYes") },
{ value: "false", label: tHealth("neuteredNo") },
]

const stomachOptions: SelectOption[] = [
{ value: "normal", label: tPet("normal"), description: tPet("stomachNormalDesc") },
{ value: "sensitive", label: tPet("sensitive"), description: tPet("stomachSensitiveDesc") },
{ value: "very_sensitive", label: tPet("verySensitive"), description: tPet("stomachVerySensitiveDesc") },
]

const sourceOptions: SelectOption[] = [
{ value: "purchased", label: tHealth("purchased"), icon: <EmojiIcon name="ShoppingBag" className="size-4 text-[#6B6B6B]" />, description: tHealth("purchased") },
{ value: "wild_rescued", label: tHealth("wildRescued"), icon: <EmojiIcon name="TreePine" className="size-4 text-[#6B6B6B]" />, description: tHealth("wildRescued") },
{ value: "home_raised", label: tHealth("homeRaised"), icon: <EmojiIcon name="House" className="size-4 text-[#6B6B6B]" />, description: tHealth("homeRaised") },
{ value: "stray_adopted", label: tHealth("strayAdopted"), icon: <EmojiIcon name="Heart" className="size-4 text-[#6B6B6B]" />, description: tHealth("strayAdopted") },
{ value: "other", label: tPet("other"), icon: <EmojiIcon name="AlertCircle" className="size-4 text-[#6B6B6B]" /> },
]

const diseaseStatusOptions: SelectOption[] = [
{ value: "active", label: tPet("underTreatment") },
{ value: "recovered", label: tHealth("recovered") },
{ value: "chronic", label: tHealth("chronic") },
{ value: "unknown", label: tPet("unknown") },
]

const diseaseSeverityOptions: SelectOption[] = [
{ value: "mild", label: tPet("mild") },
{ value: "moderate", label: tPet("moderate") },
{ value: "severe", label: tPet("severe") },
{ value: "unknown", label: tPet("unknown") },
]

const indoorOutdoorOptions: SelectOption[] = [
{ value: "indoor", label: tHealth("indoorOnly") },
{ value: "outdoor", label: tHealth("outdoorOnly") },
{ value: "both", label: tHealth("indoorOutdoor") },
]

const activityOptions: SelectOption[] = [
{ value: "very_low", label: tHealth("veryLow") },
{ value: "low", label: tHealth("low") },
{ value: "medium", label: tHealth("medium") },
{ value: "high", label: tHealth("high") },
{ value: "very_high", label: tHealth("veryHigh") },
]

const ATTACHMENT_CATEGORIES: Array<{ value: string; label: string; icon: React.ReactNode }> = [
{ value: "medical_record", label: tPet("vetVisitRecord"), icon: <EmojiIcon name="Stethoscope" className="size-3.5" /> },
{ value: "medication_proof", label: tPet("medicationRecordLabel"), icon: <EmojiIcon name="Pill" className="size-3.5" /> },
{ value: "purchase_proof", label: tPet("purchaseProof"), icon: <EmojiIcon name="ShoppingBag" className="size-3.5" /> },
{ value: "other", label: tPet("other"), icon: <EmojiIcon name="Paperclip" className="size-3.5" /> },
]

function addDisease() {
setDiseases((prev) => [...prev,
{ id: genId(), name: "", diagnosed_on: "", status: "active", severity: "unknown", notes: "" },
])
}
function updateDisease(localId: string, patch: Partial<DiseaseEntry>) {
setDiseases((prev) => prev.map((d) => (d.id === localId? {...d,...patch }: d)))
}
function removeDisease(localId: string) {
setDiseases((prev) => prev.filter((d) => d.id!== localId))
}

function addMedication() {
setMedications((prev) => [...prev,
{ id: genId(), name: "", dosage: "", frequency: "", started_on: "", is_ongoing: true, notes: "" },
])
}
function updateMedication(localId: string, patch: Partial<MedicationEntry>) {
setMedications((prev) => prev.map((m) => (m.id === localId? {...m,...patch }: m)))
}
function removeMedication(localId: string) {
setMedications((prev) => prev.filter((m) => m.id!== localId))
}

async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
const files = e.target.files
if (!files || files.length === 0) return
const newEntries: AttachmentEntry[] = []
for (let i = 0; i < files.length; i++) {
const f = files[i]
newEntries.push({
id: genId(),
category: "other",
file_name: f.name,
file_path: "",
file_url: "",
file_type: f.type,
file_size: f.size,
is_new: true,
file: f,
})
}
setAttachments((prev) => [...prev,...newEntries])
e.target.value = ""
}
function updateAttachmentCategory(localId: string, category: string) {
setAttachments((prev) => prev.map((a) => (a.id === localId? {...a, category }: a)))
}
function removeAttachment(localId: string) {
setAttachments((prev) => prev.filter((a) => a.id!== localId))
}

function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
const files = e.target.files
if (!files || files.length === 0) return
const file = files[0]
if (!file.type.startsWith("image/")) {
toast.error(tPet("selectImageFile"))
return
}
if (file.size > 5 * 1024 * 1024) {
toast.error(tPet("avatarSizeLimit"))
return
}
const url = URL.createObjectURL(file)
setCropImageSrc(url)
e.target.value = ""
}

function handleCropConfirm(croppedFile: File) {
const url = URL.createObjectURL(croppedFile)
setAvatarPreview(url)
onAvatarChange?.(croppedFile)
if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
setCropImageSrc(null)
}

function handleCropCancel() {
if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
setCropImageSrc(null)
}

function handleAvatarRemove() {
setAvatarPreview("")
onAvatarChange?.(null)
}

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault()
if (submitting) return
if (!name.trim()) {
toast.error(tPet("pleaseEnterName"))
return
}
setSubmitting(true)

let result: { ok: boolean; error?: string }
try {
result = await onSubmit({
pet: {
name: name.trim(),
species,
breed: breed.trim() || null,
birth_date: birthDate || null,
home_date: homeDate || null,
pet_source: source,
gender,
neutered: neutered === "true",
weight_kg: weight? Number(weight): null,
stomach_health: stomach,
},
diseases: diseases.filter((d) => d.name.trim()).map(({ id: _id,...rest }) => rest),
medications: medications.filter((m) => m.name.trim()).map(({ id: _id,...rest }) => rest),
attachments,
environment: {
region: envProvince || null,
city: envCity || null,
district: envDistrict || null,
multi_pet_household: envMultiPet,
pet_count: envPetCount,
has_children: envHasChildren,
indoor_outdoor: envIndoorOutdoor,
activity_level: envActivityLevel,
},
})
} catch (e) {
result = { ok: false, error: e instanceof Error? e.message: tPet("unknownError") }
}

setSubmitting(false)
if (!result.ok) {
toast.error(result.error?? tPet("saveFailed"))
}
}

const sections = [
{ id: "basic", label: tHealth("basicInfo") },
{ id: "age-source", label: tHealth("ageAndSource") },
{ id: "body", label: tPet("bodyInfo") },
{ id: "environment", label: tHealth("livingEnvironment") },
]

return (<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
{/* Left: Section nav (sticky) */}
<aside className="hidden lg:block">
<nav className="sticky top-[88px] rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-2">
{sections.map((s) => (<a
key={s.id}
href={`#${s.id}`}
className="block rounded-[10px] px-3 py-2 text-[13px] text-[#6B6B6B] transition-colors hover:bg-[#F7F6F3] hover:text-[#111111]"
>
{s.label}
</a>))}
</nav>
</aside>

{/* Right: form sections */}
<div className="space-y-6">
{/* Name + species row */}
<Section id="basic" title={tHealth("basicInfo")} description={tHealth("basicInfoDesc")} icon={<EmojiIcon name="PawPrint" className="size-4" />}>
<div className="space-y-5">
<Field label={tPet("name")} required htmlFor="pet-name">
<Input
id="pet-name"
value={name}
onChange={(e) => setName(e.target.value)}
placeholder={tPet("name")}
className={inputClass()}
maxLength={32}
/>
</Field>

{/* Avatar upload */}
<Field label={tPet("avatar")}>
<div className="flex items-center gap-4">
<div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-[rgba(0,0,0,0.06)] bg-[#F7F6F3]">
{avatarPreview? (<img
src={avatarPreview}
alt={tPet("avatar")}
className="size-full object-cover"
/>): (<div className="flex size-full items-center justify-center text-[#9A9A95]">
<EmojiIcon name="PawPrint" className="size-7" />
</div>)}
{avatarPreview && (<button
type="button"
onClick={handleAvatarRemove}
className="absolute right-0 top-0 flex size-6 items-center justify-center rounded-full bg-[#FF7A59] text-white shadow-sm hover:bg-[#E86A4A]"
aria-label={tPet("avatar")}
>
<EmojiIcon name="X" className="size-3.5" />
</button>)}
</div>
<label
className={cn("inline-flex cursor-pointer items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-4 py-2 text-[13px] text-[#6B6B6B] transition-colors",
"hover:border-[#FF7A59]/40 hover:bg-[#FFF6F0] hover:text-[#FF7A59]")}
>
<EmojiIcon name="Upload" className="size-3.5" />
{avatarPreview? tPet("changeAvatar"): tPet("uploadAvatar")}
<input
type="file"
accept="image/*"
className="hidden"
onChange={handleAvatarPick}
/>
</label>
</div>
<p className="mt-1 text-[11px] text-[#9A9A95]">{tPet("avatarHint")}</p>
</Field>

<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
<Field label={tPet("species")}>
<SelectDropdown
value={species}
onChange={setSpecies}
options={speciesOptions}
placeholder={tPet("pleaseSelect")}
/>
</Field>
<Field label={tPet("breed")}>
<BreedCombobox
value={breed}
onChange={setBreed}
species={species as "cat" | "dog" | "other" | null}
/>
</Field>
</div>

<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
<Field label={tPet("gender")}>
<SelectDropdown
value={gender}
onChange={setGender}
options={genderOptions}
/>
</Field>
<Field label={tPet("neutered")}>
<SelectDropdown
value={neutered}
onChange={setNeutered}
options={neuteredOptions}
/>
</Field>
</div>
</div>
</Section>

{/* Age + source */}
<Section id="age-source" title={tHealth("ageAndSource")} description={tHealth("ageAndSourceDesc")} icon={<EmojiIcon name="Calendar" className="size-4" />}>
<div className="space-y-5">
<div>
<p className="mb-1.5 text-[12.5px] font-medium text-[#444444]">{tPet("birthDate")}</p>
<div className="relative">
<Input
type="date"
max={new Date().toISOString().split("T")[0]}
value={birthDate}
onChange={(e) => setBirthDate(e.target.value)}
className={cn(inputClass(), "pr-10")}
/>
</div>
{birthDate && (<p className="mt-1 text-[11px] text-[#9A9A95]">
{tPet("daysCount", { days: Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24)) })}
</p>)}
</div>

<div>
<p className="mb-1.5 text-[12.5px] font-medium text-[#444444]">
{tPet("homeDate")} <span className="ml-1 text-[11px] font-normal text-[#9A9A95]">{tPet("homeDateHint")}</span>
</p>
<div className="relative">
<Input
type="date"
max={new Date().toISOString().split("T")[0]}
value={homeDate}
onChange={(e) => setHomeDate(e.target.value)}
className={cn(inputClass(), "pr-10")}
placeholder={tPet("pleaseSelect")}
/>
</div>
{homeDate && birthDate && (<p className="mt-1 text-[11px] text-[#9A9A95]">
{tPet("ageDiffHint", { days: Math.floor((new Date(homeDate).getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24)) })}
</p>)}
</div>

<Field label={tHealth("source")} hint={tPet("sourceHint")}>
<SelectDropdown
value={source}
onChange={setSource}
options={sourceOptions}
placeholder={tPet("pleaseSelect")}
/>
</Field>
</div>
</Section>

{/* Body */}
<Section id="body" title={tPet("bodyInfo")} description={tPet("bodyInfoDesc")} icon={<EmojiIcon name="Heart" className="size-4" />}>
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
<Field label={tPet("weight")} hint={tPet("weightHint")}>
<Input
type="number"
step="0.01"
min={0}
max={120}
value={weight}
onChange={(e) => setWeight(e.target.value)}
className={inputClass()}
placeholder="0.00"
/>
</Field>
<Field label={tPet("stomachHealth")}>
<SelectDropdown
value={stomach}
onChange={setStomach}
options={stomachOptions}
/>
</Field>
</div>
</Section>

{/* Environment */}
<Section id="environment" title={tHealth("livingEnvironment")} description={tHealth("livingEnvironmentDesc")} icon={<EmojiIcon name="Home" className="size-4" />}>
<div className="space-y-5">
{/* Region selector */}
<div>
<p className="mb-2 text-[12.5px] font-medium text-[#444444]">{tPet("region")}</p>
<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
<Field label={tPet("selectProvince")}>
<SelectDropdown
value={envProvince}
onChange={(value) => {
setEnvProvince(value)
setEnvCity("")
setEnvDistrict("")
setEnvCityOptions(getCities(value))
setEnvDistrictOptions([])
}}
options={provinces.map((p) => ({ value: p, label: p }))}
placeholder={tPet("selectProvince")}
/>
</Field>
<Field label={tPet("selectCity")}>
<SelectDropdown
value={envCity}
disabled={!envProvince}
onChange={(value) => {
setEnvCity(value)
setEnvDistrict("")
setEnvDistrictOptions(getDistricts(envProvince, value))
}}
options={envCityOptions.map((c) => ({ value: c, label: c }))}
placeholder={envProvince? tPet("selectCity"): tPet("selectCityFirst")}
/>
</Field>
<Field label={tPet("selectDistrict")}>
<SelectDropdown
value={envDistrict}
disabled={!envCity}
onChange={(value) => setEnvDistrict(value)}
options={envDistrictOptions.map((d) => ({ value: d, label: d }))}
placeholder={envCity? tPet("selectDistrict"): tPet("selectDistrictFirst")}
/>
</Field>
</div>
<p className="mt-1 text-[11px] text-[#9A9A95]">{tPet("locationHint")}</p>
</div>

{/* Household */}
<div className="rounded-[14px] border border-[rgba(0,0,0,0.05)] bg-[#FBFAF7] p-4">
<p className="mb-3 text-[12.5px] font-medium text-[#444444]">{tPet("household")}</p>
<div className="space-y-3">
<div className="flex items-center justify-between">
<Label htmlFor="multi-pet" className="text-[13px] font-normal text-[#444444]">{tHealth("multiPetHousehold")}</Label>
<Switch
id="multi-pet"
checked={envMultiPet}
onCheckedChange={setEnvMultiPet}
/>
</div>

{envMultiPet && (<Field label={tHealth("petCount")}>
<Input
id="pet-count"
type="number"
min={2}
value={envPetCount}
onChange={(e) => setEnvPetCount(parseInt(e.target.value) || 2)}
className={inputClass()}
/>
</Field>)}

<div className="flex items-center justify-between">
<Label htmlFor="has-children" className="text-[13px] font-normal text-[#444444]">{tHealth("hasChildren")}</Label>
<Switch
id="has-children"
checked={envHasChildren}
onCheckedChange={setEnvHasChildren}
/>
</div>
</div>
</div>

<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
<Field label={tPet("indoorOutdoorLabel")}>
<SelectDropdown
value={envIndoorOutdoor}
onChange={setEnvIndoorOutdoor}
options={indoorOutdoorOptions}
/>
</Field>
<Field label={tPet("activityLevelLabel")}>
<SelectDropdown
value={envActivityLevel}
onChange={setEnvActivityLevel}
options={activityOptions}
/>
</Field>
</div>
</div>
</Section>

{/* Sticky submit bar */}
<div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-[16px] border border-[rgba(0,0,0,0.06)] bg-white/95 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur">
<span className="mr-auto text-[12.5px] text-[#6B6B6B]">
{tPet("submitHint")}
</span>
<Button
type="submit"
disabled={submitting}
className="h-10 rounded-full bg-[#FF7A59] px-6 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(255,122,89,0.25)] hover:bg-[#E86A4A]"
>
{submitting && <EmojiIcon name="Loader2" className="mr-2 size-4 animate-spin" />}
{pet?.id? tPet("saveChanges"): tPet("createProfile")}
</Button>
</div>
</div>

{/* Avatar cropper modal */}
{cropImageSrc && (<AvatarCropper
imageSrc={cropImageSrc}
onConfirm={handleCropConfirm}
onCancel={handleCropCancel}
/>)}
</form>)
}
