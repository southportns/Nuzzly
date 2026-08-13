"use client";

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
ResponsiveContainer,
XAxis,
YAxis,
CartesianGrid,
Tooltip,
Line,
LineChart,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import type { ResidentHealth, ResidentMedicationItem, PetSelectorItem, ResidentDiseaseItem, ResidentVaccinationItem } from "./types";
import CssFrame from "./css-frame";

interface PageHealthProps {
health: ResidentHealth;
pets?: PetSelectorItem[];
selectedPetId?: string;
onPetSelect?: (petId: string) => void;
}

type IconType = ComponentType<{ className?: string }>;

interface WeightLog {
date: string;
weight: number;
}

export default function PageHealth({ health, pets = [], selectedPetId, onPetSelect }: PageHealthProps) {
const currentPetId = selectedPetId?? pets[0]?.id
const [dynamicWeightLogs, setDynamicWeightLogs] = useState<WeightLog[]>([])
const [dynamicWeightKg, setDynamicWeightKg] = useState<number | null>(null)
const [dynamicDiseases, setDynamicDiseases] = useState<ResidentDiseaseItem[]>([])

// when Select PetChange时,直接from Data库查询Latest Weight and DiseaseData
useEffect(() => {
if (!currentPetId) return

const fetchData = async () => {
const supabase = createClient()

// WeightData
const { data: weightData } = await supabase.from("health_records").select("weight_kg, record_time").eq("pet_id", currentPetId).eq("record_type", "weight").not("weight_kg", "is", null).order("record_time", { ascending: true })

if (weightData) {
const logs = weightData.map(d => ({
date: d.record_time?.split("T")[0] || new Date().toISOString().split("T")[0],
weight: d.weight_kg?? 0,
}))
setDynamicWeightLogs(logs)
setDynamicWeightKg(logs.length > 0? logs[logs.length - 1].weight: null)
}

// DiseaseRecord
const { data: diseaseData } = await supabase.from("pet_disease_records").select("*").eq("pet_id", currentPetId).order("diagnosed_on", { ascending: false })

if (diseaseData) {
setDynamicDiseases(diseaseData.map(d => ({
id: d.id,
name: d.name,
diagnosedOn: d.diagnosed_on?? "",
recoveredOn: d.recovered_on?? undefined,
status: d.status,
symptoms: d.symptoms?? undefined,
notes: d.notes?? undefined,
})))
} else {
setDynamicDiseases([])
}
}

fetchData()
}, [currentPetId])

// usedActivity查询 Data,if果no used预构建 Data
const currentWeightLogs = dynamicWeightLogs.length > 0? dynamicWeightLogs: (currentPetId && health.allPetsWeightLogs?.[currentPetId]) || []
const currentWeightKg = dynamicWeightKg!== null? dynamicWeightKg: (currentWeightLogs.length > 0? currentWeightLogs[currentWeightLogs.length - 1].weight: health.weightKg)
const currentDiseases = dynamicDiseases.length > 0? dynamicDiseases: (currentPetId && health.allPetsDiseases?.[currentPetId]) || []
const currentVaccinations = (currentPetId && health.allPetsVaccinations?.[currentPetId]) || []

return (<CssFrame>
<div className="w-full h-full px-[6%] py-[5%] flex flex-col relative overflow-hidden" style={{ background: "#FFF7ED" }}>

{/* Header with Pet Selector */}
<div className="flex items-center gap-3 mb-4 pb-3 shrink-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
<div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
<EmojiIcon name="Heart" className="text-rose-400 w-5 h-5 fill-rose-100" />
</div>
<h2 className="text-xl font-bold text-[#111111] shrink-0">HealthProfile</h2>

{/* Pet Selector Capsule Buttons */}
{pets.length > 0 && (<div className="flex gap-2 overflow-x-auto ml-2 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
{pets.map((pet) => (<button
key={pet.id}
onClick={(e) => {
e.stopPropagation();
onPetSelect?.(pet.id);
}}
className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all shrink-0 ${
selectedPetId === pet.id? "bg-gradient-to-r from-[#FF7A59] to-[#FF9A6C] shadow-md": "bg-[#FFF5EE] border border-[#FFD4BC] hover:bg-[#FFE8DA]"
}`}
>
<Avatar size="sm" className="w-7 h-7">
<AvatarImage src={pet.avatarUrl?? undefined} alt={pet.name} />
<AvatarFallback className="bg-[#FFE8DA] text-[#8B5E46] text-xs font-bold">
{pet.name.charAt(0)}
</AvatarFallback>
</Avatar>
<span className={`text-xs font-bold whitespace-nowrap ${
selectedPetId === pet.id? "text-white": "text-[#8B5E46]"
}`}>
{pet.name}
</span>
</button>))}
</div>)}
</div>

{/* Content Grid */}
<div className="flex-1 min-h-0 overflow-hidden">
<div className="flex gap-4 h-full">
{/* Left Column - Weight Chart + Vaccination */}
<div className="w-1/2 flex flex-col gap-4">
{/* Weight Trend Chart */}
<div
className="bg-white p-4 rounded-2xl shadow-sm flex-1"
style={{ border: "1px solid rgba(0,0,0,0.06)" }}
>
<div className="flex items-center justify-between mb-3">
<h3 className="text-sm font-bold text-[#111111] flex items-center gap-2">
<EmojiIcon name="TrendingUp" className="w-4 h-4 text-[#FF7A59]" />
WeightTrends
</h3>
<div className="flex items-baseline gap-1">
<span className="text-xl font-bold text-[#111111]">{currentWeightKg?? "-"}</span>
<span className="text-xs font-medium text-[#6B6B6B]">kg</span>
</div>
</div>
<div className="h-32">
{currentWeightLogs && currentWeightLogs.length > 1? (<ResponsiveContainer width="100%" height="100%">
<LineChart data={currentWeightLogs}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
<XAxis
dataKey="date"
tick={{ fontSize: 9 }}
stroke="rgba(0,0,0,0.3)"
tickFormatter={(value) => {
const date = new Date(value);
return `${date.getMonth() + 1}/${date.getDate()}`;
}}
/>
<YAxis
tick={{ fontSize: 9 }}
stroke="rgba(0,0,0,0.3)"
domain={["dataMin - 0.5", "dataMax + 0.5"]}
width={35}
/>
<Tooltip
content={({ active, payload, label }) => {
if (!active ||!payload?.length) return null;
return (<div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
<p className="text-xs font-medium mb-1">{label}</p>
<p className="text-sm font-bold text-rose-500">{payload[0].value} kg</p>
</div>);
}}
/>
<Line
type="monotone"
dataKey="weight"
stroke="#FF7A59"
strokeWidth={2}
dot={{ fill: "#FF7A59", strokeWidth: 2, r: 3 }}
activeDot={{ r: 5 }}
/>
</LineChart>
</ResponsiveContainer>): (<div className="h-full flex items-center justify-center text-[#6B6B6B]">
<div className="text-center">
<EmojiIcon name="Weight" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
<p className="text-xs">NoWeightTrendsData</p>
</div>
</div>)}
</div>
</div>

{/* Vaccination Records */}
<div
className="bg-white p-4 rounded-2xl shadow-sm"
style={{ border: "1px solid rgba(0,0,0,0.06)" }}
>
<div className="flex items-center justify-between mb-3">
<h3 className="text-sm font-bold text-[#111111] flex items-center gap-2">
<EmojiIcon name="Syringe" className="w-4 h-4 text-[#22C55E]" />
VaccineRecord
</h3>
<EmojiIcon name="ChevronRight" className="w-4 h-4 text-[#6B6B6B]" />
</div>
<div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
{currentVaccinations && currentVaccinations.length > 0? (currentVaccinations.map((vaccine) => (<VaccinationItem key={vaccine.id} item={vaccine} />))): (<p className="text-xs text-[#6B6B6B] text-center py-4">NoVaccineRecord</p>)}
</div>
</div>
</div>

{/* Right Column - Disease Records */}
<div
className="w-1/2 bg-white p-4 rounded-2xl shadow-sm flex flex-col"
style={{ border: "1px solid rgba(0,0,0,0.06)" }}
>
<div className="flex items-center justify-between mb-3">
<h3 className="text-sm font-bold text-[#111111] flex items-center gap-2">
<EmojiIcon name="Stethoscope" className="w-4 h-4 text-[#FF7A59]" />
DiseaseRecord
</h3>
<EmojiIcon name="ChevronRight" className="w-4 h-4 text-[#6B6B6B]" />
</div>
<div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
{currentDiseases && currentDiseases.length > 0? (currentDiseases.map((disease) => (<DiseaseItem key={disease.id} item={disease} />))): (<div className="h-full flex items-center justify-center text-[#6B6B6B]">
<div className="text-center">
<EmojiIcon name="Stethoscope" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
<p className="text-xs">NoDiseaseRecord</p>
</div>
</div>)}
</div>
</div>
</div>
</div>

{/* Bottom Bar - Allergy & Medication */}
<div className="mt-4 pt-3 shrink-0 flex gap-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
{/* Allergy Notes */}
{health.allergyNote && (<div className="flex items-center gap-2 flex-1 min-w-0">
<div className="w-6 h-6 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
<EmojiIcon name="AlertTriangle" className="w-3 h-3 text-[#F59E0B]" />
</div>
<div className="min-w-0">
<p className="text-[10px] font-bold text-[#6B6B6B]">Allergy</p>
<p className="text-[10px] text-[#111111] truncate">{health.allergyNote}</p>
</div>
</div>)}

{/* Medications */}
{health.medications.length > 0 && (<div className="flex items-center gap-2 flex-1 min-w-0">
<div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
<EmojiIcon name="Pill" className="w-3 h-3 text-[#3B82F6]" />
</div>
<div className="min-w-0">
<p className="text-[10px] font-bold text-[#6B6B6B]">Medication</p>
<p className="text-[10px] text-[#111111] truncate">
{health.medications.map(m => m.name).join(",")}
</p>
</div>
</div>)}
</div>
</div>
</CssFrame>);
}

function DiseaseItem({ item }: { item: ResidentDiseaseItem }) {
const statusColors: Record<string, string> = {
active: "bg-rose-50 text-rose-500",
under_treatment: "bg-blue-50 text-blue-500",
resolved: "bg-emerald-50 text-emerald-500",
recovered: "bg-emerald-50 text-emerald-500",
chronic: "bg-amber-50 text-amber-500",
};

const statusLabels: Record<string, string> = {
active: "Ongoing",
under_treatment: "Under Treatment",
resolved: "Recovered",
recovered: "Recovered",
chronic: "Chronic",
};

return (<div
className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50"
style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
>
<div className="flex-1 min-w-0">
<p className="text-sm font-bold text-[#111111] truncate">{item.name}</p>
<p className="text-[10px] text-[#6B6B6B] mt-0.5">
{new Date(item.diagnosedOn).toLocaleDateString("en-US", {
year: "numeric",
month: "short",
day: "numeric",
})}
{item.recoveredOn && (<span className="text-emerald-500 ml-1">
→ {new Date(item.recoveredOn).toLocaleDateString("en-US", {
month: "short",
day: "numeric",
})}
</span>)}
</p>
</div>
<span
className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
statusColors[item.status] || "bg-gray-50 text-gray-500"
}`}
>
{statusLabels[item.status] || item.status}
</span>
</div>);
}

function VaccinationItem({ item }: { item: ResidentVaccinationItem }) {
const isDueSoon = item.nextDueDate? new Date(item.nextDueDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000: false;

return (<div
className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50"
>
<div className="flex-1 min-w-0">
<p className="text-xs font-bold text-[#111111] truncate">{item.name}</p>
<p className="text-[10px] text-[#6B6B6B]">
{new Date(item.administeredOn).toLocaleDateString("en-US", {
year: "numeric",
month: "short",
day: "numeric",
})}
</p>
</div>
{item.nextDueDate && (<span
className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${
isDueSoon? "bg-amber-50 text-amber-500": "bg-emerald-50 text-emerald-500"
}`}
>
{isDueSoon? " willDue": "completed"}
</span>)}
</div>);
}
