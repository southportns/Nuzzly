"use client"

import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { openLoginModal } from "@/hooks/use-login-modal"
import { createPetHealthRecord, updatePetWeight, deleteHealthRecord } from "@/lib/supabase/actions/pet-form-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"

interface WeightLog {
id: string
weight_kg: number
logged_date: string
}

export function WeightTracker({ petId, currentWeight, weightLogs }: {
petId: string
currentWeight: number | null
weightLogs: WeightLog[]
}) {
const router = useRouter()
const { user } = useAuth()
const tHealth = useTranslations("Health")
const tPet = useTranslations("Pet")
const locale = useLocale()
const [loading, setLoading] = useState(false)
const [logs, setLogs] = useState(weightLogs)
const [deletingId, setDeletingId] = useState<string | null>(null)

async function handleAddWeight(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault()
if (loading) return
if (!user) {
openLoginModal()
return
}
const form = e.currentTarget
setLoading(true)

const formData = new FormData(form)
const weight = parseFloat(formData.get("weight") as string)
const roundedWeight = Math.round(weight * 100) / 100
const recordTime = new Date().toISOString()

// 1. 插 WeightRecordto health_records
const { error: recordError } = await createPetHealthRecord({
pet_id: petId,
profile_id: user.id,
record_type: "weight",
weight_kg: roundedWeight,
record_time: recordTime,
}, user.id)

if (recordError) {
setLoading(false)
toast.error(recordError.message)
return
}

// 2. 同步Updatepet profile when Weight
const { error: weightError } = await updatePetWeight(petId, roundedWeight, user.id)
if (weightError) {
toast.error(tHealth("weightUpdateFailed"))
}

// Update local state to sync chart immediately
setLogs((prev) => [...prev, { id: crypto.randomUUID(), weight_kg: roundedWeight, logged_date: recordTime }])

setLoading(false)
toast.success(tHealth("weightRecorded"))
form.reset()
router.refresh()
}

async function handleDeleteWeight(id: string) {
if (!user) { openLoginModal(); return }
if (!confirm(tHealth("weightDeleteConfirm"))) return

setDeletingId(id)
const { error } = await deleteHealthRecord(id, user.id)
setDeletingId(null)

if (error) {
toast.error(error.message)
return
}

setLogs((prev) => prev.filter((log) => log.id!== id))
toast.success(tHealth("weightRecordDeleted"))
router.refresh()
}

// Chart calculations
const displayLogs = logs.slice(-10) // Show last 10 records
const minWeight = displayLogs.length > 0? Math.min(...displayLogs.map((l) => l.weight_kg)): 0
const maxWeight = displayLogs.length > 0? Math.max(...displayLogs.map((l) => l.weight_kg)): 10
const chartMin = Math.floor(minWeight - 0.5)
const chartMax = Math.ceil(maxWeight + 0.5)
const chartRange = chartMax - chartMin || 1

const barHeight = (weight: number) => ((weight - chartMin) / chartRange) * 140
const formatDate = (dateStr: string) => {
const date = new Date(dateStr)
return `${date.getMonth() + 1}/${date.getDate()}`
}

return (<div className="space-y-4">
{/* Add Weight */}
<Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
<CardHeader>
<CardTitle className="flex items-center gap-2 text-base">
<FluentEmoji src={FLUENT_EMOJI.chartUp} alt="chart increasing" size={16} className="text-[#FF7A59]" />
{tHealth("weightRecord")}
</CardTitle>
</CardHeader>
<CardContent>
<form onSubmit={handleAddWeight} className="flex items-end gap-3">
<div className="flex-1 space-y-2">
<Label htmlFor="weight">{tHealth("weightKg")}</Label>
<Input
id="weight"
name="weight"
type="number"
step="0.01"
min={0}
max={100}
required
placeholder={currentWeight? tHealth("currentWeightLabel", { weight: Number(currentWeight).toFixed(2) }): tHealth("enterWeight")}
className="rounded-[12px] border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[14px]"
/>
</div>
<Button type="submit" size="sm" disabled={loading} className="rounded-[12px] bg-[#111111] hover:bg-[#333333]">
{loading && <FluentEmoji src={FLUENT_EMOJI.hourglass} alt="hourglass" size={16} className="mr-2 animate-spin" />}
{tHealth("recordBtn")}
</Button>
</form>
</CardContent>
</Card>

{/* Weight Chart */}
{displayLogs.length > 0 && (<Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
<CardHeader>
<CardTitle className="text-base">{tHealth("weightTrends")}</CardTitle>
<p className="text-sm text-[#6B6B6B]">
{tHealth("weightRecordCount", { count: displayLogs.length })} · {Number(displayLogs[0]?.weight_kg).toFixed(2)}kg → {Number(displayLogs[displayLogs.length - 1]?.weight_kg).toFixed(2)}kg
</p>
</CardHeader>
<CardContent>
{/* Bar Chart */}
<div className="relative h-[200px] w-full">
{/* Y-axis labels */}
<div className="absolute left-0 top-0 flex h-[160px] flex-col justify-between text-[10px] text-[#9A9A95]">
<span>{chartMax.toFixed(1)}</span>
<span>{((chartMax + chartMin) / 2).toFixed(1)}</span>
<span>{chartMin.toFixed(1)}</span>
</div>

{/* Chart area */}
<div className="ml-10 h-[160px] border-b border-[rgba(0,0,0,0.06)]">
{/* Grid lines */}
<div className="relative h-full">
{[0.25, 0.5, 0.75].map((ratio) => (<div
key={ratio}
className="absolute left-0 right-0 border-t border-dashed border-[rgba(0,0,0,0.04)]"
style={{ top: `${ratio * 100}%` }}
/>))}

{/* Bars */}
<div className="flex h-full items-end justify-around gap-1 px-2">
{displayLogs.map((log) => {
const height = barHeight(log.weight_kg)
const isLatest = log.id === displayLogs[displayLogs.length - 1]?.id
return (<div key={log.id} className="group relative flex flex-col items-center">
{/* Tooltip */}
<div className="absolute bottom-full mb-2 hidden rounded-[8px] bg-[#111111] px-2 py-1 text-[11px] text-white group-hover:block">
{Number(log.weight_kg).toFixed(2)}kg
</div>
{/* Bar */}
<div
className={`w-full max-w-[32px] rounded-t-[6px] transition-all ${
isLatest? "bg-gradient-to-t from-[#FF7A59] to-[#FF9A76]": "bg-gradient-to-t from-[#E8E8E6] to-[#F5F5F3]"
}`}
style={{ height: `${height}px` }}
/>
{/* Date label */}
<span className="mt-1.5 text-[9px] text-[#9A9A95]">
{formatDate(log.logged_date)}
</span>
</div>)
})}
</div>
</div>
</div>
</div>

{/* History list */}
<div className="mt-6 space-y-2">
<h4 className="text-sm font-medium text-[#111111]">{tHealth("weightHistoryRecords")}</h4>
{displayLogs.slice().reverse().map((log) => (<div key={log.id} className="flex items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-[#FAFAF9] p-3">
<div className="flex items-center gap-3">
<div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F0F0EE] text-[11px] font-medium text-[#6B6B6B]">
{Number(log.weight_kg).toFixed(1)}
</div>
<div>
<span className="text-sm font-medium text-[#111111]">{Number(log.weight_kg).toFixed(2)} kg</span>
<p className="text-xs text-[#6B6B6B]">
{new Date(log.logged_date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
year: "numeric",
month: "long",
day: "numeric",
})}
</p>
</div>
</div>
<Button
variant="ghost"
size="icon"
className="size-7 text-[#D2D1CF] hover:text-[#E85D4A] hover:bg-[#E85D4A]/10"
onClick={() => handleDeleteWeight(log.id)}
disabled={deletingId === log.id}
>
<FluentEmoji src={FLUENT_EMOJI.trash} alt="wastebasket" size={14} />
</Button>
</div>))}
</div>
</CardContent>
</Card>)}

{logs.length === 0 && (<div className="rounded-[20px] border-2 border-dashed border-[rgba(0,0,0,0.06)] p-8 text-center">
<FluentEmoji src={FLUENT_EMOJI.chartUp} alt="chart increasing" size={32} className="mx-auto text-[#D2D1CF]" />
<p className="mt-2 text-sm text-[#6B6B6B]">{tHealth("noWeightRecord")}</p>
<p className="text-xs text-[#6B6B6B]/60">{tHealth("weightRecordHint")}</p>
</div>)}
</div>)
}
