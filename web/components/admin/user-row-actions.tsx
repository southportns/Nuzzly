"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

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
const [reason, setReason] = useState(flagReason?? "")

const callApi = async (path: string, body: Record<string, unknown>, successMsg: string) => {
startTransition(async () => {
const res = await fetch(path, {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
})
if (!res.ok) {
const err = await res.json().catch(() => ({ error: "UnknownError" }))
toast.error(err.error || "Actionsfailed")
return
}
toast.success(successMsg)
setOpen(false)
router.refresh()
})
}

const onToggleFlag = () => {
if (isFlagged) {
callApi(`/api/admin/users/${userId}/flag`, { flagged: false }, `alreadyCancel @${username}`)
return
}
if (!reason.trim()) {
setShowFlagDialog(true)
return
}
callApi(`/api/admin/users/${userId}/flag`, { flagged: true, reason: reason.trim() }, `Flagged @${username}`)
}

const onConfirmFlag = () => {
if (!reason.trim()) {
toast.error("pleasereason")
return
}
callApi(`/api/admin/users/${userId}/flag`, { flagged: true, reason: reason.trim() }, `Flagged @${username}`)
setShowFlagDialog(false)
}

const onToggleAdmin = () => {
callApi(`/api/admin/users/${userId}/admin`,
{ isAdmin:!isAdmin },
isAdmin? `alreadyUndo @${username} AdminPermissions`: `already @${username} AdminPermissions`)
}

return (<div className="flex items-center justify-end gap-2">
{showFlagDialog && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
<div className="w-full max-w-[420px] rounded-[20px] bg-white p-6 shadow-xl">
<h3 className="text-[16px] font-semibold text-[#111111]"> @{username}</h3>
<p className="mt-1 text-[13px] text-[#6B6B6B]">pleasereason, on follow-upReview.</p>
<textarea
value={reason}
onChange={(e) => setReason(e.target.value)}
placeholder="e.g.:,Violation..."
rows={3}
className="mt-3 w-full resize-none rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] p-3 text-[13.5px] outline-none focus:border-[#FF7A59]"
/>
<div className="mt-4 flex justify-end gap-2">
<button
type="button"
onClick={() => setShowFlagDialog(false)}
className="rounded-full px-4 py-2 text-[13px] text-[#6B6B6B] hover:bg-[#F7F6F3]"
>
Cancel
</button>
<button
type="button"
onClick={onConfirmFlag}
disabled={pending}
className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b30] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e0342a] disabled:opacity-50"
>
{pending && <EmojiIcon name="Loader2" className="size-3 animate-spin" />}
Confirm
</button>
</div>
</div>
</div>)}

<button
type="button"
onClick={onToggleFlag}
disabled={pending}
className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
isFlagged? "bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/20": "border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] hover:bg-[#F0EFED]"
}`}
title={isFlagged? "Cancel": "User"}
>
{pending? <EmojiIcon name="Loader2" className="size-3 animate-spin" />: <EmojiIcon name="Flag" className="size-3" />}
{isFlagged? "Flagged": ""}
</button>
<button
type="button"
onClick={onToggleAdmin}
disabled={pending}
className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
isAdmin? "bg-[#7BA7BC]/14 text-[#4A7A91] hover:bg-[#7BA7BC]/24": "border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] hover:bg-[#F0EFED]"
}`}
title={isAdmin? "UndoAdmin": " for Admin"}
>
{isAdmin? <EmojiIcon name="ShieldOff" className="size-3" />: <EmojiIcon name="Shield" className="size-3" />}
{isAdmin? "UndoManagement": " for Management"}
</button>
</div>)
}
