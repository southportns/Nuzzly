"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Utensils,
  AlertTriangle,
  Stethoscope,
  Pill,
  Weight,
  Activity,
  Camera,
  MessageSquare,
  Calendar,
} from "lucide-react"
import type { PetEvent, PetEventType } from "@/lib/supabase/types"

interface HealthTimelineProps {
  petId: string
  limit?: number
  showFilters?: boolean
}

const eventConfig: Record<PetEventType, { icon: typeof Utensils; label: string; color: string }> = {
  food_start: { icon: Utensils, label: "开始食用", color: "bg-green-100 text-green-700" },
  food_stop: { icon: Utensils, label: "停止食用", color: "bg-gray-100 text-gray-700" },
  food_switch: { icon: Utensils, label: "更换食品", color: "bg-blue-100 text-blue-700" },
  food_amount_change: { icon: Utensils, label: "食量变化", color: "bg-yellow-100 text-yellow-700" },
  symptom_observed: { icon: AlertTriangle, label: "观察到症状", color: "bg-red-100 text-red-700" },
  symptom_resolved: { icon: Activity, label: "症状消失", color: "bg-green-100 text-green-700" },
  weight_change: { icon: Weight, label: "体重变化", color: "bg-purple-100 text-purple-700" },
  energy_change: { icon: Activity, label: "活跃度变化", color: "bg-orange-100 text-orange-700" },
  appetite_change: { icon: Utensils, label: "食欲变化", color: "bg-yellow-100 text-yellow-700" },
  vet_visit: { icon: Stethoscope, label: "就医", color: "bg-red-100 text-red-700" },
  diagnosis: { icon: Stethoscope, label: "诊断", color: "bg-red-100 text-red-700" },
  medication_start: { icon: Pill, label: "开始用药", color: "bg-blue-100 text-blue-700" },
  medication_stop: { icon: Pill, label: "停止用药", color: "bg-gray-100 text-gray-700" },
  vaccination: { icon: Stethoscope, label: "疫苗接种", color: "bg-green-100 text-green-700" },
  behavior_change: { icon: Activity, label: "行为变化", color: "bg-orange-100 text-orange-700" },
  environment_change: { icon: Activity, label: "环境变化", color: "bg-gray-100 text-gray-700" },
  review_posted: { icon: MessageSquare, label: "发布评价", color: "bg-blue-100 text-blue-700" },
  followup_completed: { icon: Calendar, label: "完成追评", color: "bg-green-100 text-green-700" },
  photo_uploaded: { icon: Camera, label: "上传照片", color: "bg-purple-100 text-purple-700" },
}

const severityLabels: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  1: { label: "轻微", variant: "outline" },
  2: { label: "较轻", variant: "secondary" },
  3: { label: "中等", variant: "default" },
  4: { label: "较重", variant: "destructive" },
  5: { label: "严重", variant: "destructive" },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "今天"
  if (diffDays === 1) return "昨天"
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return date.toLocaleDateString("zh-CN")
}

export function HealthTimeline({ petId, limit = 50, showFilters = true }: HealthTimelineProps) {
  const [events, setEvents] = useState<PetEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PetEventType | "all">("all")
  const supabase = createClient()

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      let query = supabase
        .from("pet_events")
        .select("*")
        .eq("pet_id", petId)
        .order("event_time", { ascending: false })
        .limit(limit)

      if (filter !== "all") {
        query = query.eq("event_type", filter)
      }

      const { data } = await query
      setEvents(data || [])
      setLoading(false)
    }
    loadEvents()
  }, [petId, filter, limit])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.event_type === filter)

  // Group events by date
  const groupedEvents: Record<string, PetEvent[]> = {}
  filteredEvents.forEach((event) => {
    const dateKey = new Date(event.event_time).toLocaleDateString("zh-CN")
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = []
    }
    groupedEvents[dateKey].push(event)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>健康事件时间线</span>
          <Badge variant="outline">{filteredEvents.length} 条记录</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <ScrollArea className="w-full pb-4">
            <div className="flex gap-2">
              <Badge
                variant={filter === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilter("all")}
              >
                全部
              </Badge>
              {Object.entries(eventConfig)
                .slice(0, 8)
                .map(([type, config]) => (
                  <Badge
                    key={type}
                    variant={filter === type ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => setFilter(type as PetEventType)}
                  >
                    {config.label}
                  </Badge>
                ))}
            </div>
          </ScrollArea>
        )}

        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无健康事件记录</p>
            <p className="text-sm mt-1">记录宠物的饮食、症状、就医等信息</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{dateKey}</span>
                </div>
                <div className="space-y-3 pl-6 border-l-2 border-muted">
                  {dayEvents.map((event) => {
                    const config = eventConfig[event.event_type] || eventConfig.symptom_observed
                    const Icon = config.icon
                    const severity = event.severity ? severityLabels[event.severity] : null

                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className={`p-1.5 rounded-full ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{config.label}</span>
                            {event.symptom_code && (
                              <Badge variant="outline" className="text-xs">
                                {event.symptom_code}
                              </Badge>
                            )}
                            {severity && (
                              <Badge variant={severity.variant} className="text-xs">
                                {severity.label}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(event.event_time)}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
