"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const eventTypeOptions = [
  { value: "symptom", label: "症状", icon: "🏥" },
  { value: "medication", label: "用药", icon: "💊" },
  { value: "vet_visit", label: "就诊", icon: "👨‍⚕️" },
  { value: "vaccination", label: "疫苗", icon: "💉" },
  { value: "weight_change", label: "体重变化", icon: "⚖️" },
  { value: "diet_change", label: "饮食变更", icon: "🍽️" },
  { value: "behavior", label: "行为", icon: "🐾" },
  { value: "other", label: "其他", icon: "📝" },
]

export default function NewEventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get("pet")

  const [loading, setLoading] = useState(false)
  const [eventType, setEventType] = useState("symptom")
  const [eventTime, setEventTime] = useState(new Date().toISOString().slice(0, 16))
  const [severity, setSeverity] = useState<number | null>(null)
  const [notes, setNotes] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!petId) {
      toast.error("请选择宠物")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_id: petId,
          event_type: eventType,
          event_time: new Date(eventTime).toISOString(),
          severity,
          notes: notes.trim() || null,
          source_type: "manual",
        }),
      })

      if (!response.ok) throw new Error("创建失败")

      toast.success("事件记录成功")
      router.push("/dashboard/health/events")
    } catch (error) {
      toast.error("记录失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/health/events" className="flex items-center gap-1 text-[14px] text-[#6B6B6B] hover:text-[#111111]">
          <ArrowLeft className="size-4" />
          返回
        </Link>
        <h1 className="text-[28px] font-semibold text-[#111111]">记录事件</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="space-y-5">
          {/* Event Type */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">事件类型</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {eventTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEventType(opt.value)}
                  className={`flex flex-col items-center gap-1 rounded-[12px] p-3 transition-colors ${
                    eventType === opt.value
                      ? "bg-[#FF7A59]/10 ring-2 ring-[#FF7A59]"
                      : "bg-[#F7F6F3] hover:bg-[#F0EFED]"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-[12px] ${eventType === opt.value ? "text-[#FF7A59]" : "text-[#6B6B6B]"}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Event Time */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">发生时间</label>
            <input
              type="datetime-local"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">严重程度（可选）</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(severity === level ? null : level)}
                  className={`size-10 rounded-full text-[13px] font-medium transition-colors ${
                    severity === level
                      ? level <= 3
                        ? "bg-[#34c759] text-white"
                        : level <= 6
                        ? "bg-[#ff9500] text-white"
                        : "bg-[#ff3b30] text-white"
                      : "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-[#6B6B6B]">
              {severity
                ? severity <= 3
                  ? "轻微"
                  : severity <= 6
                  ? "中度"
                  : "严重"
                : "点击选择严重程度"}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">详细描述</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录事件的具体情况..."
              rows={4}
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard/health/events"
            className="flex-1 rounded-full border border-[rgba(0,0,0,0.1)] py-3 text-center text-[14px] text-[#6B6B6B] hover:bg-[#F7F6F3]"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-[#FF7A59] py-3 text-[14px] font-medium text-white hover:bg-[#FF6A49] disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto size-5 animate-spin" /> : "保存记录"}
          </button>
        </div>
      </form>
    </div>
  )
}
