"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { FluentEmoji, FLUENT_EMOJI as EMOJI } from "@/components/ui/fluent-emoji"
import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslations, useLocale } from "next-intl"

interface DiseaseRecord {
id: string
name: string
severity: string
status: string
diagnosed_on: string | null
recovered_on: string | null
symptoms: string | null
notes: string | null
}

interface Props {
records: DiseaseRecord[]
onUpdate?: () => void
}

export function DiseaseRecordsList({ records, onUpdate }: Props) {
const t = useTranslations("Disease")
const router = useRouter()
const locale = useLocale()
const dateLocale = locale === "zh" ? "zh-CN" : "en-US"
const [expandedId, setExpandedId] = useState<string | null>(null)

const severityConfig = useMemo<Record<string, { label: string; color: string; bg: string }>>(() => ({
mild: { label: t("severityMild"), color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
moderate: { label: t("severityModerate"), color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
severe: { label: t("severitySevere"), color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
critical: { label: t("severityCritical"), color: "text-[#ff2d55]", bg: "bg-[#ff2d55]/10" },
unknown: { label: t("severityUnknown"), color: "text-[#6B6B6B]", bg: "bg-[#6B6B6B]/10" },
}), [t])

const statusConfig = useMemo<Record<string, { label: string; color: string; dot: string }>>(() => ({
active: { label: t("statusActive"), color: "text-[#ff9500]", dot: "bg-[#ff9500]" },
under_treatment: { label: t("statusUnderTreatment"), color: "text-[#007AFF]", dot: "bg-[#007AFF]" },
chronic: { label: t("statusChronic"), color: "text-[#585858]", dot: "bg-[#585858]" },
resolved: { label: t("statusResolved"), color: "text-[#34c759]", dot: "bg-[#34c759]" },
recovered: { label: t("statusResolved"), color: "text-[#34c759]", dot: "bg-[#34c759]" },
}), [t])

const severityOptions = [
{ value: "mild", label: t("severityMild") },
{ value: "moderate", label: t("severityModerate") },
{ value: "severe", label: t("severitySevere") },
{ value: "critical", label: t("severityCritical") },
{ value: "unknown", label: t("severityUnknown") },
]

const statusOptions = [
{ value: "active", label: t("statusActive") },
{ value: "under_treatment", label: t("statusUnderTreatment") },
{ value: "chronic", label: t("statusChronic") },
{ value: "resolved", label: t("statusResolved") },
]

const toggleExpand = useCallback((id: string) => {
setExpandedId((prev) => (prev === id ? null : id))
}, [])

const handleUpdated = useCallback(() => {
setExpandedId(null)
router.refresh()
onUpdate?.()
}, [router, onUpdate])

return (<div className="space-y-2">
{records.map((record) => {
const severity = severityConfig[record.severity] || severityConfig.unknown
const status = statusConfig[record.status] || statusConfig.active
const isExpanded = expandedId === record.id
const isResolved = record.status === "resolved" || record.status === "recovered"

return (<div key={record.id} className="rounded-[12px] bg-[#F7F6F3] transition-colors">
<button
type="button"
onClick={() => toggleExpand(record.id)}
className="flex w-full items-center justify-between rounded-[12px] p-3 text-left transition-colors hover:bg-[#F0EFED]"
>
<div className="flex items-center gap-3">
<div className="flex size-10 items-center justify-center rounded-full">
<FluentEmoji src={EMOJI.orangeCircle} alt="orange circle" size={20} />
</div>
<div>
<p className="text-[14px] font-medium text-[#111111]">{record.name}</p>
<div className="mt-0.5 flex items-center gap-2">
<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${status.color} ${status.dot}/10`}>
<span className={`inline-block size-1.5 rounded-full ${status.dot}`} />
{status.label}
</span>
<span className={`rounded-full px-2 py-0.5 text-[10px] ${severity.color} ${severity.bg}`}>
{severity.label}
</span>
{record.symptoms && (<span className="max-w-[120px] truncate rounded-full bg-[#6B6B6B]/5 px-2 py-0.5 text-[10px] text-[#6B6B6B]">
{record.symptoms}
</span>)}
</div>
</div>
</div>

<div className="flex items-center gap-2">
<div className="flex flex-col items-end gap-0.5">
{record.diagnosed_on && (<span className="text-[11px] text-[#6B6B6B]">
{new Date(record.diagnosed_on).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
</span>)}
{isResolved && record.recovered_on && (<span className="text-[11px] text-[#34c759]">
{new Date(record.recovered_on).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
</span>)}
</div>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={cn("size-5 shrink-0 text-[#6B6B6B] transition-transform duration-300", isExpanded && "rotate-180 text-[#FF7A59]")} aria-hidden="true">
<g fill="none" stroke="currentColor" stroke-linejoin="miter" stroke-linecap="butt">
<path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22Z" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" />
<path d="M12 7L12 17L12 16.3076" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" />
<path d="M16.2427 12.7574L12 17.0001L7.75739 12.7574" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" />
</g>
</svg>
</div>
</button>

<AnimatePresence initial={false}>
{isExpanded && (<motion.div
key="edit-form"
initial={{ height: 0, opacity: 0 }}
animate={{ height: "auto", opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
className="overflow-hidden"
>
<DiseaseEditForm record={record} onDone={handleUpdated} />
</motion.div>)}
</AnimatePresence>
</div>)
})}
</div>)
}

function DiseaseEditForm({
record,
onDone,
}: {
record: DiseaseRecord
onDone: () => void
}) {
const t = useTranslations("Disease")
const [name, setName] = useState(record.name)
const [severity, setSeverity] = useState(record.severity)
const [status, setStatus] = useState(record.status === "recovered" ? "resolved" : record.status)
const [diagnosedOn, setDiagnosedOn] = useState(record.diagnosed_on ?? new Date().toISOString().split("T")[0])
const [recoveredOn, setRecoveredOn] = useState(record.recovered_on ?? "")
const [symptoms, setSymptoms] = useState(record.symptoms ?? "")
const [notes, setNotes] = useState(record.notes ?? "")
const [loading, setLoading] = useState(false)
const [deleting, setDeleting] = useState(false)

const isResolved = status === "resolved"

const severityOptions = [
{ value: "mild", label: t("severityMild") },
{ value: "moderate", label: t("severityModerate") },
{ value: "severe", label: t("severitySevere") },
{ value: "critical", label: t("severityCritical") },
{ value: "unknown", label: t("severityUnknown") },
]

const statusOptions = [
{ value: "active", label: t("statusActive") },
{ value: "under_treatment", label: t("statusUnderTreatment") },
{ value: "chronic", label: t("statusChronic") },
{ value: "resolved", label: t("statusResolved") },
]

function handleStatusChange(value: string) {
setStatus(value)
if (value === "resolved" && !recoveredOn) {
setRecoveredOn(new Date().toISOString().split("T")[0])
}
}

async function handleSave(e: React.FormEvent) {
e.preventDefault()
if (loading) return

if (!name.trim()) {
toast.error(t("enterDiseaseName"))
return
}

setLoading(true)
try {
const response = await fetch(`/api/diseases/${record.id}`, {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
name: name.trim(),
severity,
status,
diagnosed_on: diagnosedOn,
recovered_on: isResolved ? (recoveredOn || null) : null,
symptoms: symptoms.trim() || null,
notes: notes.trim() || null,
}),
})

if (!response.ok) {
const err = await response.json().catch(() => ({}))
throw new Error(err.error || t("saveFailed"))
}

toast.success(t("recordUpdated"))
onDone()
} catch (error) {
toast.error(error instanceof Error ? error.message : t("saveFailedRetry"))
} finally {
setLoading(false)
}
}

async function handleDelete() {
if (!confirm(t("deleteConfirm", { name: record.name }))) return

setDeleting(true)
try {
const response = await fetch(`/api/diseases/${record.id}`, { method: "DELETE" })
if (!response.ok) throw new Error(t("deleteFailed"))

toast.success(t("recordDeleted"))
onDone()
} catch {
toast.error(t("deleteFailedRetry"))
} finally {
setDeleting(false)
}
}

return (<form
onSubmit={handleSave}
className="border-t border-[rgba(0,0,0,0.06)] px-4 pb-4 pt-3"
>
<div className="space-y-4">
{/* Disease Name */}
<div>
<label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">{t("diseaseName")}</label>
<input
type="text"
value={name}
onChange={(e) => setName(e.target.value)}
placeholder={t("diseaseNamePlaceholder")}
className="w-full rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Severity */}
<div>
<label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">{t("severity")}</label>
<div className="flex flex-wrap gap-2">
{severityOptions.map((opt) => (<button
key={opt.value}
type="button"
onClick={() => setSeverity(opt.value)}
className={cn("rounded-full px-3 py-1.5 text-[12px] transition-colors",
severity === opt.value ? "bg-[#FF7A59] text-white" : "bg-white text-[#6B6B6B] hover:bg-[#F0EFED] border border-[rgba(0,0,0,0.06)]")}
>
{opt.label}
</button>))}
</div>
</div>

{/* Current Status */}
<div>
<label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">{t("currentStatus")}</label>
<div className="flex flex-wrap gap-2">
{statusOptions.map((opt) => (<button
key={opt.value}
type="button"
onClick={() => handleStatusChange(opt.value)}
className={cn("rounded-full px-3 py-1.5 text-[12px] transition-colors",
status === opt.value ? "bg-[#FF7A59] text-white" : "bg-white text-[#6B6B6B] hover:bg-[#F0EFED] border border-[rgba(0,0,0,0.06)]")}
>
{opt.label}
</button>))}
</div>
</div>

{/* Diagnosis Date */}
<div>
<label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">{t("diagnosisDate")}</label>
<input
type="date"
value={diagnosedOn}
onChange={(e) => setDiagnosedOn(e.target.value)}
className="w-full rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Recovery Date */}
{isResolved && (<div>
<label className="block text-[12px] font-medium text-[#34c759] mb-1.5">{t("recoveryDate")}</label>
<input
type="date"
value={recoveredOn}
onChange={(e) => setRecoveredOn(e.target.value)}
className="w-full rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
/>
</div>)}

{/* Symptoms */}
<div>
<label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">{t("symptomDescription")}</label>
<input
type="text"
value={symptoms}
onChange={(e) => setSymptoms(e.target.value)}
placeholder={t("symptomPlaceholder")}
className="w-full rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
/>
</div>

{/* Notes */}
<div>
<label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">{t("notes")}</label>
<textarea
value={notes}
onChange={(e) => setNotes(e.target.value)}
placeholder={t("notesPlaceholder")}
rows={2}
className="w-full rounded-[10px] border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none resize-none"
/>
</div>
</div>

{/* Actions */}
<div className="mt-4 flex items-center justify-between gap-3">
<button
type="button"
onClick={handleDelete}
disabled={deleting}
className="rounded-full px-4 py-2 text-[12px] text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/5 disabled:opacity-50"
>
{deleting ? (<EmojiIcon name="Loader2" className="size-4 animate-spin" />) : (t("deleteRecord"))}
</button>
<div className="flex gap-2">
<button
type="button"
onClick={onDone}
className="rounded-full border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] text-[#6B6B6B] hover:bg-[#F0EFED]"
>
{t("cancel")}
</button>
<button
type="submit"
disabled={loading || !name.trim()}
className="rounded-full bg-[#FF7A59] px-5 py-2 text-[12px] font-medium text-white hover:bg-[#FF6A49] disabled:opacity-50"
>
{loading ? (<EmojiIcon name="Loader2" className="size-4 animate-spin" />) : (t("saveChanges"))}
</button>
</div>
</div>
</form>)
}
