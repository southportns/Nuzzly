"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SettingsCard } from "@/components/settings/settings-card"

const feedbackTypes = ["功能建议", "问题反馈", "体验问题", "其他"]

export default function FeedbackSettings() {
  const router = useRouter()
  const [type, setType] = useState("功能建议")
  const [content, setContent] = useState("")
  const [contact, setContact] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = () => {
    if (saving) return
    if (!content.trim()) {
      alert("请填写描述")
      return
    }
    
    setSaving(true)
    try {
      const list = JSON.parse(localStorage.getItem("nuzzly_feedback") || "[]")
      list.push({ 
        type, 
        content, 
        contact, 
        created_at: new Date().toISOString() 
      })
      localStorage.setItem("nuzzly_feedback", JSON.stringify(list))
      alert("反馈已提交,感谢支持")
      setContent("")
      setContact("")
      router.back()
    } catch (e) {
      alert("提交失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          帮助与反馈
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">告诉我们你的想法</p>
      </div>

      <SettingsCard className="p-4">
        <div className="mb-4">
          <label className="mb-2 block text-[13px] font-medium text-[#6B6B6B]">
            反馈类型 <span className="text-[#FF3B30]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {feedbackTypes.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-full border px-4 py-2 text-[14px] transition-all ${
                  type === t
                    ? "border-[#FF7A59] bg-[#FF7A59] text-white"
                    : "border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] text-[#111111] hover:bg-[#F0EFED]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">详细描述</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="请描述您遇到的问题或建议..."
            className="w-full resize-none rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF7A59] focus:bg-white"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">
            联系方式(可选)
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="邮箱或手机号"
            className="w-full rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF7A59] focus:bg-white"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-full bg-[#FF7A59] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#E86A4A] disabled:opacity-50"
        >
          {saving ? "提交中..." : "提交反馈"}
        </button>
      </SettingsCard>
    </div>
  )
}
