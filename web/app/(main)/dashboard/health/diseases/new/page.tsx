"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

const severityOptions = [
{ value: "mild", label: "Mild", color: "#34c759" },
{ value: "moderate", label: "Moderate", color: "#ff9500" },
{ value: "severe", label: "Severe", color: "#ff3b30" },
{ value: "critical", label: "Critical", color: "#ff2d55" },
]

const statusOptions = [
{ value: "active", label: "Ongoing" },
{ value: "under_treatment", label: "Under Treatment" },
{ value: "chronic", label: "Chronic" },
{ value: "resolved", label: "Recovered" },
]

export default function NewDiseasePage() {
const router = useRouter()
const searchParams = useSearchParams()
const petId = searchParams.get("pet")

const [loading, setLoading] = useState(false)
const [name, setName] = useState("")
const [severity, setSeverity] = useState("mild")
const [status, setStatus] = useState("active")
const [diagnosedOn, setDiagnosedOn] = useState(new Date().toISOString().split("T")[0])
const [recoveredOn, setRecoveredOn] = useState("")
const [symptoms, setSymptoms] = useState("")
const [notes, setNotes] = useState("")

function handleStatusChange(value: string) {
setStatus(value)
if (value === "resolved" &&!recoveredOn) {
setRecoveredOn(new Date().toISOString().split("T")[0])
}
}

async function handleSubmit(e: React.FormEvent) {
e.preventDefault()

if (!name.trim()) {
toast.error("Please enterDiseaseName")
return
}

if (!petId) {
toast.error("Please selectPet")
return
}

setLoading(true)

try {
const response = await fetch("/api/diseases", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
pet_id: petId,
name: name.trim(),
severity,
status,
diagnosed_on: diagnosedOn,
recovered_on: status === "resolved"? (recoveredOn || null): null,
symptoms: symptoms.trim() || null,
notes: notes.trim() || null,
}),
})

if (!response.ok) throw new Error("Creation failed")

toast.success("Recordcreated successfully")
router.push("/dashboard/health/diseases")
} catch (error) {
toast.error("Creation failed,please try again")
} finally {
setLoading(false)
}
}

return (<div className="space-y-6">
{/* Header */}
<div className="flex items-center gap-4">
<Link href="/dashboard/health/diseases" className="flex items-center gap-1 text-[14px] text-[#6B6B6B] hover:text-[#111111]">
<EmojiIcon name="ArrowLeft" className="size-4" />
return
</Link>
<h1 className="text-[28px] font-semibold text-[#111111]">AddDiseaseRecord</h1>
</div>

{/* Form */}
<form onSubmit={handleSubmit} className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
<div className="space-y-5">
{/* Disease Name */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">DiseaseName</label>
<input
type="text"
value={name}
onChange={(e) => setName(e.target.value)}
placeholder="e.g.:cold,gastritis,skin disease"
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Severity */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Severity</label>
<div className="flex flex-wrap gap-2">
{severityOptions.map((opt) => (<button
key={opt.value}
type="button"
onClick={() => setSeverity(opt.value)}
className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
severity === opt.value? "text-white": "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
}`}
style={severity === opt.value? { backgroundColor: opt.color }: undefined}
>
{opt.label}
</button>))}
</div>
</div>

{/* Status */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Current Status</label>
<div className="flex flex-wrap gap-2">
{statusOptions.map((opt) => (<button
key={opt.value}
type="button"
onClick={() => handleStatusChange(opt.value)}
className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
status === opt.value? "bg-[#FF7A59] text-white": "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
}`}
>
{opt.label}
</button>))}
</div>
</div>

{/* Diagnosed Date */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Diagnosis Date</label>
<input
type="date"
value={diagnosedOn}
onChange={(e) => setDiagnosedOn(e.target.value)}
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Recovered Date — only when status is resolved */}
{status === "resolved" && (<div>
<label className="block text-[14px] font-medium text-[#34c759] mb-2">Recovery Date</label>
<input
type="date"
value={recoveredOn}
onChange={(e) => setRecoveredOn(e.target.value)}
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
/>
</div>)}

{/* Symptoms */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">SymptomDescription</label>
<input
type="text"
value={symptoms}
onChange={(e) => setSymptoms(e.target.value)}
placeholder="e.g.:Loss of appetite,lethargy,vomiting & diarrhea"
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Notes */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Notes</label>
<textarea
value={notes}
onChange={(e) => setNotes(e.target.value)}
placeholder="records symptoms,treatment plan etc...."
rows={3}
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none resize-none"
/>
</div>
</div>

{/* Submit */}
<div className="mt-6 flex gap-3">
<Link
href="/dashboard/health/diseases"
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
