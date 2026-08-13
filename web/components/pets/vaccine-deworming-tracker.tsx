"use client"

import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { createPetHealthRecord, deleteHealthRecord } from "@/lib/supabase/actions/pet-form-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import {
searchMedicationPresets,
findMedicationPreset,
getNextVaccineDueDate,
getNextDewormingDueDate,
getShotOptions,
getDewormingSubTypeLabel,
getLocalizedName,
getLocalizedDescription,
inferDewormingSubType,
categoryToDewormingSubType,
type PetSpecies,
type MedicationPreset,
type DewormingSubType,
} from "@/lib/pets/vaccine-deworming-data"
import { MultiPetSelector } from "@/components/pets/multi-pet-selector"

interface VaccineDewormingTrackerProps {
petId: string
/** Pet species — used to filter medication presets */
species?: PetSpecies | null
/** Server-fetched records to avoid duplicate client-side queries */
initialRecords?: HealthRecord[]
/** Server-fetched reminders to avoid duplicate client-side queries */
initialReminders?: HealthReminder[]
}

// ── Types ──
interface HealthRecord {
id: string
record_type: string
record_time: string
notes: string | null
vet_clinic: string | null
vet_name: string | null
medication_name: string | null
medication_dosage: string | null
metadata: Record<string, unknown> | null
}

interface HealthReminder {
id: string
reminder_type: string
title: string
description: string | null
due_date: string
repeat_interval: string | null
is_completed: boolean
}

type FilterCategory = "all" | "vaccine" | "deworming"

interface FormData {
record_type: "vaccination" | "medication"
record_time: string
medication_name: string
/** already接 针次(many 选:1=Shot 1, 2=Shot 2, 3=Shot 3, 0=Booster, []=not选) */
shot_number: number[]
/** 各针接种日期 Record<shotNumber, "YYYY-MM-DD"> */
shot_dates: Record<number, string>
/** Deworming子Type: 驱 / 驱 / 同驱(仅DewormingRecord) */
deworming_subtype: DewormingSubType | null
vet_clinic: string
vet_name: string
notes: string
/** Whether创建NextReminder */
create_reminder: boolean
/** UserCustomNextReminderDate(覆盖自动计算) */
custom_reminder_date: string
}

const emptyForm: FormData = {
record_type: "vaccination",
record_time: new Date().toISOString().slice(0, 10),
medication_name: "",
shot_number: [],
shot_dates: {},
deworming_subtype: null,
vet_clinic: "",
vet_name: "",
notes: "",
create_reminder: true,
custom_reminder_date: "",
}

const filterCategories: { key: FilterCategory; label: string; emoji: string; alt: string }[] = [
{ key: "all", label: "allRecords", emoji: FLUENT_EMOJI.syringe, alt: "syringe" },
{ key: "vaccine", label: "vaccineLabel", emoji: FLUENT_EMOJI.syringe, alt: "syringe" },
{ key: "deworming", label: "dewormingLabel", emoji: FLUENT_EMOJI.pill, alt: "pill" },
]

function formatDate(dateStr: string, locale: string = "en-US") {
return new Date(dateStr).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })
}

function formatRelativeDate(dateStr: string, t: (key: string, params?: Record<string, string | number | Date>) => string) {
const date = new Date(dateStr + "T00:00:00")
const now = new Date()
const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
if (diffDays < 0) return t("expiredShort", { days: Math.abs(diffDays) })
if (diffDays === 0) return t("todayShort")
if (diffDays === 1) return t("tomorrowShort")
if (diffDays <= 7) return t("dueInDaysShort", { days: diffDays })
return formatDate(dateStr)
}

// ── 根据第一针日期和预设间隔，自动计算后续针次日期 ──
function computeAutoShotDates(
firstShotDate: string,
shots: number[],
preset: MedicationPreset | null,
): Record<number, string> {
const defaultIntervals: Record<number, number> = { 1: 21, 2: 21, 3: 365, 0: 365 }
const intervals: Record<number, number> = preset?.shotIntervals
? Object.fromEntries(Object.entries(preset.shotIntervals).map(([k, v]) => [k, v.intervalDays]))
: defaultIntervals

const sorted = [...shots].sort((a, b) => {
if (a === 0) return 1
if (b === 0) return -1
return a - b
})

const result: Record<number, string> = {}
let currentDate = new Date(firstShotDate + "T00:00:00")

for (let i = 0; i < sorted.length; i++) {
const shot = sorted[i]
if (i === 0) {
result[shot] = firstShotDate
} else {
const prevShot = sorted[i - 1]
const days = intervals[prevShot] ?? 21
currentDate = new Date(currentDate.getTime() + days * 86400000)
result[shot] = currentDate.toISOString().slice(0, 10)
}
}

return result
}

// ── 模糊Search 拉output 框 ──
function MedicationCombobox({
value,
onChange,
species,
recordType,
dewormingSubType,
}: {
value: string
onChange: (val: string) => void
species: PetSpecies | null | undefined
recordType: "vaccination" | "medication"
dewormingSubType?: DewormingSubType | null
}) {
const tHealth = useTranslations("Health")
const tPet = useTranslations("Pet")
const locale = useLocale()
const [open, setOpen] = useState(false)
const [highlightIndex, setHighlightIndex] = useState(-1)
const inputRef = useRef<HTMLInputElement>(null)
const containerRef = useRef<HTMLDivElement>(null)

const results = useMemo(() => searchMedicationPresets(value, species, recordType, dewormingSubType),
[value, species, recordType, dewormingSubType],)

// Click to 部Close
useEffect(() => {
function handleClickOutside(e: MouseEvent) {
if (containerRef.current &&!containerRef.current.contains(e.target as Node)) {
setOpen(false)
}
}
document.addEventListener("mousedown", handleClickOutside)
return () => document.removeEventListener("mousedown", handleClickOutside)
}, [])

const handleSelect = (preset: MedicationPreset) => {
onChange(getLocalizedName(preset, locale))
setOpen(false)
setHighlightIndex(-1)
inputRef.current?.blur()
}

const handleKeyDown = (e: React.KeyboardEvent) => {
if (!open || results.length === 0) return
if (e.key === "ArrowDown") {
e.preventDefault()
setHighlightIndex((prev) => (prev + 1) % results.length)
} else if (e.key === "ArrowUp") {
e.preventDefault()
setHighlightIndex((prev) => (prev <= 0? results.length - 1: prev - 1))
} else if (e.key === "Enter" && highlightIndex >= 0) {
e.preventDefault()
handleSelect(results[highlightIndex])
} else if (e.key === "Escape") {
setOpen(false)
}
}

const isVaccine = recordType === "vaccination"
const placeholder = isVaccine? tHealth("searchVaccineName"): tHealth("searchDewormingName")

return (<div ref={containerRef} className="relative">
<input
ref={inputRef}
type="text"
value={value}
onChange={(e) => {
onChange(e.target.value)
setOpen(true)
setHighlightIndex(-1)
}}
onFocus={() => setOpen(true)}
onKeyDown={handleKeyDown}
placeholder={placeholder}
className="w-full rounded-[10px] border border-black/[0.08] bg-white/60 px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#FF7A59]/40 placeholder:text-[#c5c5c2]"
/>
{open && results.length > 0 && (<div className="absolute z-50 mt-1 max-h-[240px] w-full overflow-y-auto rounded-[12px] border border-black/[0.08] bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
{results.map((preset, i) => (<button
key={`${preset.name}-${preset.species.join(",")}`}
type="button"
onClick={() => handleSelect(preset)}
onMouseEnter={() => setHighlightIndex(i)}
className={cn("flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left transition-colors",
highlightIndex === i? "bg-[#FF7A59]/8": "hover:bg-black/[0.02]",)}
>
<FluentEmoji
src={isVaccine? FLUENT_EMOJI.syringe: FLUENT_EMOJI.pill}
alt={isVaccine? "syringe": "pill"}
size={16}
/>
<div className="min-w-0 flex-1">
<div className="flex items-center gap-1.5">
<span className="text-[13px] font-medium text-[#1a1a1a]">{getLocalizedName(preset, locale)}</span>
{preset.species.map((s) => (<span
key={s}
className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-[#86867e]"
>
{s === "cat"? tPet("cat"): s === "dog"? tPet("dog"): tPet("universal")}
</span>))}
{/* DewormingTypeTag */}
{(() => {
const subType = categoryToDewormingSubType(preset.category)
if (!subType) return null
const colorMap: Record<DewormingSubType, string> = {
internal: "bg-[#4CAF50]/10 text-[#4CAF50]",
external: "bg-[#2196F3]/10 text-[#2196F3]",
both: "bg-[#9C27B0]/10 text-[#9C27B0]",
}
return (<span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", colorMap[subType])}>
{subType === "internal"? tHealth("internalDeworming"): subType === "external"? tHealth("externalDeworming"): tHealth("bothDeworming")}
</span>)
})()}
</div>
<p className="mt-0.5 truncate text-[11px] text-[#86867e]">{getLocalizedDescription(preset, locale)}</p>
</div>
{preset.isRepeating && (<span className="shrink-0 rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-[9px] font-medium text-[#FF7A59]">
{preset.repeatInterval === "monthly"? tHealth("monthly"): preset.repeatInterval === "quarterly"? tHealth("quarterly"): preset.repeatInterval === "yearly"? tHealth("yearly"): ""}
</span>)}
</button>))}
</div>)}
{open && value.trim() && results.length === 0 && (<div className="absolute z-50 mt-1 w-full rounded-[12px] border border-black/[0.08] bg-white p-3 text-center text-[12px] text-[#86867e] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
{tHealth("noVaccineFound")}
</div>)}
</div>)
}

export function VaccineDewormingTracker({ petId, species, initialRecords, initialReminders }: VaccineDewormingTrackerProps) {
const tHealth = useTranslations("Health")
const tPet = useTranslations("Pet")
const locale = useLocale()
const [records, setRecords] = useState<HealthRecord[]>(initialRecords?? [])
const [reminders, setReminders] = useState<HealthReminder[]>(initialReminders?? [])
const [loading, setLoading] = useState(!initialRecords)
const [filter, setFilter] = useState<FilterCategory>("all")
const [dewormingSubFilter, setDewormingSubFilter] = useState<DewormingSubType | null>(null)
const [showForm, setShowForm] = useState(false)
const [editingId, setEditingId] = useState<string | null>(null)
const [formData, setFormData] = useState<FormData>(emptyForm)
const [saving, setSaving] = useState(false)
const [deletingId, setDeletingId] = useState<string | null>(null)
const [applyToPets, setApplyToPets] = useState<string[]>([])
const supabase = createClient()
const { user } = useAuth()
const router = useRouter()

const loadData = useCallback(async () => {
setLoading(true)
const [recordsRes, remindersRes] = await Promise.all([
supabase.from("health_records").select("*").eq("pet_id", petId).in("record_type", ["vaccination", "medication"]).order("record_time", { ascending: false }),
supabase.from("health_reminders").select("*").eq("pet_id", petId).in("reminder_type", ["vaccination", "medication"]).eq("is_completed", false).order("due_date", { ascending: true }),
])
setRecords((recordsRes.data as HealthRecord[]) || [])
setReminders((remindersRes.data as HealthReminder[]) || [])
setLoading(false)
}, [petId, supabase])

// Only fetch from client if no initial data was provided
useEffect(() => {
if (!initialRecords) {
loadData()
}
}, [loadData, initialRecords])

// ── 查找when Selected Vaccine/DewormingBrand预设 ──
const selectedPreset = useMemo(() => {
if (!formData.medication_name.trim()) return null
return findMedicationPreset(formData.medication_name,
species,
formData.record_type === "vaccination"? "vaccination": "medication",)
}, [formData.medication_name, species, formData.record_type])

// ── 获取该VaccineBrand支持 针次Options ──
const shotOptions = useMemo(() => {
if (formData.record_type!== "vaccination") return []
return getShotOptions(selectedPreset)
}, [selectedPreset, formData.record_type])

// ── 计算自动Recommended NextReminderDate ──
// 直接 渲染体 计算,not use useMemo,确保每次渲染all YesLatest值
let autoReminderInfo: { dueDate: string; description: string; title: string; maxShot?: number; repeatInterval?: string | null } | null = null
let currentMaxShot: number | null = null

if (formData.medication_name.trim()) {
if (formData.record_type === "vaccination") {
// Vaccine: use last shot date + interval for next reminder
const shots = formData.shot_number
if (shots.length > 0) {
// Find the last (highest) shot and its date
const sortedShots = [...shots].sort((a, b) => {
if (a === 0) return 1
if (b === 0) return -1
return a - b
})
const lastShot = sortedShots[sortedShots.length - 1]
const lastShotDate = formData.shot_dates[lastShot] ?? formData.record_time
// Pass only the last shot to get its interval-based next due date
const info = getNextVaccineDueDate(lastShotDate, [lastShot], selectedPreset)
if (info) {
const positive = shots.filter((s) => s > 0)
currentMaxShot = positive.length > 0? Math.max(...positive): (shots.includes(0)? 0: null)
autoReminderInfo = {
dueDate: info.dueDate,
description: info.description,
title: `${info.description}Reminder`,
}
}
}
} else {
// Deworming:根据药品预设计算
const info = getNextDewormingDueDate(formData.record_time, selectedPreset)
if (info) {
autoReminderInfo = {
dueDate: info.dueDate,
description: info.description,
title: info.description,
repeatInterval: selectedPreset?.repeatInterval?? null,
}
}
}
}

// ── Open form for creating ──
const handleOpenAdd = useCallback(() => {
if (!user) { openLoginModal(); return }
setEditingId(null)
setApplyToPets([])
setFormData({...emptyForm, record_time: new Date().toISOString().slice(0, 10) })
setShowForm(true)
}, [user])

// ── Open form for editing ──
const handleOpenEdit = useCallback((record: HealthRecord) => {
if (!user) { openLoginModal(); return }
setEditingId(record.id)
setApplyToPets([])
const meta = record.metadata as { shot_number?: number | number[] | null; shot_dates?: Record<number, string> | null; deworming_subtype?: string | null } | null
const rawSn = meta?.shot_number
// 兼容旧Data:cancan 存 单数 chars or 数组,数组直接保留
const snArray = Array.isArray(rawSn)? rawSn: (rawSn!= null? [rawSn]: [])
// 读取各针接种日期，旧数据回退到 record_time
const metaShotDates = (meta?.shot_dates as Record<number, string> | null) ?? {}
const recordDate = new Date(record.record_time).toISOString().slice(0, 10)
const shotDates: Record<number, string> = {}
for (const sn of snArray) {
shotDates[sn] = metaShotDates[sn] ?? recordDate
}
// from metadata 读取Deworming子Type,if果no 尝试from 药品名推断
const metaSubType = meta?.deworming_subtype as DewormingSubType | null
const inferredSubType = metaSubType?? inferDewormingSubType(record.medication_name?? "", species)
setFormData({
record_type: record.record_type === "vaccination"? "vaccination": "medication",
record_time: recordDate,
medication_name: record.medication_name?? "",
shot_number: snArray,
shot_dates: shotDates,
deworming_subtype: record.record_type === "medication"? inferredSubType: null,
vet_clinic: record.vet_clinic?? "",
vet_name: record.vet_name?? "",
notes: record.notes?? "",
create_reminder: false,
custom_reminder_date: "",
})
setShowForm(true)
}, [user, species])

// ── Close form ──
const handleCloseForm = useCallback(() => {
setShowForm(false)
setEditingId(null)
setApplyToPets([])
}, [])

// ── Save (create or update) ──
const handleSave = useCallback(async () => {
if (saving) return
if (!user) { openLoginModal(); return }

// For vaccines, compute record_time from earliest shot date
let effectiveRecordTime = formData.record_time
if (formData.record_type === "vaccination" && formData.shot_number.length > 0) {
const shotDateValues = Object.values(formData.shot_dates).filter(Boolean)
if (shotDateValues.length === 0) {
toast.error(tHealth("pleaseSelectDate"))
return
}
effectiveRecordTime = shotDateValues.sort()[0]
} else if (!formData.record_time) {
toast.error(tHealth("pleaseSelectDate"))
return
}

setSaving(true)

// 构建 metadata
const metadata: Record<string, unknown> = {}
if (formData.record_type === "vaccination" && formData.shot_number.length > 0) {
metadata.shot_number = formData.shot_number
metadata.shot_dates = formData.shot_dates
}
if (formData.record_type === "medication" && formData.deworming_subtype) {
metadata.deworming_subtype = formData.deworming_subtype
}

const payload = {
pet_id: petId,
profile_id: user.id,
record_type: formData.record_type,
record_time: new Date(effectiveRecordTime).toISOString(),
medication_name: formData.medication_name.trim() || null,
medication_dosage: null,
vet_clinic: formData.vet_clinic.trim() || null,
vet_name: formData.vet_name.trim() || null,
notes: formData.notes.trim() || null,
metadata: Object.keys(metadata).length > 0? metadata: null,
}

try {
let newRecordId: string | null = null
if (editingId) {
// ── Update existing record ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { error } = await (supabase as any).from("health_records").update(payload).eq("id", editingId).eq("profile_id", user.id)

if (error) throw error
toast.success(tHealth("recordUpdated"))
newRecordId = editingId
} else {
// ── Create new record ──
const { data: newRecord, error } = await createPetHealthRecord(payload, user.id)
if (error) throw error
toast.success(tHealth("recordAdded"))
newRecordId = newRecord?.id ?? null
}

// ── 自动创建NextReminder ──
if (formData.create_reminder &&!editingId) {
const isVaccine = formData.record_type === "vaccination"
const medName = formData.medication_name.trim()

// ── 直接from formData.shot_number 计算Reminder信息,not 依赖 autoReminderInfo memo ──
let computedDueDate: string | null = null
let computedTitle: string = ""
let computedDesc: string = ""

if (isVaccine) {
const shots = formData.shot_number
if (shots.length > 0) {
// Use last shot date for reminder calculation
const sortedShots = [...shots].sort((a, b) => {
if (a === 0) return 1
if (b === 0) return -1
return a - b
})
const lastShot = sortedShots[sortedShots.length - 1]
const lastShotDate = formData.shot_dates[lastShot] ?? effectiveRecordTime
const info = getNextVaccineDueDate(lastShotDate, [lastShot], selectedPreset, locale)
if (info) {
computedDueDate = info.dueDate
computedTitle = `${medName} · ${info.description}${tHealth("reminderSuffix")}`
computedDesc = `${medName} ${info.description}`
}
}
} else {
const info = getNextDewormingDueDate(effectiveRecordTime, selectedPreset, locale)
if (info) {
computedDueDate = info.dueDate
computedTitle = info.description
computedDesc = info.description
}
}

const reminderDate = formData.custom_reminder_date || computedDueDate
if (reminderDate) {
// 获取药品预设 循环间隔
const preset =!isVaccine? findMedicationPreset(medName, species, "medication"): null
const repeatInterval = preset?.repeatInterval?? (isVaccine? "yearly": "none")

try {
// health_reminders has RLS allowing owners to insert their own
// 存 source_record_id to metadata,方 DeleteRecord时close 联DeleteReminder
const { data: createdRecord } = editingId? await supabase.from("health_records").select("id").eq("id", editingId).single(): { data: null }
const sourceRecordId = newRecordId ?? createdRecord?.id ?? null

const subTypeLabel =!isVaccine && formData.deworming_subtype? getDewormingSubTypeLabel(formData.deworming_subtype, locale): ""
const fullTitle = computedTitle || (isVaccine? `${medName} · ${tHealth("nextVaccineFallback")}`: `${medName}${subTypeLabel? ` · ${subTypeLabel}`: ""} ${tHealth("nextDewormingFallback")}`)
const fullDesc = computedDesc || (isVaccine? `${medName} ${tHealth("vaccineReminderFallback")}`: `${medName}${subTypeLabel? ` ${subTypeLabel}`: ""} ${tHealth("dewormingReminderFallback")}`)

const reminderMetadata: Record<string, unknown> = { source_record_id: sourceRecordId, medication_name: medName }
if (!isVaccine && formData.deworming_subtype) {
reminderMetadata.deworming_subtype = formData.deworming_subtype
}

const { error: reminderError } = await (supabase as any).from("health_reminders").insert({
pet_id: petId,
profile_id: user.id,
reminder_type: formData.record_type,
title: fullTitle,
description: fullDesc,
due_date: reminderDate,
repeat_interval: repeatInterval,
metadata: reminderMetadata,
})

if (reminderError) {
console.warn("[vaccine-tracker] reminder creation failed:", reminderError.message)
} else {
toast.success(tHealth("reminderCreated", { date: formatDate(reminderDate, locale) }))
}
} catch (e) {
console.warn("[vaccine-tracker] reminder creation error:", e)
}
}
}

// ── shoulduse to Othermembers: for Selected Pet创建相同records + Reminder ──
// Edit模式 also 适use:when PetUpdateRecord,OtherPet创建new Record
if (applyToPets.length > 0) {
const siblingPayloadBase = {...payload }
const siblingSuccessCount: string[] = []
for (const siblingPetId of applyToPets) {
try {
// 创建HealthRecord
const { error: siblingErr } = await createPetHealthRecord({...siblingPayloadBase, pet_id: siblingPetId },
user.id,)
if (siblingErr) {
console.warn(`[vaccine-tracker] sibling record failed for ${siblingPetId}:`, siblingErr.message)
continue
}
siblingSuccessCount.push(siblingPetId)

// 创建Reminder —— 兄弟PetYesnew Record,need to 独立 Reminder
// not 受 formData.create_reminder 控制(Edit模式 该值 for false,但兄弟Pet仍need toReminder)
{
const isVaccine = formData.record_type === "vaccination"
const medName = formData.medication_name.trim()

let sibDueDate: string | null = null
let sibTitle: string = ""
let sibDesc: string = ""

if (isVaccine) {
const shots = formData.shot_number
if (shots.length > 0) {
// Use last shot date for sibling reminder
const sortedShots = [...shots].sort((a, b) => {
if (a === 0) return 1
if (b === 0) return -1
return a - b
})
const lastShot = sortedShots[sortedShots.length - 1]
const lastShotDate = formData.shot_dates[lastShot] ?? effectiveRecordTime
const info = getNextVaccineDueDate(lastShotDate, [lastShot], selectedPreset, locale)
if (info) {
sibDueDate = info.dueDate
sibTitle = `${medName} · ${info.description}${tHealth("reminderSuffix")}`
sibDesc = `${medName} ${info.description}`
}
}
} else {
const info = getNextDewormingDueDate(effectiveRecordTime, selectedPreset, locale)
if (info) {
sibDueDate = info.dueDate
sibTitle = info.description
sibDesc = info.description
}
}

const sibReminderDate = formData.custom_reminder_date || sibDueDate
if (sibReminderDate) {
const sibPreset =!isVaccine? findMedicationPreset(medName, species, "medication"): null
const sibRepeatInterval = sibPreset?.repeatInterval?? (isVaccine? "yearly": "none")

const sibSubTypeLabel =!isVaccine && formData.deworming_subtype? getDewormingSubTypeLabel(formData.deworming_subtype, locale): ""
const sibFullTitle = sibTitle || (isVaccine? `${medName} · ${tHealth("nextVaccineFallback")}`: `${medName}${sibSubTypeLabel? ` · ${sibSubTypeLabel}`: ""} ${tHealth("nextDewormingFallback")}`)
const sibFullDesc = sibDesc || (isVaccine? `${medName} ${tHealth("vaccineReminderFallback")}`: `${medName}${sibSubTypeLabel? ` ${sibSubTypeLabel}`: ""} ${tHealth("dewormingReminderFallback")}`)

const sibReminderMeta: Record<string, unknown> = { medication_name: medName }
if (!isVaccine && formData.deworming_subtype) {
sibReminderMeta.deworming_subtype = formData.deworming_subtype
}

try {
await (supabase as any).from("health_reminders").insert({
pet_id: siblingPetId,
profile_id: user.id,
reminder_type: formData.record_type,
title: sibFullTitle,
description: sibFullDesc,
due_date: sibReminderDate,
repeat_interval: sibRepeatInterval,
metadata: sibReminderMeta,
})
} catch (e) {
console.warn(`[vaccine-tracker] sibling reminder failed for ${siblingPetId}:`, e)
}
}
}
} catch (e) {
console.warn(`[vaccine-tracker] sibling creation error for ${siblingPetId}:`, e)
}
}
if (siblingSuccessCount.length > 0) {
toast.success(tHealth("appliedToPetsCount", { count: siblingSuccessCount.length }))
}
}

setShowForm(false)
setEditingId(null)
setApplyToPets([])
await loadData()
router.refresh()
} catch (err) {
toast.error(err instanceof Error? err.message: tHealth("saveFailedToast"))
} finally {
setSaving(false)
}
}, [user, formData, editingId, petId, supabase, loadData, router, selectedPreset, species, applyToPets])
// Note: autoReminderInfo is now computed in render body (not memoized),
// so handleSave reads it directly from the latest render scope

// ── Delete record ──
const handleDelete = useCallback(async (id: string) => {
if (!user) { openLoginModal(); return }

// 先查 该records 信息,use onclose 联DeleteReminder
const recordToDelete = records.find((r) => r.id === id)

if (!confirm(tHealth("deleteRecordConfirm"))) return

setDeletingId(id)
const { error } = await deleteHealthRecord(id, user.id)

if (error) {
setDeletingId(null)
toast.error(error.message)
return
}

// ── Deleteclose 联 Reminder(many 层匹配Strategy) ──
// 旧Data title cancan Yes "Shot 3Reminder"(not 含药品名),metadata for {}
// 因此need to many 层兜底:source_record_id → metadata.medication_name → title ilike → 同Type全删
const recordType = recordToDelete?.record_type?? "vaccination"
const medName = recordToDelete?.medication_name
let deletedIds: string[] = []

// Strategy1: 通past metadata.source_record_id 精确匹配(new Data)
try {
const { data: bySourceReminders } = await supabase.from("health_reminders").select("id").eq("pet_id", petId).eq("is_completed", false).contains("metadata", { source_record_id: id })

if (bySourceReminders && bySourceReminders.length > 0) {
deletedIds = bySourceReminders.map((r) => r.id)
}
} catch (e) {
console.warn("[vaccine-tracker] Strategy1 (source_record_id) error:", e)
}

// Strategy2: 通past metadata.medication_name 匹配
if (deletedIds.length === 0 && medName) {
try {
const { data: byMetaName } = await supabase.from("health_reminders").select("id").eq("pet_id", petId).eq("is_completed", false).eq("reminder_type", recordType).contains("metadata", { medication_name: medName })

if (byMetaName && byMetaName.length > 0) {
deletedIds = byMetaName.map((r) => r.id)
}
} catch (e) {
console.warn("[vaccine-tracker] Strategy2 (medication_name) error:", e)
}
}

// Strategy3: 通past title ilike 匹配药品名(适use ontitle含药品名 旧Data)
if (deletedIds.length === 0 && medName) {
try {
const { data: byTitle } = await supabase.from("health_reminders").select("id").eq("pet_id", petId).eq("is_completed", false).eq("reminder_type", recordType).ilike("title", `%${medName}%`)

if (byTitle && byTitle.length > 0) {
deletedIds = byTitle.map((r) => r.id)
}
} catch (e) {
console.warn("[vaccine-tracker] Strategy3 (title ilike) error:", e)
}
}

// Strategy4: 通past description ilike 匹配药品名
if (deletedIds.length === 0 && medName) {
try {
const { data: byDesc } = await supabase.from("health_reminders").select("id").eq("pet_id", petId).eq("is_completed", false).eq("reminder_type", recordType).ilike("description", `%${medName}%`)

if (byDesc && byDesc.length > 0) {
deletedIds = byDesc.map((r) => r.id)
}
} catch (e) {
console.warn("[vaccine-tracker] Strategy4 (description ilike) error:", e)
}
}

// Strategy5: 兜底 — Delete该Petall同Type notDoneReminder
// 适use on旧VaccineData(title="Shot 3Reminder",metadata={},No法匹配药品名)
if (deletedIds.length === 0) {
try {
const { data: byType } = await supabase.from("health_reminders").select("id").eq("pet_id", petId).eq("is_completed", false).eq("reminder_type", recordType)

if (byType && byType.length > 0) {
deletedIds = byType.map((r) => r.id)
}
} catch (e) {
console.warn("[vaccine-tracker] Strategy5 (same type) error:", e)
}
}

// 执行Delete
if (deletedIds.length > 0) {
try {
await supabase.from("health_reminders").delete().in("id", deletedIds)
} catch (e) {
console.warn("[vaccine-tracker] reminder delete execution error:", e)
}
}

setDeletingId(null)

// 重new 加载 records and reminders
await loadData()
toast.success(tHealth("recordDeletedToast"))
router.refresh()
}, [user, router, records, petId, supabase, loadData])

// ── Loading ──
if (loading) {
return (<div className="rounded-[24px] border border-white/60 bg-white/65 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] backdrop-blur-2xl">
<div className="mb-5 flex items-center gap-2.5">
<div className="size-7 shrink-0 rounded-[8px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC]" />
<div className="space-y-1.5">
<div className="h-4 w-28 rounded-full bg-black/[0.06]" />
<div className="h-3 w-20 rounded-full bg-black/[0.04]" />
</div>
</div>
<div className="divide-y divide-black/[0.04]">
{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="flex items-center gap-3 py-3.5">
<div className="size-7 shrink-0 rounded-full bg-black/[0.05]" />
<div className="flex-1 space-y-1.5">
<div className="h-3.5 w-32 rounded-full bg-black/[0.06]" />
<div className="h-3 w-full rounded-full bg-black/[0.04]" />
</div>
</div>))}
</div>
</div>)
}

// ── Filter records ──
const filteredRecords = records.filter((r) => {
if (filter === "all") return true
if (filter === "vaccine") return r.record_type === "vaccination"
// deworming
if (r.record_type!== "medication") return false
if (!dewormingSubFilter) return true
// 按Deworming子Typepast 滤
const meta = r.metadata as { deworming_subtype?: string | null } | null
const subType = (meta?.deworming_subtype as DewormingSubType | undefined)?? inferDewormingSubType(r.medication_name?? "", species)
return subType === dewormingSubFilter
})

// ── Filter reminders ──
const filteredReminders = reminders.filter((r) => {
if (filter === "all") return true
if (filter === "vaccine") return r.reminder_type === "vaccination"
return r.reminder_type === "medication"
})

// ── Group records by date ──
const groupedRecords: Record<string, HealthRecord[]> = {}
filteredRecords.forEach((record) => {
const dateKey = formatDate(record.record_time, locale)
if (!groupedRecords[dateKey]) groupedRecords[dateKey] = []
groupedRecords[dateKey].push(record)
})

return (<div className="rounded-[24px] border border-white/60 bg-white/65 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] backdrop-blur-2xl">
{/* ── Section Header ── */}
<div className="mb-5 flex items-center gap-2.5">
<div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC] shadow-[0_1px_3px_rgba(255,122,89,0.15)]">
<FluentEmoji src={FLUENT_EMOJI.syringe} alt="syringe" size={16} />
</div>
<div className="min-w-0 flex-1">
<h2 className="text-[15px] font-semibold leading-tight text-[#1a1a1a]">{tHealth("vaccineDewormingTitle")}</h2>
<p className="mt-0.5 text-[11.5px] text-[#86867e]">{tHealth("vaccineDewormingDesc")}</p>
</div>
<span className="shrink-0 rounded-full bg-black/[0.05] px-2.5 py-1 text-[11.5px] font-medium text-[#86867e]">
{filteredRecords.length} {tHealth("recordCount", { count: filteredRecords.length })}
</span>
{/* Add button */}
<button
onClick={handleOpenAdd}
className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A59] text-white shadow-[0_1px_6px_rgba(255,122,89,0.3)] transition-all hover:bg-[#E86A4A] active:scale-95"
title={tHealth("addRecordBtn")}
>
<FluentEmoji src={FLUENT_EMOJI.plus} alt="plus" size={14} />
</button>
</div>

{/* ── Inline Form (Add / Edit) ── */}
{showForm && (<div className="mb-5 rounded-[16px] border border-black/[0.06] bg-black/[0.015] p-4">
{/* Type toggle */}
<div className="mb-3 flex gap-2">
{(["vaccination", "medication"] as const).map((type) => {
const isVaccine = type === "vaccination"
return (<button
key={type}
onClick={() => setFormData((prev) => ({...prev, record_type: type, shot_number: [], shot_dates: {}, deworming_subtype: type === "medication"? prev.deworming_subtype: null }))}
className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[13px] font-medium transition-all",
formData.record_type === type? "bg-white text-[#1a1a1a] shadow-[0_1px_6px_rgba(0,0,0,0.06)]": "text-[#86867e] hover:text-[#555]",)}
>
<FluentEmoji
src={isVaccine? FLUENT_EMOJI.syringe: FLUENT_EMOJI.pill}
alt={isVaccine? "syringe": "pill"}
size={14}
/>
{isVaccine? tHealth("vaccineLabel"): tHealth("dewormingLabel")}
</button>)
})}
</div>

{/* Deworming sub-type selector — only for medication */}
{formData.record_type === "medication" && (<div className="mb-3">
<label className="mb-1.5 block text-[12px] font-medium text-[#86867e]">{tHealth("dewormingType")}</label>
<div className="flex gap-1.5">
{([
{ key: "internal", label: tHealth("internalDeworming"), color: "#4CAF50" },
{ key: "external", label: tHealth("externalDeworming"), color: "#2196F3" },
{ key: "both", label: tHealth("bothDeworming"), color: "#9C27B0" },
] as const).map((opt) => (<button
key={opt.key}
type="button"
onClick={() => setFormData((prev) => ({...prev,
deworming_subtype: prev.deworming_subtype === opt.key? null: opt.key,
medication_name: "",
}))}
className={cn("flex-1 rounded-[10px] py-1.5 text-[12px] font-medium transition-all",
formData.deworming_subtype === opt.key? "text-white shadow-[0_1px_6px_rgba(0,0,0,0.1)]": "bg-white/60 text-[#86867e] hover:text-[#555]",)}
style={
formData.deworming_subtype === opt.key? { backgroundColor: opt.color }: undefined
}
>
{opt.label}
</button>))}
</div>
<p className="mt-1 text-[11px] text-[#c5c5c2]">
{tHealth("dewormingTypeHint")}
</p>
</div>)}

{/* Date — only for deworming (vaccines use per-shot dates) */}
{formData.record_type === "medication" && (<div className="mb-3">
<label className="mb-1.5 block text-[12px] font-medium text-[#86867e]">{tHealth("dateLabel")}</label>
<input
type="date"
value={formData.record_time}
onChange={(e) => setFormData((prev) => ({...prev, record_time: e.target.value }))}
className="w-full rounded-[10px] border border-black/[0.08] bg-white/60 px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#FF7A59]/40"
/>
</div>)}

{/* Name — fuzzy search combobox */}
<div className="mb-3">
<label className="mb-1.5 block text-[12px] font-medium text-[#86867e]">
{formData.record_type === "vaccination"? tHealth("vaccineName"): tHealth("medicationName")}
</label>
<MedicationCombobox
value={formData.medication_name}
onChange={(val) => setFormData((prev) => ({...prev, medication_name: val, shot_number: [], shot_dates: {} }))}
species={species}
recordType={formData.record_type}
dewormingSubType={formData.deworming_subtype}
/>
</div>

{/* Shot number — only for vaccines, multi select */}
{formData.record_type === "vaccination" && (<div className="mb-3">
<label className="mb-1.5 block text-[12px] font-medium text-[#86867e]">{tHealth("shotNumberLabel")}</label>
<div className="flex gap-1.5">
{shotOptions.map((opt) => {
const shotLabel = opt.value === 0 ? tHealth("booster") : tHealth("shotN", { n: opt.value })
return (<button
key={opt.value}
type="button"
onClick={() => setFormData((prev) => {
const isSelected = prev.shot_number.includes(opt.value)
const newShots = isSelected ? prev.shot_number.filter((s) => s !== opt.value) : [...prev.shot_number, opt.value]
const newDates = { ...prev.shot_dates }
if (isSelected) {
delete newDates[opt.value]
}
return { ...prev, shot_number: newShots, shot_dates: newDates }
})}
className={cn("flex-1 rounded-[10px] py-1.5 text-[12px] font-medium transition-all",
formData.shot_number.includes(opt.value)? "bg-[#FF7A59] text-white shadow-[0_1px_6px_rgba(255,122,89,0.2)]": "bg-white/60 text-[#86867e] hover:text-[#555]",)}
>
{shotLabel}
</button>)
})}
</div>

{/* Per-shot date inputs */}
{formData.shot_number.length > 0 && (<div className="mt-2.5 space-y-2">
<p className="text-[11px] text-[#86867e]">{tHealth("shotDateHint")}</p>
{[...formData.shot_number].sort((a, b) => {
if (a === 0) return 1
if (b === 0) return -1
return a - b
}).map((sn) => {
const shotLabel = sn === 0 ? tHealth("booster") : tHealth("shotN", { n: sn })
const sortedShots = [...formData.shot_number].sort((a, b) => {
if (a === 0) return 1
if (b === 0) return -1
return a - b
})
const isFirst = sortedShots[0] === sn
return (<div key={sn} className="flex items-center gap-2">
<span className="w-16 shrink-0 text-[12px] font-medium text-[#1a1a1a]">{shotLabel}</span>
<input
type="date"
value={formData.shot_dates[sn] ?? ""}
onChange={(e) => {
const newDate = e.target.value
setFormData((prev) => {
let newDates = { ...prev.shot_dates, [sn]: newDate }
// Auto-calculate all subsequent shot dates when first shot date changes
if (isFirst && newDate) {
newDates = computeAutoShotDates(newDate, prev.shot_number, selectedPreset)
}
return { ...prev, shot_dates: newDates }
})
}}
className="flex-1 rounded-[8px] border border-black/[0.08] bg-white/60 px-2 py-1 text-[12px] text-[#1a1a1a] outline-none focus:border-[#FF7A59]/40"
/>
</div>)
})}
</div>)}

{/* Brand Notice(based on onalready) */}
{selectedPreset?.shotIntervals && autoReminderInfo && (<p className="mt-1.5 text-[11px] text-[#86867e]">
<FluentEmoji src={FLUENT_EMOJI.alarmClock} alt="alarm clock" size={11} className="mr-1 inline-block align-text-bottom" />
{tHealth("autoReminderInfo", { desc: autoReminderInfo.description, date: formatDate(autoReminderInfo.dueDate, locale) })}
</p>)}
</div>)}

{/* Vet clinic + Vet name */}
<div className="mb-3 flex gap-2">
<div className="flex-1">
<label className="mb-1.5 block text-[12px] font-medium text-[#86867e]">{tHealth("vetClinic")}</label>
<input
type="text"
value={formData.vet_clinic}
onChange={(e) => setFormData((prev) => ({...prev, vet_clinic: e.target.value }))}
placeholder={tHealth("vetClinicPlaceholder")}
className="w-full rounded-[10px] border border-black/[0.08] bg-white/60 px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#FF7A59]/40 placeholder:text-[#c5c5c2]"
/>
</div>
<div className="flex-1">
<label className="mb-1.5 block text-[12px] font-medium text-[#86867e]">{tHealth("vetName")}</label>
<input
type="text"
value={formData.vet_name}
onChange={(e) => setFormData((prev) => ({...prev, vet_name: e.target.value }))}
placeholder={tHealth("vetNamePlaceholder")}
className="w-full rounded-[10px] border border-black/[0.08] bg-white/60 px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#FF7A59]/40 placeholder:text-[#c5c5c2]"
/>
</div>
</div>

{/* Notes */}
<div className="mb-3">
<label className="mb-1.5 block text-[12px] font-medium text-[#86867e]">{tHealth("notesLabel")}</label>
<textarea
value={formData.notes}
onChange={(e) => setFormData((prev) => ({...prev, notes: e.target.value }))}
placeholder={tHealth("notesPlaceholder")}
rows={2}
className="w-full resize-none rounded-[10px] border border-black/[0.08] bg-white/60 px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#FF7A59]/40 placeholder:text-[#c5c5c2]"
/>
</div>

{/* ── NextReminder ── */}
{!editingId && (<div className="mb-4 rounded-[12px] border border-[#FF7A59]/15 bg-[#FF7A59]/[0.03] p-3">
<label className="flex cursor-pointer items-center gap-2">
<input
type="checkbox"
checked={formData.create_reminder}
onChange={(e) => setFormData((prev) => ({...prev, create_reminder: e.target.checked }))}
className="size-4 rounded border-black/[0.15] text-[#FF7A59] accent-[#FF7A59]"
/>
<div className="flex items-center gap-1.5">
<FluentEmoji src={FLUENT_EMOJI.alarmClock} alt="alarm clock" size={14} />
<span className="text-[12.5px] font-medium text-[#1a1a1a]">{tHealth("setNextReminder")}</span>
</div>
</label>

{formData.create_reminder && autoReminderInfo && (<div className="mt-2.5 pl-6">
<p className="text-[11.5px] text-[#86867e]">
{tHealth("autoReminderInfo", { desc: autoReminderInfo.description, date: formatDate(autoReminderInfo.dueDate, locale) })}
</p>
<div className="mt-2 flex items-center gap-2">
<span className="text-[11px] text-[#86867e]">{tHealth("customDate")}</span>
<input
type="date"
value={formData.custom_reminder_date}
onChange={(e) => setFormData((prev) => ({...prev, custom_reminder_date: e.target.value }))}
placeholder={autoReminderInfo.dueDate}
className="rounded-[8px] border border-black/[0.08] bg-white/60 px-2 py-1 text-[12px] text-[#1a1a1a] outline-none focus:border-[#FF7A59]/40"
/>
{formData.custom_reminder_date && (<button
type="button"
onClick={() => setFormData((prev) => ({...prev, custom_reminder_date: "" }))}
className="text-[11px] text-[#86867e] hover:text-[#555]"
>
{tHealth("reset")}
</button>)}
</div>
<p className="mt-1.5 text-[10.5px] text-[#c5c5c2]">
{tHealth("reminderNotifyHint")}
</p>
</div>)}

{formData.create_reminder &&!autoReminderInfo && (<div className="mt-2.5 pl-6">
<p className="text-[11px] text-[#86867e]">
{formData.record_type === "vaccination"? tHealth("selectDateForReminder"): tHealth("enterNameForReminder")}
</p>
<div className="mt-2 flex items-center gap-2">
<span className="text-[11px] text-[#86867e]">{tHealth("setNextReminder")}:</span>
<input
type="date"
value={formData.custom_reminder_date}
onChange={(e) => setFormData((prev) => ({...prev, custom_reminder_date: e.target.value }))}
className="rounded-[8px] border border-black/[0.08] bg-white/60 px-2 py-1 text-[12px] text-[#1a1a1a] outline-none focus:border-[#FF7A59]/40"
/>
</div>
</div>)}
</div>)}

{/* ── shoulduse to Othermembers ── */}
<div className="mb-4">
<MultiPetSelector
currentPetId={petId}
selectedPetIds={applyToPets}
onChange={setApplyToPets}
speciesFilter={species?? null}
hint={editingId? tPet("editApplyHint"): undefined}
/>
</div>

{/* Actions */}
<div className="flex gap-2">
<button
onClick={handleCloseForm}
className="flex-1 rounded-full border border-black/[0.1] py-2 text-[13px] font-medium text-[#6B6B6B] transition-colors hover:bg-black/[0.02]"
>
{tHealth("cancelBtn")}
</button>
<button
onClick={handleSave}
disabled={saving}
className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FF7A59] py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#E86A4A] active:scale-[0.98] disabled:opacity-50"
>
{saving? tHealth("savingBtn"): editingId? tHealth("saveBtn"): tHealth("addRecordBtn")}
</button>
</div>
</div>)}

{/* ── Filter Chips ── */}
<div className="mb-4 -mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
<div className="flex gap-1.5 px-1">
{filterCategories.map((cat) => (<button
key={cat.key}
onClick={() => {
setFilter(cat.key)
if (cat.key!== "deworming") setDewormingSubFilter(null)
}}
className={cn("flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200",
filter === cat.key? "bg-white text-[#1a1a1a] shadow-[0_1px_6px_rgba(0,0,0,0.06)]": "text-[#86867e] hover:text-[#555]",)}
>
<FluentEmoji src={cat.emoji} alt={cat.alt} size={12} />
{tHealth(cat.label)}
</button>))}
</div>
</div>

{/* ── Deworming Sub-Filter Chips ── */}
{filter === "deworming" && (<div className="mb-4 -mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
<div className="flex gap-1.5 px-1">
<button
onClick={() => setDewormingSubFilter(null)}
className={cn("flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all duration-200",
dewormingSubFilter === null? "bg-white text-[#1a1a1a] shadow-[0_1px_6px_rgba(0,0,0,0.06)]": "text-[#86867e] hover:text-[#555]",)}
>
{tHealth("allRecords")}
</button>
{([
{ key: "internal" as const, label: tHealth("internalDeworming"), color: "#4CAF50" },
{ key: "external" as const, label: tHealth("externalDeworming"), color: "#2196F3" },
{ key: "both" as const, label: tHealth("bothDeworming"), color: "#9C27B0" },
]).map((opt) => (<button
key={opt.key}
onClick={() => setDewormingSubFilter(dewormingSubFilter === opt.key? null: opt.key)}
className={cn("flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all duration-200",
dewormingSubFilter === opt.key? "text-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]": "text-[#86867e] hover:text-[#555]",)}
style={
dewormingSubFilter === opt.key? { backgroundColor: opt.color }: undefined
}
>
{opt.label}
</button>))}
</div>
</div>)}

{/* ── Upcoming Reminders ── */}
{filteredReminders.length > 0 && (<div className="mb-4 flex flex-wrap gap-2">
{filteredReminders.map((reminder) => {
const isOverdue = new Date(reminder.due_date + "T00:00:00") < new Date(new Date().toDateString())
const isVaccine = reminder.reminder_type === "vaccination"
return (<div
key={reminder.id}
className={cn("flex items-center gap-2 rounded-[12px] border px-3 py-2",
isOverdue? "border-[#ff3b30]/20 bg-[#ff3b30]/5": "border-black/[0.06] bg-black/[0.02]",)}
>
<FluentEmoji
src={isVaccine? FLUENT_EMOJI.syringe: FLUENT_EMOJI.pill}
alt={isVaccine? "syringe": "pill"}
size={16}
/>
<div className="min-w-0">
<p className="text-[12.5px] font-medium text-[#1a1a1a]">{reminder.title}</p>
<p className={cn("text-[11px]", isOverdue? "text-[#ff3b30]": "text-[#86867e]")}>
{formatRelativeDate(reminder.due_date, tHealth)}
{reminder.repeat_interval && reminder.repeat_interval!== "none" && " · "}
</p>
</div>
</div>)
})}
</div>)}

{/* ── Records Timeline ── */}
{filteredRecords.length === 0? (<div className="flex flex-col items-center justify-center py-16">
<FluentEmoji src={FLUENT_EMOJI.syringe} alt="syringe" size={48} className="mb-3 opacity-50" />
<p className="text-[14px] font-medium text-[#86867e]">{tHealth("noVaccineRecord")}</p>
<p className="mt-1 text-[12px] text-[#c5c5c2]">{tHealth("clickToAdd")}</p>
</div>): (<div className="divide-y divide-black/[0.04]">
{Object.entries(groupedRecords).map(([dateKey, dayRecords]) => (<div key={dateKey} className="py-3.5 first:pt-0 last:pb-0">
{/* Date header */}
<div className="mb-2.5 flex items-center gap-1.5">
<FluentEmoji src={FLUENT_EMOJI.calendar} alt="calendar" size={14} />
<span className="text-[12px] font-medium text-[#86867e]">{dateKey}</span>
</div>

{/* Records within this date */}
<div className="space-y-2.5 pl-5">
{dayRecords.map((record) => {
const isVaccine = record.record_type === "vaccination"
return (<div key={record.id} className="group flex items-start gap-2.5">
{/* Icon */}
<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.03]">
<FluentEmoji
src={isVaccine? FLUENT_EMOJI.syringe: FLUENT_EMOJI.pill}
alt={isVaccine? "syringe": "pill"}
size={14}
/>
</div>

{/* Content */}
<div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
<span className="text-[13.5px] font-medium text-[#1a1a1a]">
{isVaccine? tHealth("vaccinationRecord"): tHealth("dewormingMedicationRecord")}
</span>
{/* DewormingTypeTag */}
{!isVaccine && (() => {
const meta = record.metadata as { deworming_subtype?: string | null } | null
const subType = (meta?.deworming_subtype as DewormingSubType | undefined)?? inferDewormingSubType(record.medication_name?? "", species)
if (!subType) return null
const colorMap: Record<DewormingSubType, string> = {
internal: "bg-[#4CAF50]/10 text-[#4CAF50]",
external: "bg-[#2196F3]/10 text-[#2196F3]",
both: "bg-[#9C27B0]/10 text-[#9C27B0]",
}
return (<span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium", colorMap[subType])}>
{subType === "internal"? tHealth("internalDeworming"): subType === "external"? tHealth("externalDeworming"): tHealth("bothDeworming")}
</span>)
})()}
{record.medication_name && (<span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10.5px] font-medium text-[#86867e]">
{record.medication_name}
</span>)}
{isVaccine && (() => {
const meta = record.metadata as { shot_number?: number | number[] | null; shot_dates?: Record<number, string> | null } | null
const rawSn = meta?.shot_number
// 兼容旧Data:cancan Yes单数 chars or 数组
const snArray = Array.isArray(rawSn)? rawSn: (rawSn!= null? [rawSn]: [])
if (snArray.length === 0) return null
// Sort:数 chars针次,Booster(0) after 
const sorted = [...snArray].sort((a, b) => {
const sa = a === 0? 99: a
const sb = b === 0? 99: b
return sa - sb
})
const metaShotDates = (meta?.shot_dates as Record<number, string> | null) ?? {}
return (<div className="flex flex-wrap gap-1">
{sorted.map((sn, i) => {
const shotDate = metaShotDates[sn] ?? record.record_time
return (<span key={i} className="rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-[10.5px] font-medium text-[#FF7A59]">
{sn === 0 ? tHealth("booster") : tHealth("shotN", { n: sn })} · {formatDate(shotDate, locale)}
</span>)
})}
</div>)
})()}
</div>
{/* Extra info */}
{(record.vet_clinic || record.vet_name) && (<p className="mt-0.5 text-[12px] text-[#86867e]">
{record.vet_clinic && record.vet_name? `${record.vet_clinic} · ${record.vet_name}`: record.vet_clinic || record.vet_name}
</p>)}
{record.notes && (<p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#86867e]">
{record.notes}
</p>)}
</div>

{/* Action buttons — always visible */}
<div className="flex shrink-0 items-center gap-1">
<button
onClick={() => handleOpenEdit(record)}
className="flex size-6 items-center justify-center rounded-full text-[#c5c5c2] transition-colors hover:bg-black/[0.04] hover:text-[#555]"
title={tHealth("editLabel")}
>
<FluentEmoji src={FLUENT_EMOJI.pencil} alt="pencil" size={12} />
</button>
<button
onClick={() => handleDelete(record.id)}
disabled={deletingId === record.id}
className="flex size-6 items-center justify-center rounded-full text-[#c5c5c2] transition-colors hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] disabled:opacity-50"
title={tHealth("deleteLabel")}
>
{deletingId === record.id? "⏳": "✕"}
</button>
</div>
</div>)
})}
</div>
</div>))}
</div>)}
</div>)
}
