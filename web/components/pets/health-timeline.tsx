"use client"

import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { PetEvent, PetEventType } from "@/lib/supabase/types"
import { useTranslations, useLocale } from "next-intl"

interface HealthTimelineProps {
  petId: string
  limit?: number
  showFilters?: boolean
  initialEvents?: PetEvent[]
}

const eventConfig: Record<PetEventType, { emoji: string; alt: string; labelKey: string }> = {
  food_start: { emoji: FLUENT_EMOJI.forkKnife, alt: "fork and knife with plate", labelKey: "eventStartFood" },
  food_stop: { emoji: FLUENT_EMOJI.forkKnife, alt: "fork and knife with plate", labelKey: "eventStopFood" },
  food_switch: { emoji: FLUENT_EMOJI.forkKnife, alt: "fork and knife with plate", labelKey: "eventSwitchFood" },
  food_amount_change: { emoji: FLUENT_EMOJI.forkKnife, alt: "fork and knife with plate", labelKey: "eventFoodAmountChange" },
  symptom_observed: { emoji: FLUENT_EMOJI.warning, alt: "warning", labelKey: "eventSymptomObserved" },
  symptom_resolved: { emoji: FLUENT_EMOJI.sparkle, alt: "sparkle", labelKey: "eventSymptomResolved" },
  weight_change: { emoji: FLUENT_EMOJI.chartUp, alt: "chart increasing", labelKey: "eventWeightChange" },
  energy_change: { emoji: FLUENT_EMOJI.sparkle, alt: "sparkle", labelKey: "eventEnergyChange" },
  appetite_change: { emoji: FLUENT_EMOJI.forkKnife, alt: "fork and knife with plate", labelKey: "eventAppetiteChange" },
  vet_visit: { emoji: FLUENT_EMOJI.stethoscope, alt: "stethoscope", labelKey: "eventVetVisitLabel" },
  diagnosis: { emoji: FLUENT_EMOJI.stethoscope, alt: "stethoscope", labelKey: "eventDiagnosisLabel" },
  medication_start: { emoji: FLUENT_EMOJI.pill, alt: "pill", labelKey: "eventMedicationStart" },
  medication_stop: { emoji: FLUENT_EMOJI.pill, alt: "pill", labelKey: "eventMedicationStop" },
  vaccination: { emoji: FLUENT_EMOJI.syringe, alt: "syringe", labelKey: "eventVaccinationLabel" },
  behavior_change: { emoji: FLUENT_EMOJI.pawPrints, alt: "paw prints", labelKey: "eventBehaviorChange" },
  environment_change: { emoji: FLUENT_EMOJI.house, alt: "house", labelKey: "eventEnvironmentChange" },
  review_posted: { emoji: FLUENT_EMOJI.star, alt: "star", labelKey: "eventReviewPosted" },
  followup_completed: { emoji: FLUENT_EMOJI.calendar, alt: "calendar", labelKey: "eventFollowupCompleted" },
  photo_uploaded: { emoji: FLUENT_EMOJI.sparkle, alt: "sparkle", labelKey: "eventPhotoUploaded" },
}

const severityStyles: Record<number, { labelKey: string; className: string }> = {
  1: { labelKey: "severityMild", className: "bg-[#34c759]/10 text-[#1a8c3a]" },
  2: { labelKey: "severityMild", className: "bg-[#34c759]/10 text-[#1a8c3a]" },
  3: { labelKey: "severityModerate", className: "bg-[#ff9500]/10 text-[#b06800]" },
  4: { labelKey: "severitySevere", className: "bg-[#ff3b30]/10 text-[#c5301a]" },
  5: { labelKey: "severitySevere", className: "bg-[#ff3b30]/10 text-[#c5301a]" },
}

// ── FilterCategory: 将细粒度事件类型归为 4 大类 ──
type FilterCategory = "all" | "diet" | "health" | "weight"

const filterCategories: { key: FilterCategory; labelKey: string; emoji: string; alt: string; types: PetEventType[] }[] = [
  { key: "all", labelKey: "allEvents", emoji: FLUENT_EMOJI.alarmClock, alt: "alarm clock", types: [] },
  { key: "diet", labelKey: "dietFilter", emoji: FLUENT_EMOJI.forkKnife, alt: "fork and knife with plate", types: ["food_start", "food_stop", "food_switch", "food_amount_change", "appetite_change"] },
  { key: "health", labelKey: "healthFilter", emoji: FLUENT_EMOJI.stethoscope, alt: "stethoscope", types: ["symptom_observed", "symptom_resolved", "vet_visit", "diagnosis", "medication_start", "medication_stop", "vaccination", "behavior_change", "environment_change", "energy_change", "review_posted", "followup_completed", "photo_uploaded"] },
  { key: "weight", labelKey: "weightChangeFilter", emoji: FLUENT_EMOJI.chartUp, alt: "chart increasing", types: ["weight_change"] },
]

export function HealthTimeline({ petId, limit = 50, showFilters = true, initialEvents }: HealthTimelineProps) {
  const tHealth = useTranslations("Health")
  const locale = useLocale()
  const [events, setEvents] = useState<PetEvent[]>(initialEvents ?? [])
  const [loading, setLoading] = useState(!initialEvents)
  const [filter, setFilter] = useState<FilterCategory>("all")
  const supabase = createClient()

  const dateLocale = locale === "zh" ? "zh-CN" : "en-US"

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return tHealth("todayShort")
    if (diffDays === 1) return tHealth("yesterdayLabel")
    if (diffDays < 7) return tHealth("daysAgo", { days: diffDays })
    if (diffDays < 30) return tHealth("weeksAgo", { weeks: Math.floor(diffDays / 7) })
    if (diffDays < 365) return tHealth("monthsAgo", { months: Math.floor(diffDays / 30) })
    return date.toLocaleDateString(dateLocale)
  }

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      // Skip client-side fetch if we already have server-side data
      if (initialEvents && initialEvents.length > 0) return
      setLoading(true)
      try {
        const { data, error } = await supabase.from("pet_events").select("*").eq("pet_id", petId).order("event_time", { ascending: false }).limit(limit)

        if (cancelled) return
        if (error) {
          console.error("[HealthTimeline] failed to load events:", error.message)
          setEvents(initialEvents ?? [])
        } else {
          setEvents(data || [])
        }
      } catch (err) {
        if (cancelled) return
        console.error("[HealthTimeline] Unexpected error:", err)
        setEvents(initialEvents ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadEvents()

    return () => {
      cancelled = true
    }
  }, [petId, limit, initialEvents])

  // ── Loading ──
  if (loading) {
    return (<div className="rounded-[24px] border border-white/60 bg-white/65 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] backdrop-blur-2xl">
      {/* header skeleton */}
      <div className="mb-5 flex items-center gap-2.5">
        <div className="size-8 shrink-0 rounded-[9px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC]" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded-full bg-black/[0.06]" />
          <div className="h-3 w-20 rounded-full bg-black/[0.04]" />
        </div>
      </div>
      {/* row skeletons */}
      <div className="divide-y divide-black/[0.04]">
        {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-3 py-3.5">
          <div className="size-7 shrink-0 rounded-full bg-black/[0.05]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded-full bg-black/[0.06]" />
            <div className="h-3 w-full rounded-full bg-black/[0.04]" />
          </div>
          <div className="h-6 w-12 rounded-full bg-black/[0.04]" />
        </div>))}
      </div>
    </div>)
  }

  const activeCategory = filterCategories.find((c) => c.key === filter)
  const filteredEvents = filter === "all" ? events : events.filter((e) => activeCategory?.types.includes(e.event_type))

  // Group events by date
  const groupedEvents: Record<string, PetEvent[]> = {}
  filteredEvents.forEach((event) => {
    const dateKey = new Date(event.event_time).toLocaleDateString(dateLocale)
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = []
    }
    groupedEvents[dateKey].push(event)
  })

  return (<div className="rounded-[24px] border border-white/60 bg-white/65 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] backdrop-blur-2xl">
    {/* ── Section Header (inline, not extracted as component) ── */}
    <div className="mb-5 flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#FFE4D2] to-[#FFD2BC] shadow-[0_1px_3px_rgba(255,122,89,0.15)]">
        <FluentEmoji src={FLUENT_EMOJI.alarmClock} alt="alarm clock" size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold leading-tight text-[#1a1a1a]">{tHealth("healthTimelineTitle")}</h2>
        <p className="mt-0.5 text-[11.5px] text-[#86867e]">{tHealth("healthTimelineDesc")}</p>
      </div>
      <span className="shrink-0 rounded-full bg-black/[0.05] px-2.5 py-1 text-[11.5px] font-medium text-[#86867e]">
        {filteredEvents.length}
      </span>
    </div>

    {/* ── Filter Chips ── */}
    {showFilters && (<div className="mb-4 -mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-1.5 px-1">
        {filterCategories.map((cat) => (<button
          key={cat.key}
          onClick={() => setFilter(cat.key)}
          className={cn("flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200",
            filter === cat.key ? "bg-white text-[#1a1a1a] shadow-[0_1px_6px_rgba(0,0,0,0.06)]" : "text-[#86867e] hover:text-[#555]",)}
        >
          <FluentEmoji src={cat.emoji} alt={cat.alt} size={12} />
          {tHealth(cat.labelKey)}
        </button>))}
      </div>
    </div>)}

    {/* ── Timeline Content ── */}
    {filteredEvents.length === 0 ? (<div className="flex flex-col items-center justify-center py-16">
      <FluentEmoji src={FLUENT_EMOJI.alarmClock} alt="alarm clock" size={48} className="mb-3 opacity-50" />
      <p className="text-[14px] font-medium text-[#86867e]">{tHealth("noHealthEvents")}</p>
      <p className="mt-1 text-[12px] text-[#c5c5c2]">{tHealth("healthTimelineHint")}</p>
    </div>) : (<div className="divide-y divide-black/[0.04]">
      {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (<div key={dateKey} className="py-3.5 first:pt-0 last:pb-0">
        {/* Date group header */}
        <div className="mb-2.5 flex items-center gap-1.5">
          <FluentEmoji src={FLUENT_EMOJI.calendar} alt="calendar" size={14} />
          <span className="text-[12px] font-medium text-[#86867e]">{dateKey}</span>
        </div>

        {/* Events within this date */}
        <div className="space-y-2.5 pl-5">
          {dayEvents.map((event) => {
            const config = eventConfig[event.event_type] || eventConfig.symptom_observed
            const severity = event.severity ? severityStyles[event.severity] : null

            return (<div key={event.id} className="flex items-start gap-2.5">
              {/* Event icon */}
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.03]">
                <FluentEmoji src={config.emoji} alt={config.alt} size={14} />
              </div>

              {/* Event content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-[#1a1a1a]">{tHealth(config.labelKey)}</span>
                  {event.symptom_code && (<span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10.5px] font-medium text-[#86867e]">
                    {event.symptom_code}
                  </span>)}
                  {severity && (<span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium", severity.className)}>
                    {tHealth(severity.labelKey)}
                  </span>)}
                  <span className="text-[11px] text-[#c5c5c2]">{formatDate(event.event_time)}</span>
                </div>
                {event.notes && (<p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#86867e]">
                  {event.notes}
                </p>)}
              </div>
            </div>)
          })}
        </div>
      </div>))}
    </div>)}
  </div>)
}
