"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

const taskCategories = [
{ value: "feeding", label: "Feeding" },
{ value: "grooming", label: "Grooming" },
{ value: "health", label: "Health" },
{ value: "exercise", label: "Exercise" },
{ value: "training", label: "Training" },
{ value: "other", label: "Other" },
]

const taskIcons = ["🍖", "💊", "🛁", "🏃", "🎓", "🧹", "💤", "📍"]

export default function NewDailyTaskPage() {
const router = useRouter()
const searchParams = useSearchParams()
const petId = searchParams.get("pet")

const [loading, setLoading] = useState(false)
const [title, setTitle] = useState("")
const [category, setCategory] = useState("feeding")
const [icon, setIcon] = useState("🍖")
const [frequency, setFrequency] = useState("daily")
const [reminderEnabled, setReminderEnabled] = useState(false)
const [reminderTime, setReminderTime] = useState("09:00")

async function handleSubmit(e: React.FormEvent) {
e.preventDefault()

if (!title.trim()) {
toast.error("Please enter a task name")
return
}

if (!petId) {
toast.error("Please select a pet")
return
}

setLoading(true)

try {
const response = await fetch("/api/daily-tasks", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
pet_id: petId,
title: title.trim(),
category,
icon,
frequency,
reminder_enabled: reminderEnabled,
reminder_time: reminderEnabled? reminderTime: null,
is_active: true,
is_builtin: false,
sort_order: 0,
weight: 1,
}),
})

if (!response.ok) throw new Error("Creation failed")

toast.success("Task created successfully")
router.push("/dashboard/daily-tasks")
} catch (error) {
toast.error("Creation failed, please try again")
} finally {
setLoading(false)
}
}

return (<div className="space-y-6">
{/* Header */}
<div className="flex items-center gap-4">
<Link href="/dashboard/daily-tasks" className="flex items-center gap-1 text-[14px] text-[#6B6B6B] hover:text-[#111111]">
<EmojiIcon name="ArrowLeft" className="size-4" />
return
</Link>
<h1 className="text-[28px] font-semibold text-[#111111]">Create New Task</h1>
</div>

{/* Form */}
<form onSubmit={handleSubmit} className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
<div className="space-y-5">
{/* Task Name */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Task Name</label>
<input
type="text"
value={title}
onChange={(e) => setTitle(e.target.value)}
placeholder="e.g., Feeding, Walk, Medication"
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Category */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Category</label>
<div className="flex flex-wrap gap-2">
{taskCategories.map((cat) => (<button
key={cat.value}
type="button"
onClick={() => setCategory(cat.value)}
className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
category === cat.value? "bg-[#FF7A59] text-white": "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
}`}
>
{cat.label}
</button>))}
</div>
</div>

{/* Icon */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Icon</label>
<div className="flex flex-wrap gap-2">
{taskIcons.map((emoji) => (<button
key={emoji}
type="button"
onClick={() => setIcon(emoji)}
className={`size-12 rounded-[12px] text-xl flex items-center justify-center transition-colors ${
icon === emoji? "bg-[#FF7A59]/10 ring-2 ring-[#FF7A59]": "bg-[#F7F6F3] hover:bg-[#F0EFED]"
}`}
>
{emoji}
</button>))}
</div>
</div>

{/* Frequency */}
<div>
<label className="block text-[14px] font-medium text-[#111111] mb-2">Frequency</label>
<select
value={frequency}
onChange={(e) => setFrequency(e.target.value)}
className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
>
<option value="daily">Daily</option>
<option value="weekly">Weekly</option>
<option value="custom">Custom</option>
</select>
</div>

{/* Reminder */}
<div>
<div className="flex items-center justify-between mb-2">
<label className="text-[14px] font-medium text-[#111111]">Reminder</label>
<button
type="button"
onClick={() => setReminderEnabled(!reminderEnabled)}
className={`relative h-7 w-12 rounded-full transition-colors ${
reminderEnabled? "bg-[#FF7A59]": "bg-[#E8E8E8]"
}`}
>
<span
className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
reminderEnabled? "translate-x-5": "translate-x-0"
}`}
/>
</button>
</div>
{reminderEnabled && (<input
type="time"
value={reminderTime}
onChange={(e) => setReminderTime(e.target.value)}
className="rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
/>)}
</div>
</div>

{/* Submit */}
<div className="mt-6 flex gap-3">
<Link
href="/dashboard/daily-tasks"
className="flex-1 rounded-full border border-[rgba(0,0,0,0.1)] py-3 text-center text-[14px] text-[#6B6B6B] hover:bg-[#F7F6F3]"
>
Cancel
</Link>
<button
type="submit"
disabled={loading ||!title.trim()}
className="flex-1 rounded-full bg-[#FF7A59] py-3 text-[14px] font-medium text-white hover:bg-[#FF6A49] disabled:opacity-50"
>
{loading? <EmojiIcon name="Loader2" className="mx-auto size-5 animate-spin" />: "Create Task"}
</button>
</div>
</form>
</div>)
}
