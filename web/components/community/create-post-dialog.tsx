"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { X, ImagePlus } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onPosted: () => void
}

const PET_TYPES = [
  { value: "", label: "不选" },
  { value: "cat", label: "猫猫" },
  { value: "dog", label: "狗狗" },
]

export function CreatePostDialog({ open, onOpenChange, user, onPosted }: CreatePostDialogProps) {
  const [content, setContent] = useState("")
  const [petType, setPetType] = useState("")
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 关闭时延迟重置，避免动画闪烁
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setContent("")
      setPetType("")
      previewUrls.forEach(u => URL.revokeObjectURL(u))
      setImageFiles([])
      setPreviewUrls([])
      setAgreed(false)
    }, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remaining = 9 - imageFiles.length
    const valid = files.slice(0, remaining).filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast.warning("图片大小不能超过5MB")
        return false
      }
      return true
    })
    if (valid.length > 0) {
      setImageFiles(prev => [...prev, ...valid])
      setPreviewUrls(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
    }
    e.target.value = ""
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previewUrls[index])
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!user) {
      toast.error("请先登录")
      return
    }
    if (!content.trim()) {
      toast.warning("请输入内容")
      return
    }
    if (!agreed) {
      toast.warning("请先同意社区规范")
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    try {
      // 1. 文本审核（复用已有审核接口，UX 预检）
      const auditRes = await fetch("/api/community/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const auditData = await auditRes.json().catch(() => ({}))
      if (!auditRes.ok || auditData.passed === false) {
        toast.error(auditData.reason || auditData.error || "内容审核未通过")
        setSubmitting(false)
        return
      }

      // 2. 上传图片到 Supabase Storage
      const imageUrls: string[] = []
      for (const file of imageFiles) {
        const ext = file.name.split(".").pop() || "jpg"
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("community-posts")
          .upload(path, file, { contentType: file.type, upsert: false })
        if (uploadErr) {
          console.warn("[create-post] 图片上传失败:", uploadErr.message)
          continue
        }
        const { data: urlData } = supabase.storage.from("community-posts").getPublicUrl(uploadData.path)
        imageUrls.push(urlData.publicUrl)
      }

      // 3. 通过 RPC 发布（SECURITY DEFINER，后端强制审核）
      const { error } = await supabase.rpc("create_community_post", {
        p_content: content,
        p_images: imageUrls,
        p_pet_type: petType || null,
        p_breed: null,
        p_ip_address: null,
      } as never)

      if (error) {
        toast.error(error.message || "发布失败")
        setSubmitting(false)
        return
      }

      toast.success("发布成功")
      onOpenChange(false)
      onPosted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发布失败")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#EEE] px-5 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full bg-[#F5F5F5] hover:bg-[#EEE]"
          >
            <X className="size-4 text-[#6B6B6B]" />
          </button>
          <span className="text-[16px] font-semibold text-[#1A1A1A]">发布动态</span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="rounded-full bg-[#8B5E46] px-4 py-1.5 text-[14px] font-medium text-white transition-colors hover:bg-[#7A523D] disabled:opacity-40"
          >
            {submitting ? "发布中..." : "发布"}
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="分享你和毛孩子的故事..."
            maxLength={2000}
            rows={5}
            className="w-full resize-none outline-none text-[14px] leading-relaxed text-[#1A1A1A] placeholder:text-[#AAA]"
          />
          <div className="text-right text-[12px] text-[#AAA]">{content.length}/2000</div>

          {/* 图片 */}
          {previewUrls.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/50"
                  >
                    <X className="size-3 text-white" />
                  </button>
                </div>
              ))}
              {previewUrls.length < 9 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#E0E0E0] hover:border-[#8B5E46]"
                >
                  <ImagePlus className="size-6 text-[#BBB]" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#E0E0E0] px-4 py-3 text-[13px] text-[#999] hover:border-[#8B5E46]"
            >
              <ImagePlus className="size-5" />
              <span>添加图片</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* 宠物类型 */}
          <div className="mt-5">
            <div className="mb-2 text-[13px] text-[#888]">关联宠物（可选）</div>
            <div className="flex gap-2">
              {PET_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setPetType(t.value)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                    petType === t.value
                      ? "bg-[#8B5E46] text-white"
                      : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EEE]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 协议 */}
          <label className="mt-5 flex cursor-pointer items-start gap-2 text-[12px] text-[#888]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 accent-[#8B5E46]"
            />
            <span>我已阅读并同意《社区规范》和《隐私政策》，发布内容遵守相关法律法规。</span>
          </label>
        </div>
      </div>
    </div>
  )
}
