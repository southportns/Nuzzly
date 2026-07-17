"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { preprocessImage } from "@/lib/image"
import { uploadUserAvatar } from "@/lib/supabase/storage"
import { X, Camera, Loader2 } from "lucide-react"

interface ProfileData {
  username: string | null
  bio: string | null
  birth_date: string | null
  avatar_url: string | null
}

interface ProfileEditPanelProps {
  userId: string
  email?: string | null
  initialAvatarUrl?: string | null
  onClose: () => void
  onUpdated?: () => void
}

export function ProfileEditPanel({
  userId,
  email,
  initialAvatarUrl,
  onClose,
  onUpdated,
}: ProfileEditPanelProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl ?? null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [form, setForm] = useState<ProfileData>({
    username: "",
    bio: "",
    birth_date: "",
    avatar_url: initialAvatarUrl ?? null,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, birth_date, avatar_url")
        .eq("id", userId)
        .single()
      if (error) {
        setError("加载资料失败")
      } else if (data) {
        setForm({
          username: data.username ?? "",
          bio: data.bio ?? "",
          birth_date: data.birth_date ?? "",
          avatar_url: data.avatar_url ?? null,
        })
        setAvatarPreview(data.avatar_url ?? initialAvatarUrl ?? null)
      }
      setLoading(false)
    }
    void loadProfile()
  }, [userId, initialAvatarUrl, supabase])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件")
      return
    }
    try {
      const processed = await preprocessImage(file, { maxWidth: 512, maxHeight: 512 })
      setAvatarFile(processed)
      setAvatarPreview(URL.createObjectURL(processed))
      setError(null)
    } catch (err) {
      setError("图片处理失败")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)

    try {
      let avatarUrl = form.avatar_url

      if (avatarFile) {
        const upload = await uploadUserAvatar(avatarFile, userId)
        if (upload.error || !upload.url) {
          throw new Error(upload.error || "头像上传失败")
        }
        avatarUrl = upload.url
      }

      const trimmedUsername = form.username?.trim() || ""
      if (!trimmedUsername) {
        throw new Error("用户名不能为空")
      }

      const updatePayload = {
        username: trimmedUsername,
        bio: form.bio?.trim() || null,
        birth_date: form.birth_date || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      onUpdated?.()
      onClose()
    } catch (err: any) {
      setError(err.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white">
        <Loader2 className="size-5 animate-spin text-[#FF7A59]" />
      </div>
    )
  }

  return (
    <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] px-6 py-4">
        <h3 className="text-[16px] font-semibold text-[#111111]">编辑资料</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full text-[#9A9A95] transition-colors hover:bg-[#F7F6F3] hover:text-[#111111]"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Avatar column */}
          <div className="flex shrink-0 flex-col items-center gap-3 md:w-40">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-[#F7F6F3] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="size-full object-cover transition-opacity group-hover:opacity-75"
                />
              ) : (
                <span className="text-[26px] font-bold text-[#FF7A59]">
                  {(form.username || email || "U").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <span className="text-[12px] text-[#6B6B6B]">点击更换头像</span>
          </div>

          {/* Form fields */}
          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">用户名</label>
              <input
                type="text"
                value={form.username ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="唯一用户名"
                className="w-full rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-4 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF7A59] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">个人简介</label>
              <textarea
                value={form.bio ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="介绍一下你和你的毛球"
                rows={3}
                className="w-full resize-none rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-4 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF7A59] focus:bg-white"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">生日</label>
                <input
                  type="date"
                  value={form.birth_date ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                  className="w-full rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-4 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF7A59] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">邮箱</label>
                <input
                  type="email"
                  value={email ?? ""}
                  disabled
                  className="w-full rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F0EFED] px-4 py-2.5 text-[15px] text-[#9A9A95] outline-none"
                />
                <p className="mt-1 text-[11px] text-[#9A9A95]">邮箱可在账号设置中修改</p>
              </div>
            </div>

            {error && (
              <div className="rounded-[10px] bg-[#FF3B30]/5 px-3 py-2 text-[12px] text-[#FF3B30]">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-6 py-2.5 text-[14px] font-semibold text-[#111111] transition-colors hover:bg-[#F0EFED] disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#FF7A59] px-6 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#E86A4A] disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="size-4 animate-spin" />
                    保存中
                  </span>
                ) : (
                  "保存"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
