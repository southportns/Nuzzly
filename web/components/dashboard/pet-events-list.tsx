"use client"

import { useState } from "react"
import { Calendar, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"

interface PetEvent {
  id: string
  event_type: string
  event_time: string
  notes: string | null
  severity: number | null
  products?: { name: string; brand: string } | null
}

interface Props {
  events: PetEvent[]
}

const eventTypeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  symptom: { label: "症状", icon: "🏥", color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
  medication: { label: "用药", icon: "💊", color: "text-[#007AFF]", bg: "bg-[#007AFF]/10" },
  vet_visit: { label: "就诊", icon: "👨‍⚕️", color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
  vaccination: { label: "疫苗", icon: "💉", color: "text-[#585858]", bg: "bg-[#585858]/10" },
  weight_change: { label: "体重", icon: "⚖️", color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
  diet_change: { label: "饮食", icon: "🍽️", color: "text-[#AF52DE]", bg: "bg-[#AF52DE]/10" },
  behavior: { label: "行为", icon: "🐾", color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
  other: { label: "其他", icon: "📝", color: "text-[#6B6B6B]", bg: "bg-[#6B6B6B]/10" },
}

export function PetEventsList({ events }: Props) {
  return (
    <div className="space-y-2">
      {events.map((event) => {
        const config = eventTypeConfig[event.event_type] || eventTypeConfig.other
        const eventDate = new Date(event.event_time)

        return (
          <Link
            key={event.id}
            href={`/dashboard/health/events/${event.id}`}
            className="flex items-center justify-between rounded-[12px] bg-[#F7F6F3] p-3 transition-all hover:bg-[#F0EFED]"
          >
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-full ${config.bg}`}>
                <span className="text-lg">{config.icon}</span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#111111]">{config.label}</p>
                {event.notes && (
                  <p className="mt-0.5 text-[12px] text-[#6B6B6B] line-clamp-1">{event.notes}</p>
                )}
                {event.products && (
                  <p className="mt-0.5 text-[10px] text-[#999]">{event.products.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[12px] text-[#6B6B6B]">
                  {eventDate.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                </p>
                <p className="text-[10px] text-[#999]">
                  {eventDate.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {event.severity != null && event.severity >= 5 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${config.color} ${config.bg}`}>
                  严重度 {event.severity}
                </span>
              )}
              <ChevronRight className="size-4 text-[#D2D1CF]" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
