import { EmojiIcon } from "@/components/ui/emoji-icon"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/query"
import { getPetEvents, getEventTimeline } from "@/lib/supabase/queries/event-queries"
import { PetEventsList } from "@/components/dashboard/pet-events-list"
import { EventTimeline } from "@/components/dashboard/event-timeline"
import { getTranslations } from "next-intl/server"

export default async function PetEventsPage() {
const { data: { user } } = await getUser()
if (!user) redirect("/login")

const t = await getTranslations("Health")

const supabase = await createClient()

// 获取User 第aonly Pet
const { data: pets } = await supabase.from("pets").select("id, name").eq("profile_id", user.id).eq("is_active", true).order("created_at").limit(1)

const petId = pets?.[0]?.id

// 获取PetEvents
const [events, timeline] = await Promise.all([
petId? getPetEvents(petId, 50): Promise.resolve([]),
petId? getEventTimeline(petId, 30): Promise.resolve({}),
])

// 按TypeStatistics
const eventTypeCounts = events.reduce((acc, event) => {
acc[event.event_type] = (acc[event.event_type] || 0) + 1
return acc
}, {} as Record<string, number>)

return (<div className="space-y-6">
{/* Header */}
<div className="flex items-center justify-between">
<div>
<h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
{t("petEventsTitle")}
</h1>
<p className="mt-2 text-[14px] text-[#6B6B6B]">{t("petEventsSubtitle")}</p>
</div>
<a
href={`/dashboard/health/events/new?pet=${petId}`}
className="flex items-center gap-2 rounded-full bg-[#FF7A59] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#FF6A49]"
>
<EmojiIcon name="Plus" className="size-4" />
{t("recordEvent")}
</a>
</div>

{/* Event Type Stats */}
<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<span className="text-lg">🏥</span>
<span className="text-[12px] text-[#6B6B6B]">{t("eventSymptom")}</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.symptom || 0}</span>
</div>
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<span className="text-lg">💊</span>
<span className="text-[12px] text-[#6B6B6B]">{t("eventMedication")}</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.medication || 0}</span>
</div>
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<span className="text-lg">👨‍⚕️</span>
<span className="text-[12px] text-[#6B6B6B]">{t("eventVetVisit")}</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.vet_visit || 0}</span>
</div>
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<span className="text-lg">💉</span>
<span className="text-[12px] text-[#6B6B6B]">{t("eventVaccine")}</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.vaccination || 0}</span>
</div>
</div>

{/* Event Timeline */}
{Object.keys(timeline).length > 0 && (<section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
<div className="flex items-center gap-2 mb-4">
<EmojiIcon name="Clock" className="size-5 text-[#FF7A59]" />
<span className="text-[15px] font-semibold text-[#111111]">{t("eventTimeline")}</span>
</div>
<EventTimeline timeline={timeline} />
</section>)}

{/* All Events */}
<section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
<div className="flex items-center gap-2 mb-4">
<EmojiIcon name="Calendar" className="size-5 text-[#FF7A59]" />
<span className="text-[15px] font-semibold text-[#111111]">{t("allEvents")}</span>
</div>

{events && events.length > 0? (<PetEventsList events={events} />): (<div className="py-12 text-center">
<EmojiIcon name="Activity" className="mx-auto mb-3 size-12 text-[#e0e0e0]" />
<p className="text-[14px] text-[#6B6B6B]">{t("noEventsRecord")}</p>
<p className="mt-1 text-[12px] text-[#999]">{t("addFirstEvent")}</p>
</div>)}
</section>
</div>)
}
