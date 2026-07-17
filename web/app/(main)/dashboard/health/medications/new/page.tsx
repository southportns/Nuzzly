"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const frequencyOptions = [
  { value: "once_daily", label: "每日一次" },
  { value: "twice_daily", label: "每日两次" },
  { value: "three_times_daily", label: "每日三次" },
  { value: "weekly", label: "每周一次" },
  { value: "as_needed", label: "按需服用" },
]

export default function NewMedicationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get("pet")

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [dosage, setDosage] = useState("")
  const [frequency, setFrequency] = useState("once_daily")
  const [startedOn, setStartedOn] = useState(new Date().toISOString().split("T")[0])
  const [isOngoing, setIsOngoing] = useState(true)
  const [notes, setNotes] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("请输入药物名称")
      return
    }

    if (!petId) {
      toast.error("请选择宠物")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_id: petId,
          name: name.trim(),
          dosage: dosage.trim() || null,
          frequency,
          started_on: startedOn,
          is_ongoing: isOngoing,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) throw new Error("创建失败")

      toast.success("用药记录创建成功")
      router.push("/dashboard/health/medications")
    } catch (error) {
      toast.error("创建失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/health/medications" className="flex items-center gap-1 text-[14px] text-[#6B6B6B] hover:text-[#111111]">
          <ArrowLeft className="size-4" />
          返回
        </Link>
        <h1 className="text-[28px] font-semibold text-[#111111]">添加用药记录</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="space-y-5">
          {/* Medication Name */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">药物名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：驱虫药、维生素、消炎药"
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
            />
          </div>

          {/* Dosage */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">剂量</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="例如：1片、5ml、0.5g"
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">服用频率</label>
            <div className="flex flex-wrap gap-2">
              {frequencyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                    frequency === opt.value
                      ? "bg-[#FF7A59] text-white"
                      : "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">开始日期</label>
            <input
              type="date"
              value={startedOn}
              onChange={(e) => setStartedOn(e.target.value)}
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
            />
          </div>

          {/* Ongoing Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-medium text-[#111111]">持续用药中</label>
              <button
                type="button"
                onClick={() => setIsOngoing(!isOngoing)}
                className={`relative size-11 rounded-full transition-colors ${
                  isOngoing ? "bg-[#34c759]" : "bg-[#E8E8E8]"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                    isOngoing ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <p className="mt-1 text-[12px] text-[#6B6B6B]">开启后将在用药记录中标记为"持续中"</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录用药原因、注意事项等..."
              rows={3}
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard/health/medications"
            className="flex-1 rounded-full border border-[rgba(0,0,0,0.1)] py-3 text-center text-[14px] text-[#6B6B6B] hover:bg-[#F7F6F3]"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 rounded-full bg-[#FF7A59] py-3 text-[14px] font-medium text-white hover:bg-[#FF6A49] disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto size-5 animate-spin" /> : "保存记录"}
          </button>
        </div>
      </form>
    </div>
  )
}
