"use client"

interface TimelineEvent {
id: string
event_type: string
event_time: string
notes: string | null
severity: number | null
product_id: string | null
}

interface Props {
timeline: Record<string, TimelineEvent[]>
}

const eventTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
symptom: { label: "Symptom", icon: "🏥", color: "#ff3b30" },
medication: { label: "Medication", icon: "💊", color: "#007AFF" },
vet_visit: { label: "Vet Visit", icon: "👨‍⚕️", color: "#34c759" },
vaccination: { label: "Vaccine", icon: "💉", color: "#585858" },
weight_change: { label: "Weight", icon: "⚖️", color: "#ff9500" },
diet_change: { label: "Diet", icon: "🍽️", color: "#AF52DE" },
behavior: { label: "Behavior", icon: "🐾", color: "#34c759" },
other: { label: "Other", icon: "📝", color: "#6B6B6B" },
}

export function EventTimeline({ timeline }: Props) {
const dates = Object.keys(timeline).sort((a, b) => b.localeCompare(a))

return (<div className="relative">
{/* Timeline line */}
<div className="absolute left-5 top-0 bottom-0 w-px bg-[#E8E8E8]" />

<div className="space-y-6">
{dates.map((date) => {
const events = timeline[date]
const dateObj = new Date(date)
const isToday = new Date().toISOString().split("T")[0] === date

return (<div key={date} className="relative pl-12">
{/* Date dot */}
<div className={`absolute left-3 top-1 size-4 rounded-full border-2 ${
isToday? "border-[#FF7A59] bg-[#FF7A59]": "border-[#D2D1CF] bg-white"
}`} />

{/* Date label */}
<div className="mb-2">
<p className={`text-[14px] font-medium ${isToday? "text-[#FF7A59]": "text-[#111111]"}`}>
{isToday? "Today": dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
</p>
<p className="text-[12px] text-[#6B6B6B]">
{events.length} Events
</p>
</div>

{/* Events */}
<div className="space-y-2">
{events.map((event) => {
const config = eventTypeConfig[event.event_type] || eventTypeConfig.other
const time = new Date(event.event_time)

return (<div
key={event.id}
className="flex items-center gap-3 rounded-lg bg-[#F7F6F3] px-3 py-2"
>
<span className="text-lg">{config.icon}</span>
<div className="flex-1 min-w-0">
<p className="text-[13px] text-[#111111]">{config.label}</p>
{event.notes && (<p className="text-[11px] text-[#6B6B6B] truncate">{event.notes}</p>)}
</div>
<span className="text-[11px] text-[#999]">
{time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
</span>
</div>)
})}
</div>
</div>)
})}
</div>
</div>)
}
