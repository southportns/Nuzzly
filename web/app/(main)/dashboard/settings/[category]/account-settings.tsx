"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { SettingsCard } from "@/components/settings/settings-card"
import { AlertTriangle, Mail } from "lucide-react"

interface AccountSettingsProps {
  user: User
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleChangePassword = async () => {
    if (saving) return
    if (!password || password.length < 6) {
      alert("密码至少 6 位")
      return
    }
    if (password !== confirmPassword) {
      alert("两次密码不一致")
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      
      alert("密码已更新")
      setPassword("")
      setConfirmPassword("")
    } catch (e: any) {
      alert(e.message || "更新失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleting || deleteConfirmText !== "注销") return
    
    setDeleting(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error("未登录")

      // 软删除 profile
      await supabase
        .from("profiles")
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq("id", currentUser.id)

      // 注销登录
      await supabase.auth.signOut()
      alert("账号已注销")
      setShowDeleteConfirm(false)
      setDeleteConfirmText("")
      router.replace("/login")
    } catch (e: any) {
      alert(e.message || "注销失败,请联系客服")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          账号与安全
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">管理你的登录信息</p>
      </div>

      <SettingsCard>
        <div className="px-4 pb-1 pt-4 text-[13px] font-medium text-[#6B6B6B]">
          邮箱
        </div>
        <div className="flex items-center gap-2 px-4 py-3.5">
          <Mail className="size-4 text-[#6B6B6B]" />
          <span className="text-[15px] text-[#111111]">{user.email || "未登录"}</span>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="px-4 pb-1 pt-4 text-[13px] font-medium text-[#6B6B6B]">
          修改密码
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">新密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              className="w-full rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF7A59] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入"
              className="w-full rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF7A59] focus:bg-white"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="w-full rounded-full bg-[#FF7A59] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#E86A4A] disabled:opacity-50"
          >
            {saving ? "更新中..." : "更新密码"}
          </button>
        </div>
      </SettingsCard>

      <SettingsCard className="border-[#FF3B30]/15">
        <div className="p-4">
          <div className="mb-3 flex items-start gap-2 rounded-[10px] bg-[#FF3B30]/5 p-3">
            <AlertTriangle className="size-4 shrink-0 text-[#FF3B30]" />
            <span className="text-[13px] leading-relaxed text-[#FF3B30]">
              注销账号后,所有数据将被永久删除且无法恢复
            </span>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full rounded-full border border-[#FF3B30]/20 bg-transparent py-3 text-[15px] font-semibold text-[#FF3B30] transition-colors hover:bg-[#FF3B30]/5"
          >
            注销账号
          </button>
        </div>
      </SettingsCard>

      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="w-full max-w-[320px] rounded-[20px] bg-white p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-[40px]">⚠️</div>
            <h3 className="mb-2 text-[18px] font-bold text-[#111111]">确认注销账号?</h3>
            <p className="mb-4 text-[13px] leading-relaxed text-[#6B6B6B]">
              此操作将永久删除您的账号及所有关联数据,包括宠物档案、评价记录、健康数据等,且<strong className="text-[#FF3B30]">无法恢复</strong>。
            </p>
            <div className="mb-4 text-left">
              <label className="mb-1.5 block text-[12px] text-[#6B6B6B]">
                请输入 <strong className="text-[#111111]">注销</strong> 以确认
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="输入「注销」"
                className="w-full rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#FF3B30] focus:bg-white"
              />
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText("")
                }}
                className="flex-1 rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] py-3 text-[15px] font-semibold text-[#111111] transition-colors hover:bg-[#F0EFED]"
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "注销" || deleting}
                className="flex-1 rounded-full bg-[#FF3B30] py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? "注销中..." : "确认注销"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
