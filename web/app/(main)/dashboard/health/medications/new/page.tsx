"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

const frequencyOptions = [
{ value: "once_daily", label: "Once daily" },
{ value: "twice_daily", label: "Twice daily" },
{ value: "three_times_daily", label: "Three times daily" },
{ value: "weekly", label: "Once weekly" },
{ value: "as_needed", label: "As needed" },
]

export default function NewMedicationPage() {
const router = useRouter()
const searchParams = useSearchParams()
const petId = searchParams.get("pet")

const [loading, setLoading] = useState(false)
const [name, setName] = useState("")
const [dosage, setDosage] = useState("")
const [frequency, setFrequency] = useState("once_daily")
const [startedOn, setStartedOn] = useState(new Date().toISOString().split("T")[0])
const [isOngoing, setIsOngoing] = useState(true)
const [notes, setNotes] = useState("")

async function handleSubmit(e: React.FormEvent) {
e.preventDefault()

if (!name.trim()) {
toast.error("Please enter medication name")
return
}

if (!petId) {
toast.error("Please selectPet")
return
}

setLoading(true)

try {
const response = await fetch("/api/medications", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
pet_id: petId,
name: name.trim(),
dosage: dosage.trim() || null,
frequency,
started_on: startedOn,
is_ongoing: isOngoing,
notes: notes.trim() || null,
}),
})

if (!response.ok) throw new Error("Creation failed")

toast.success("MedicationRecordcreated successfully")
router.push("/dashboard/health/medications")
} catch (error) {
toast.error("Creation failed,please try again")
} finally {
setLoading(false)
}
}

return (<div className="space-y-6">
{/* Header */}
<div className="flex items-center gap-4">
<Link href="/dashboard/health/medications" className="flex items-center gap-1 text-[14px] text-[#6B6B6B] hover:text-[#111111]">
<EmojiIcon name="ArrowLeft" className="size-4" />
return
</Link>
<h1 className="text-[28px] font-semibold text-[#111111]">AddMedicationRecord</h1>
</div>

{/* Form */}
<form onSubmit={handleSubmit} className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
<div className="space-y-5">
{/* Medication Name */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Medication Name</label>
<input
type="text"
value={name}
onChange={(e) => setName(e.target.value)}
placeholder="e.g.:deworming medicine,vitamins,anti-inflammatory"
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Dosage */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Dosage</label>
<input
type="text"
value={dosage}
onChange={(e) => setDosage(e.target.value)}
placeholder="e.g.:1,5ml,0.5g"
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Frequency */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Dosage Frequency</label>
<div className="flex flex-wrap gap-2">
{frequencyOptions.map((opt) => (<button
key={opt.value}
type="button"
onClick={() => setFrequency(opt.value)}
className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
frequency === opt.value? "bg-[#FF7A59] text-white": "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
}`}
>
{opt.label}
</button>))}
</div>
</div>

{/* Start Date */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">StartDate</label>
<input
type="date"
value={startedOn}
onChange={(e) => setStartedOn(e.target.value)}
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Ongoing Toggle */}
<div>
<div className="flex items-center justify-between">
<label className="text-[14px] font-medium text-[#111111]">Ongoing Medication</label>
<button
type="button"
onClick={() => setIsOngoing(!isOngoing)}
className={`relative size-11 rounded-full transition-colors ${
isOngoing? "bg-[#34c759]": "bg-[#E8E8E8]"
}`}
>
<span
className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
isOngoing? "translate-x-[22px]": "translate-x-0.5"
}`}
/>
</button>
</div>
<p className="mt-1 text-[12px] text-[#6B6B6B]">After saving, it will be marked as"Ongoing"</p>
</div>

{/* Notes */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Notes</label>
<textarea
value={notes}
onChange={(e) => setNotes(e.target.value)}
placeholder="RecordMedicationreason,notes etc...."
rows={3}
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none resize-none"
/>
</div>
</div>

{/* Submit */}
<div className="mt-6 flex gap-3">
<Link
href="/dashboard/health/medications"
className="flex-1 rounded-full border border-[rgba(0,0,0,0.1)] py-3 text-center text-[14px] text-[#6B6B6B] hover:bg-[#F7F6F3]"
>
Cancel
</Link>
<button
type="submit"
disabled={loading ||!name.trim()}
className="flex-1 rounded-full bg-[#FF7A59] py-3 text-[14px] font-medium text-white hover:bg-[#FF6A49] disabled:opacity-50"
>
{loading? <EmojiIcon name="Loader2" className="mx-auto size-5 animate-spin" />: "SaveRecord"}
</button>
</div>
</form>
</div>)
}
