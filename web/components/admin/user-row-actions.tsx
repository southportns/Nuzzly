"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Flag, Shield, ShieldOff, MoreHorizontal, Loader2 } from "lucide-react"

interface UserRowActionsProps {
  userId: string
  username: string
  isFlagged: boolean
  isAdmin: boolean
  flagReason: string | null
}

export function UserRowActions({
  userId,
  username,
  isFlagged,
  isAdmin,
  flagReason,
}: UserRowActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [showFlagDialog, setShowFlagDialog] = useState(false)
  const [reason, setReason] = useState(flagReason ?? "")

  const callApi = async (path: string, body: Record<string, unknown>, successMsg: string) => {
    startTransition(async () => {
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "未知错误" }))
        toast.error(err.error || "操作失败")
        return
      }
      toast.success(successMsg)
      setOpen(false)
      router.refresh()
    })
  }

  const onToggleFlag = () => {
    if (isFlagged) {
      callApi(`/api/admin/users/${userId}/flag`, { flagged: false }, `已取消标记 @${username}`)
      return
    }
    if (!reason.trim()) {
      setShowFlagDialog(true)
      return
    }
    callApi(`/api/admin/users/${userId}/flag`, { flagged: true, reason: reason.trim() }, `已标记 @${username}`)
  }

  const onConfirmFlag = () => {
    if (!reason.trim()) {
      toast.error("请填写标记原因")
      return
    }
    callApi(`/api/admin/users/${userId}/flag`, { flagged: true, reason: reason.trim() }, `已标记 @${username}`)
    setShowFlagDialog(false)
  }

  const onToggleAdmin = () => {
    callApi(
      `/api/admin/users/${userId}/admin`,
      { isAdmin: !isAdmin },
      isAdmin ? `已撤销 @${username} 的管理员权限` : `已授予 @${username} 管理员权限`
    )
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {showFlagDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[420px] rounded-[20px] bg-white p-6 shadow-xl">
            <h3 className="text-[16px] font-semibold text-[#111111]">标记 @{username}</h3>
            <p className="mt-1 text-[13px] text-[#6B6B6B]">请说明标记原因，便于后续审核。</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：刷评、违规内容..."
              rows={3}
              className="mt-3 w-full resize-none rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] p-3 text-[13.5px] outline-none focus:border-[#FF7A59]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFlagDialog(false)}
                className="rounded-full px-4 py-2 text-[13px] text-[#6B6B6B] hover:bg-[#F7F6F3]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onConfirmFlag}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b30] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e0342a] disabled:opacity-50"
              >
                {pending && <Loader2 className="size-3 animate-spin" />}
                确认标记
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleFlag}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
          isFlagged
            ? "bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/20"
            : "border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] hover:bg-[#F0EFED]"
        }`}
        title={isFlagged ? "取消标记" : "标记此用户"}
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Flag className="size-3" />}
        {isFlagged ? "已标记" : "标记"}
      </button>
      <button
        type="button"
        onClick={onToggleAdmin}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
          isAdmin
            ? "bg-[#7BA7BC]/14 text-[#4A7A91] hover:bg-[#7BA7BC]/24"
            : "border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] hover:bg-[#F0EFED]"
        }`}
        title={isAdmin ? "撤销管理员" : "设为管理员"}
      >
        {isAdmin ? <ShieldOff className="size-3" /> : <Shield className="size-3" />}
        {isAdmin ? "撤销管理" : "设为管理"}
      </button>
    </div>
  )
}
