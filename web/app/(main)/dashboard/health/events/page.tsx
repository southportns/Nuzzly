import { redirect } from "next/navigation"
import { Calendar, Plus, Clock, Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/query"
import { getPetEvents, getEventTimeline } from "@/lib/supabase/queries/event-queries"
import { PetEventsList } from "@/components/dashboard/pet-events-list"
import { EventTimeline } from "@/components/dashboard/event-timeline"

export default async function PetEventsPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

  // 获取用户的第一只宠物
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)

  const petId = pets?.[0]?.id

  // 获取宠物事件
  const [events, timeline] = await Promise.all([
    petId ? getPetEvents(petId, 50) : Promise.resolve([]),
    petId ? getEventTimeline(petId, 30) : Promise.resolve({}),
  ])

  // 按类型统计
  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
            宠物事件
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">记录和追踪宠物的重要事件</p>
        </div>
        <a
          href={`/dashboard/health/events/new?pet=${petId}`}
          className="flex items-center gap-2 rounded-full bg-[#FF7A59] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#FF6A49]"
        >
          <Plus className="size-4" />
          记录事件
        </a>
      </div>

      {/* Event Type Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏥</span>
            <span className="text-[12px] text-[#6B6B6B]">症状</span>
          </div>
          <span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.symptom || 0}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💊</span>
            <span className="text-[12px] text-[#6B6B6B]">用药</span>
          </div>
          <span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.medication || 0}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">👨‍⚕️</span>
            <span className="text-[12px] text-[#6B6B6B]">就诊</span>
          </div>
          <span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.vet_visit || 0}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💉</span>
            <span className="text-[12px] text-[#6B6B6B]">疫苗</span>
          </div>
          <span className="text-[24px] font-semibold text-[#111111]">{eventTypeCounts.vaccination || 0}</span>
        </div>
      </div>

      {/* Event Timeline */}
      {Object.keys(timeline).length > 0 && (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-5 text-[#FF7A59]" />
            <span className="text-[15px] font-semibold text-[#111111]">事件时间线</span>
          </div>
          <EventTimeline timeline={timeline} />
        </section>
      )}

      {/* All Events */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="size-5 text-[#FF7A59]" />
          <span className="text-[15px] font-semibold text-[#111111]">全部事件</span>
        </div>
        
        {events && events.length > 0 ? (
          <PetEventsList events={events} />
        ) : (
          <div className="py-12 text-center">
            <Activity className="mx-auto mb-3 size-12 text-[#e0e0e0]" />
            <p className="text-[14px] text-[#6B6B6B]">暂无事件记录</p>
            <p className="mt-1 text-[12px] text-[#999]">点击上方按钮记录第一个事件</p>
          </div>
        )}
      </section>
    </div>
  )
}
