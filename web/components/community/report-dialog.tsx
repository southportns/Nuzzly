"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { X } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string | null
  user: User | null
}

type ReportCategory = "spam" | "violence" | "pornography" | "political" | "fraud" | "privacy" | "other"

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "spam", label: "垃圾广告" },
  { value: "violence", label: "暴力恐怖" },
  { value: "pornography", label: "色情低俗" },
  { value: "political", label: "政治敏感" },
  { value: "fraud", label: "诈骗" },
  { value: "privacy", label: "隐私泄露" },
  { value: "other", label: "其他" },
]

export function ReportDialog({ open, onOpenChange, postId, user }: ReportDialogProps) {
  const [category, setCategory] = useState<ReportCategory>("other")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setCategory("other")
      setReason("")
    }, 200)
    return () => clearTimeout(t)
  }, [open])

  async function handleSubmit() {
    if (!user) {
      toast.error("请先登录")
      return
    }
    if (!postId) return
    if (!reason.trim()) {
      toast.warning("请描述举报原因")
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from("community_reports").insert({
      post_id: postId,
      reporter_id: user.id,
      reason,
      category,
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message || "举报失败")
      return
    }
    toast.success("举报已提交，我们将尽快处理")
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EEE] px-5 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full bg-[#F5F5F5] hover:bg-[#EEE]"
          >
            <X className="size-4 text-[#6B6B6B]" />
          </button>
          <span className="text-[16px] font-semibold text-[#1A1A1A]">举报</span>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="rounded-full bg-[#8B5E46] px-4 py-1.5 text-[14px] font-medium text-white transition-colors hover:bg-[#7A523D] disabled:opacity-40"
          >
            {submitting ? "提交中..." : "提交"}
          </button>
        </div>
        <div className="p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  category === c.value
                    ? "border-transparent bg-[#8B5E46] text-white"
                    : "border-[#E5E5E5] bg-white text-[#6B6B6B] hover:border-[#8B5E46]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="请描述举报原因..."
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-[#E5E5E5] p-3 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#AAA] focus:border-[#8B5E46]"
          />
        </div>
      </div>
    </div>
  )
}
