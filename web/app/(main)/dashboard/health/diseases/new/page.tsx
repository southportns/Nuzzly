"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const severityOptions = [
  { value: "mild", label: "轻微", color: "#34c759" },
  { value: "moderate", label: "中度", color: "#ff9500" },
  { value: "severe", label: "严重", color: "#ff3b30" },
  { value: "critical", label: "危急", color: "#ff2d55" },
]

const statusOptions = [
  { value: "active", label: "进行中" },
  { value: "under_treatment", label: "治疗中" },
  { value: "chronic", label: "慢性病" },
  { value: "resolved", label: "已康复" },
]

export default function NewDiseasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get("pet")

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [severity, setSeverity] = useState("mild")
  const [status, setStatus] = useState("active")
  const [diagnosedOn, setDiagnosedOn] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("请输入疾病名称")
      return
    }

    if (!petId) {
      toast.error("请选择宠物")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/diseases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_id: petId,
          name: name.trim(),
          severity,
          status,
          diagnosed_on: diagnosedOn,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) throw new Error("创建失败")

      toast.success("记录创建成功")
      router.push("/dashboard/health/diseases")
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
        <Link href="/dashboard/health/diseases" className="flex items-center gap-1 text-[14px] text-[#6B6B6B] hover:text-[#111111]">
          <ArrowLeft className="size-4" />
          返回
        </Link>
        <h1 className="text-[28px] font-semibold text-[#111111]">添加疾病记录</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="space-y-5">
          {/* Disease Name */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">疾病名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：感冒、肠胃炎、皮肤病"
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">严重程度</label>
            <div className="flex flex-wrap gap-2">
              {severityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                    severity === opt.value
                      ? "text-white"
                      : "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
                  }`}
                  style={severity === opt.value ? { backgroundColor: opt.color } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">当前状态</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                    status === opt.value
                      ? "bg-[#FF7A59] text-white"
                      : "bg-[#F7F6F3] text-[#6B6B6B] hover:bg-[#F0EFED]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnosed Date */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">确诊日期</label>
            <input
              type="date"
              value={diagnosedOn}
              onChange={(e) => setDiagnosedOn(e.target.value)}
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] focus:border-[#FF7A59] focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[14px] font-medium text-[#111111] mb-2">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录症状、治疗方案等信息..."
              rows={3}
              className="w-full rounded-[12px] border border-[rgba(0,0,0,0.1)] px-4 py-3 text-[14px] text-[#111111] placeholder:text-[#999] focus:border-[#FF7A59] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard/health/diseases"
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
