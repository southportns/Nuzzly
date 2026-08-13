import { notFound } from "next/navigation"
import { formatPetAge, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { queryPet, queryDietLogs, queryWeightLogs, getUser, queryProfile } from "@/lib/supabase/query"
import Link from "next/link"
import Image from "next/image"
import { DietLogForm } from "@/components/pets/diet-log-form"
import { DietLogList } from "@/components/pets/diet-log-list"
import { WeightTracker } from "@/components/pets/weight-tracker"
import { HealthTimeline } from "@/components/pets/health-timeline"
import { VaccineDewormingTracker } from "@/components/pets/vaccine-deworming-tracker"
import { generatePetCode } from "@/components/resident-book/utils"
import { createClient } from "@/lib/supabase/server"
import { FluentEmoji, FLUENT_EMOJI as EMOJI } from "@/components/ui/fluent-emoji"
import { getTranslations, getLocale } from "next-intl/server"

const lifeStageLabels: Record<string, { labelKey: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
kitten: { labelKey: "kitten", variant: "default" },
young_adult: { labelKey: "youngAdult", variant: "secondary" },
adult: { labelKey: "adult", variant: "outline" },
senior: { labelKey: "senior", variant: "destructive" },
}

// ═══════════════════════════════════════════════════════════════
// Design System — Apple Frosted Glass Modules
// ═══════════════════════════════════════════════════════════════

/** Frosted glass card — the foundation of modular layout */
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
return (<div
className={cn("rounded-[24px] border border-white/60 bg-white/65 backdrop-blur-2xl",
"shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)]",
"ring-1 ring-black/[0.03]",
className,)}
>
{children}
</div>)
}

/** Section header with icon badge */
function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
return (<div className="mb-5 flex items-center gap-2.5">
<div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC] shadow-[0_1px_3px_rgba(255,122,89,0.15)]">
{icon}
</div>
<div>
<h2 className="text-[15px] font-semibold leading-tight text-[#1a1a1a]">{title}</h2>
{desc && <p className="mt-0.5 text-[11.5px] text-[#86867e]">{desc}</p>}
</div>
</div>)
}

/** Overview section — frosted glass module with grouped info rows */
function OverviewSection({
icon,
title,
desc,
children,
}: {
icon: React.ReactNode
title: string
desc?: string
children: React.ReactNode
}) {
return (<GlassCard className="p-6">
<SectionHeader icon={icon} title={title} desc={desc} />
<div className="divide-y divide-black/[0.04]">{children}</div>
</GlassCard>)
}

/** Info row — Apple Settings style */
function InfoRow({ label, value, notFilled }: { label: string; value: string | null | undefined; notFilled: string }) {
return (<div className="flex items-center justify-between py-2.5">
<span className="text-[13.5px] text-[#86867e]">{label}</span>
<span className="text-[14px] font-medium text-[#1a1a1a]">{value || notFilled}</span>
</div>)
}

// ── Label maps ──
const speciesLabels: Record<string, string> = { cat: "cat", dog: "dog", other: "other" }
const sourceLabels: Record<string, string> = { purchased: "purchased", wild_rescued: "wildRescued", home_raised: "homeRaised", stray_adopted: "strayAdopted", other: "other" }
const stomachLabels: Record<string, string> = { normal: "normal", sensitive: "sensitive", very_sensitive: "verySensitive" }
const indoorOutdoorLabels: Record<string, string> = { indoor: "indoorOnly", outdoor: "outdoorOnly", both: "indoorOutdoor" }
const activityLabels: Record<string, string> = { very_low: "veryLow", low: "low", medium: "medium", high: "high", very_high: "veryHigh" }

// ═══════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════

export default async function DashboardPetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
const { petId } = await params

const { data: { user } } = await getUser()
if (!user) notFound()

const t = await getTranslations("Health")
const tPet = await getTranslations("Pet")
const locale = await getLocale()
const dateLocale = locale === "zh" ? "zh-CN" : "en-US"

const supabase = await createClient()

const [
{ data: pet },
{ data: dietLogs },
{ data: weightLogs },
profile,
{ data: envProfile },
{ data: vaccineRecords },
{ data: medRecords },
{ data: healthReminders },
{ data: petEvents },
] = await Promise.all([
queryPet(petId),
queryDietLogs(petId),
queryWeightLogs(petId),
queryProfile(user.id),
supabase.from("environment_profiles").select("*").eq("pet_id", petId).single(),
supabase.from("health_records").select("*").eq("pet_id", petId).eq("record_type", "vaccination").order("record_time", { ascending: false }).limit(50),
supabase.from("health_records").select("*").eq("pet_id", petId).eq("record_type", "medication").order("record_time", { ascending: false }).limit(50),
supabase.from("health_reminders").select("*").eq("pet_id", petId).in("reminder_type", ["vaccination", "medication"]).eq("is_completed", false).order("due_date", { ascending: true }),
supabase.from("pet_events").select("*").eq("pet_id", petId).order("event_time", { ascending: false }).limit(50),
])

if (!pet) notFound()

const lifeStage = (pet as { life_stage?: string }).life_stage
const lifeStageInfo = lifeStage? lifeStageLabels[lifeStage]: null
const petCode = generatePetCode(pet.species, pet.breed, (profile as { user_number?: number } | null)?.user_number, 0)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const petAny = pet as any

const locationParts = [envProfile?.region, envProfile?.city, envProfile?.district].filter(Boolean)
const locationStr = locationParts.length > 0? locationParts.join(" · "): null

const birthDateStr = petAny.birth_date as string | null
const birthDays = birthDateStr? Math.floor((Date.now() - new Date(birthDateStr).getTime()) / (1000 * 60 * 60 * 24)): null

const homeDateStr = petAny.home_date as string | null
const homeDays = homeDateStr? Math.floor((Date.now() - new Date(homeDateStr).getTime()) / (1000 * 60 * 60 * 24)): null

// ── Vaccine / Deworming summary for overview ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const latestVaccine = (vaccineRecords as any[])?.[0]?? null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const latestMed = (medRecords as any[])?.[0]?? null
const nextVaccineReminder = (healthReminders as any[])?.find((r) => r.reminder_type === "vaccination")?? null
const nextMedReminder = (healthReminders as any[])?.find((r) => r.reminder_type === "medication")?? null

const fmtDate = (d: string | null | undefined) =>
d? new Date(d).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" }): null
const fmtDue = (d: string | null | undefined) => {
if (!d) return null
const date = new Date(d + "T00:00:00")
const now = new Date(new Date().toDateString())
const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
if (diff < 0) return t("expiredDaysAgo", { days: Math.abs(diff) })
if (diff === 0) return t("dueToday")
if (diff <= 7) return t("dueInDays", { days: diff })
return fmtDate(d)
}

return (<div className="space-y-5">
{/* Breadcrumb */}
<div className="flex items-center gap-1.5 text-[12px] text-[#86867e]">
<Link href="/dashboard/pets" className="transition-colors hover:text-[#1a1a1a]">{t("myPetsBreadcrumb")}</Link>
<span className="text-[#c5c5c2]">/</span>
<span className="font-medium text-[#1a1a1a]">{pet.name}</span>
</div>

{/* ── Pet Header — Frosted Glass Hero ── */}
<GlassCard className="relative overflow-hidden p-6">
<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FFF6F0] via-transparent to-[#F0F4FF]/40" />

<div className="relative flex items-center gap-5">
{/* Avatar */}
<div className="relative flex size-20 shrink-0 overflow-hidden rounded-[22px] bg-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
{pet.photo_url? (<Image src={pet.photo_url} alt={pet.name} fill className="object-cover" sizes="80px" />): (<div className="flex size-full items-center justify-center">
<FluentEmoji
src={pet.species === "cat"? EMOJI.catFace: pet.species === "dog"? EMOJI.dogFace: EMOJI.pawPrints}
alt={pet.species === "cat"? "cat face": pet.species === "dog"? "dog face": "paw prints"}
size={36}
/>
</div>)}
</div>

{/* Info */}
<div className="min-w-0 flex-1">
<h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-[#1a1a1a]">{pet.name}</h1>
<p className="mt-1 text-[13.5px] text-[#86867e]">
{pet.breed?? t("unknownBreed")} · {formatPetAge(pet, locale)}
</p>
<div className="mt-3 flex flex-wrap gap-1.5">
<Badge className="rounded-full bg-black/[0.05] text-[11.5px] font-medium text-[#555] hover:bg-black/[0.08]">
{pet.gender === "male"? tPet("male"): pet.gender === "female"? tPet("female"): tPet("unknown")}
</Badge>
{pet.weight_kg && (<Badge variant="secondary" className="rounded-full text-[11.5px]">{Number(pet.weight_kg).toFixed(2)}kg</Badge>)}
{pet.neutered && (<Badge variant="secondary" className="rounded-full text-[11.5px]">{t("neuteredYes")}</Badge>)}
<Badge
variant={pet.stomach_health === "sensitive"? "destructive": "secondary"}
className="rounded-full text-[11.5px]"
>
{pet.stomach_health === "normal"? t("normalStomach"): pet.stomach_health === "sensitive"? t("sensitiveStomach"): t("verySensitiveStomach")}
</Badge>
{lifeStageInfo && (<Badge variant={lifeStageInfo.variant} className="rounded-full text-[11.5px]">{tPet(lifeStageInfo.labelKey as any)}</Badge>)}
<Badge variant="outline" className="gap-1 rounded-full font-mono text-[10.5px]">
<FluentEmoji src={EMOJI.idCard} alt="identification card" size={11} />
{petCode}
</Badge>
</div>
</div>

{/* Edit button */}
<Button
asChild
variant="outline"
size="sm"
className="shrink-0 rounded-full border-black/[0.06] bg-white/70 backdrop-blur-md px-4 py-2 text-[13px] font-medium text-[#555] shadow-sm transition-all hover:bg-white hover:shadow-md"
>
<Link href={`/dashboard/pets/${pet.id}/edit`}>
<FluentEmoji src={EMOJI.pencil} alt="pencil" size={13} className="mr-1.5" />
{t("editProfile")}
</Link>
</Button>
</div>
</GlassCard>

{/* ── Tabs — iOS Segmented Control + Content ── */}
<Tabs defaultValue="overview">
<div className="sticky top-16 z-10 mb-5">
<div className="rounded-[16px] border border-white/60 bg-white/55 p-1.5 backdrop-blur-2xl shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
<div className="overflow-hidden">
<TabsList className="flex w-full justify-start gap-0.5 bg-transparent p-0 shadow-none">
{[
{ value: "overview", label: t("tabOverview"), emoji: EMOJI.redHeart, alt: "red heart" },
{ value: "timeline", label: t("tabTimeline"), emoji: EMOJI.alarmClock, alt: "alarm clock" },
{ value: "diet", label: t("tabDiet"), emoji: EMOJI.forkKnife, alt: "fork and knife with plate" },
{ value: "vaccine", label: t("tabVaccine"), emoji: EMOJI.syringe, alt: "syringe" },
{ value: "weight", label: t("tabWeight"), emoji: EMOJI.chartUp, alt: "chart increasing" },
].map((tab) => (<TabsTrigger
key={tab.value}
value={tab.value}
className={cn("flex items-center gap-1.5 rounded-[11px] px-3.5 py-2 text-[13px] font-medium transition-all duration-200",
"data-[state=active]:bg-white data-[state=active]:text-[#1a1a1a] data-[state=active]:shadow-[0_1px_6px_rgba(0,0,0,0.06)]",
"data-[state=inactive]:text-[#86867e] data-[state=inactive]:hover:text-[#555]",)}
>
<FluentEmoji src={tab.emoji} alt={tab.alt} size={13} />
{tab.label}
</TabsTrigger>))}
</TabsList>
</div>
</div>
</div>

{/* ── Overview Tab ── */}
<TabsContent value="overview" className="space-y-4">
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
{/* Basic Info */}
<OverviewSection
title={t("basicInfo")}
desc={t("basicInfoDesc")}
icon={<FluentEmoji src={EMOJI.pawPrints} alt="paw prints" size={16} />}
>
<InfoRow label={tPet("name")} value={pet.name} notFilled={t("notFilled")} />
<InfoRow label={tPet("species")} value={speciesLabels[pet.species?? ""]? tPet(speciesLabels[pet.species?? ""] as any): pet.species} notFilled={t("notFilled")} />
<InfoRow label={tPet("breed")} value={pet.breed} notFilled={t("notFilled")} />
<InfoRow label={tPet("gender")} value={pet.gender === "male"? tPet("male"): pet.gender === "female"? tPet("female"): tPet("unknown")} notFilled={t("notFilled")} />
<InfoRow label={tPet("neutered")} value={pet.neutered == null? null: pet.neutered? t("neuteredYes"): t("neuteredNo")} notFilled={t("notFilled")} />
</OverviewSection>

{/* Age & Source */}
<OverviewSection
title={t("ageAndSource")}
desc={t("ageAndSourceDesc")}
icon={<FluentEmoji src={EMOJI.calendar} alt="calendar" size={16} />}
>
<InfoRow label={tPet("birthDate")} value={birthDateStr} notFilled={t("notFilled")} />
{birthDays != null && <InfoRow label={t("daysSinceBirth")} value={tPet("daysCount", { days: birthDays })} notFilled={t("notFilled")} />}
<InfoRow label={tPet("homeDate")} value={homeDateStr} notFilled={t("notFilled")} />
{homeDays != null && <InfoRow label={t("daysAtHome")} value={tPet("daysCount", { days: homeDays })} notFilled={t("notFilled")} />}
<InfoRow label={t("source")} value={sourceLabels[petAny.pet_source?? ""]? t(sourceLabels[petAny.pet_source?? ""] as any): petAny.pet_source} notFilled={t("notFilled")} />
</OverviewSection>

{/* Vaccine & Deworming */}
<OverviewSection
title={t("vaccineAndDeworming")}
desc={t("vaccineAndDewormingDesc")}
icon={<FluentEmoji src={EMOJI.syringe} alt="syringe" size={16} />}
>
{/* Vaccine group */}
<div className="py-3">
<div className="mb-2 flex items-center gap-1.5">
<FluentEmoji src={EMOJI.syringe} alt="syringe" size={14} />
<span className="text-[12px] font-semibold text-[#1a1a1a]">{t("vaccine")}</span>
</div>
<div className="flex items-center justify-between rounded-[10px] bg-[#F8F8F6] px-3 py-2">
<span className="text-[12.5px] text-[#86867e]">{t("latestVaccine")}</span>
<span className="text-[13px] font-medium text-[#1a1a1a]">
{latestVaccine? fmtDate(latestVaccine.record_time): t("noRecordsShort")}
</span>
</div>
<div className="mt-1.5 flex items-center justify-between rounded-[10px] bg-[#FFF4EE] px-3 py-2">
<span className="text-[12.5px] text-[#86867e]">{t("nextVaccine")}</span>
<span className="text-[13px] font-medium text-[#E85D4A]">
{nextVaccineReminder? fmtDue(nextVaccineReminder.due_date): t("noReminder")}
</span>
</div>
</div>

{/* Deworming group */}
<div className="py-3">
<div className="mb-2 flex items-center gap-1.5">
<FluentEmoji src={EMOJI.pawPrints} alt="paw prints" size={14} />
<span className="text-[12px] font-semibold text-[#1a1a1a]">{t("deworming")}</span>
</div>
<div className="flex items-center justify-between rounded-[10px] bg-[#F8F8F6] px-3 py-2">
<span className="text-[12.5px] text-[#86867e]">{t("latestDeworming")}</span>
<span className="text-[13px] font-medium text-[#1a1a1a]">
{latestMed? fmtDate(latestMed.record_time): t("noRecordsShort")}
</span>
</div>
<div className="mt-1.5 flex items-center justify-between rounded-[10px] bg-[#FFF4EE] px-3 py-2">
<span className="text-[12.5px] text-[#86867e]">{t("nextDeworming")}</span>
<span className="text-[13px] font-medium text-[#E85D4A]">
{nextMedReminder? fmtDue(nextMedReminder.due_date): t("noReminder")}
</span>
</div>
</div>
</OverviewSection>

{/* Living Environment */}
<OverviewSection
title={t("livingEnvironment")}
desc={t("livingEnvironmentDesc")}
icon={<FluentEmoji src={EMOJI.house} alt="house" size={16} />}
>
<InfoRow label={tPet("region")} value={locationStr} notFilled={t("notFilled")} />
<InfoRow label={t("multiPetHousehold")} value={envProfile?.multi_pet_household ? t("yesLabel") : t("noLabel")} notFilled={t("notFilled")} />
{envProfile?.multi_pet_household && (<InfoRow label={t("petCount")} value={envProfile?.pet_count? String(envProfile.pet_count): null} notFilled={t("notFilled")} />)}
<InfoRow label={t("hasChildren")} value={envProfile?.has_children ? t("yesLabel") : t("noLabel")} notFilled={t("notFilled")} />
<InfoRow label={tPet("indoorOutdoorLabel")} value={indoorOutdoorLabels[envProfile?.indoor_outdoor?? ""]? t(indoorOutdoorLabels[envProfile?.indoor_outdoor?? ""] as any): envProfile?.indoor_outdoor} notFilled={t("notFilled")} />
<InfoRow label={t("activityLevel")} value={activityLabels[envProfile?.activity_level?? ""]? t(activityLabels[envProfile?.activity_level?? ""] as any): envProfile?.activity_level} notFilled={t("notFilled")} />
</OverviewSection>
</div>
</TabsContent>

{/* ── Health Timeline Tab ── */}
<TabsContent value="timeline">
<HealthTimeline petId={petId} initialEvents={(petEvents?? []) as any[]} />
</TabsContent>

{/* ── Vaccine / Deworming Tab ── */}
<TabsContent value="vaccine">
<VaccineDewormingTracker
petId={petId}
species={(pet as { species?: string }).species as "cat" | "dog" | "other" | undefined}
initialRecords={[...(vaccineRecords?? []),...(medRecords?? [])] as any}
initialReminders={(healthReminders?? []) as any}
/>
</TabsContent>

{/* ── Diet Log Tab ── */}
<TabsContent value="diet" className="space-y-4">
<GlassCard className="p-6">
<SectionHeader
title={t("addDietRecord")}
desc={t("addDietRecordDesc")}
icon={<FluentEmoji src={EMOJI.forkKnife} alt="fork and knife with plate" size={16} />}
/>
<DietLogForm petId={petId} />
</GlassCard>

{dietLogs && dietLogs.length > 0 && (<GlassCard className="p-6">
<SectionHeader
title={t("historyRecords")}
desc={t("historyRecordsDesc")}
icon={<FluentEmoji src={EMOJI.calendar} alt="calendar" size={16} />}
/>
<DietLogList initialLogs={dietLogs} />
</GlassCard>)}
</TabsContent>

{/* ── Weight Tracker Tab ── */}
<TabsContent value="weight">
<GlassCard className="p-3">
<WeightTracker
petId={petId}
currentWeight={pet.weight_kg? Number(pet.weight_kg): null}
weightLogs={(weightLogs?? []).map((log) => ({
id: log.id,
weight_kg: Number(log.weight_kg),
logged_date: log.logged_date,
}))}
/>
</GlassCard>
</TabsContent>
</Tabs>
</div>)
}
