"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import type { CommunityPostForAdmin, CommunityReviewStatus } from "@/lib/supabase/queries/admin-queries"

interface CommunityModerationProps {
posts: CommunityPostForAdmin[]
initialStatus: CommunityReviewStatus | "all"
stats: {
pending: number
approved: number
rejected: number
autoApproved: number
total: number
pendingReports: number
}
}

const STATUS_TABS: { value: CommunityReviewStatus | "all"; label: string; color: string }[] = [
{ value: "all", label: "All", color: "#6B6B6B" },
{ value: "pending", label: "Pending Review", color: "#d29922" },
{ value: "approved", label: "alreadypast ", color: "#3fb950" },
{ value: "auto_approved", label: "past ", color: "#58a6ff" },
{ value: "rejected", label: "Rejected", color: "#f85149" },
]

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
pending: { label: "Pending Review", bg: "rgba(210,153,34,0.12)", text: "#d29922" },
approved: { label: "alreadypast ", bg: "rgba(63,185,80,0.12)", text: "#3fb950" },
auto_approved: { label: "past ", bg: "rgba(88,166,255,0.12)", text: "#58a6ff" },
rejected: { label: "Rejected", bg: "rgba(248,81,73,0.12)", text: "#f85149" },
}

function formatTime(dateStr: string) {
const d = new Date(dateStr)
const diff = Date.now() - d.getTime()
if (diff < 60000) return ""
if (diff < 3600000) return `${Math.floor(diff / 60000)} `
if (diff < 86400000) return `${Math.floor(diff / 3600000)}small `
if (diff < 604800000) return `${Math.floor(diff / 86400000)} `
return d.toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export function CommunityModeration({ posts, initialStatus, stats }: CommunityModerationProps) {
const router = useRouter()
const [pending, startTransition] = useTransition()
const [selected, setSelected] = useState<Set<string>>(new Set())
const [rejectDialog, setRejectDialog] = useState<{ postId: string | null; batch: boolean }>({ postId: null, batch: false })
const [rejectReason, setRejectReason] = useState("")

const currentTab = initialStatus

const toggleSelect = useCallback((id: string) => {
setSelected(prev => {
const s = new Set(prev)
if (s.has(id)) s.delete(id)
else s.add(id)
return s
})
}, [])

const toggleSelectAll = useCallback(() => {
setSelected(prev => {
if (prev.size === posts.length) return new Set()
return new Set(posts.map(p => p.id))
})
}, [posts])

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
setRejectDialog({ postId: null, batch: false })
setRejectReason("")
setSelected(new Set())
router.refresh()
})
}

const onApprove = (postId: string) => {
callApi(`/api/admin/community/posts/${postId}`, { action: "approve" }, "alreadypast Review")
}

const onReject = (postId: string) => {
setRejectDialog({ postId, batch: false })
setRejectReason("")
}

const onConfirmReject = () => {
if (!rejectReason.trim()) {
toast.error("pleaseRejectreason")
return
}
if (rejectDialog.batch && selected.size > 0) {
callApi("/api/admin/community/posts/batch", { postIds: [...selected], action: "reject", reason: rejectReason.trim() }, `alreadyReject ${selected.size} Post`)
} else if (rejectDialog.postId) {
callApi(`/api/admin/community/posts/${rejectDialog.postId}`, { action: "reject", reason: rejectReason.trim() }, "RejectedPost")
}
}

const onBatchApprove = () => {
if (selected.size === 0) {
toast.warning("please firstSelectPost")
return
}
callApi("/api/admin/community/posts/batch", { postIds: [...selected], action: "approve" }, `alreadypast ${selected.size} Post`)
}

const onBatchReject = () => {
if (selected.size === 0) {
toast.warning("please firstSelectPost")
return
}
setRejectDialog({ postId: null, batch: true })
setRejectReason("")
}

const statCards = [
{ label: "Pending Review", value: stats.pending, color: "#d29922", href: "?status=pending" },
{ label: "alreadypast ", value: stats.approved, color: "#3fb950", href: "?status=approved" },
{ label: "past ", value: stats.autoApproved, color: "#58a6ff", href: "?status=auto_approved" },
{ label: "Rejected", value: stats.rejected, color: "#f85149", href: "?status=rejected" },
{ label: "PendingReport", value: stats.pendingReports, color: "#ff7a59", href: "?status=all" },
]

return (<div className="flex flex-col gap-6">
{/* Stats Cards */}
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
{statCards.map(c => (<a
key={c.label}
href={c.href}
className="group flex flex-col gap-1 rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
>
<div className="text-[24px] font-bold leading-none" style={{ color: c.color }}>
{c.value}
</div>
<div className="text-[12px] text-[#6B6B6B]">{c.label}</div>
</a>))}
</div>

{/* Tabs */}
<div className="flex flex-wrap items-center gap-2">
{STATUS_TABS.map(tab => {
const isActive = currentTab === tab.value
const count =
tab.value === "all"? stats.total: tab.value === "pending"? stats.pending: tab.value === "approved"? stats.approved: tab.value === "auto_approved"? stats.autoApproved: stats.rejected
return (<a
key={tab.value}
href={tab.value === "all"? "/admin/community": `/admin/community?status=${tab.value}`}
className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
isActive? "bg-[#111111] text-white": "border border-[rgba(0,0,0,0.06)] bg-white text-[#6B6B6B] hover:bg-[#F7F6F3]"
}`}
>
{tab.label}
<span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive? "bg-white/20": "bg-[#F0EFED]"}`}>
{count}
</span>
</a>)
})}
</div>

{/* Batch Actions */}
{posts.length > 0 && (<div className="flex items-center gap-3 rounded-[14px] border border-[rgba(0,0,0,0.05)] bg-white px-4 py-3">
<label className="flex items-center gap-2 text-[13px] text-[#444444]">
<input
type="checkbox"
checked={selected.size === posts.length && posts.length > 0}
onChange={toggleSelectAll}
className="size-4 accent-[#FF7A59]"
/>
Select All ({selected.size}/{posts.length})
</label>
<div className="h-4 w-px bg-[#E5E5E5]" />
<button
type="button"
onClick={onBatchApprove}
disabled={pending || selected.size === 0}
className="inline-flex items-center gap-1.5 rounded-full bg-[#3fb950]/10 px-3 py-1.5 text-[12px] font-semibold text-[#3fb950] transition-colors hover:bg-[#3fb950]/20 disabled:opacity-40"
>
<EmojiIcon name="Check" className="size-3" />
past 
</button>
<button
type="button"
onClick={onBatchReject}
disabled={pending || selected.size === 0}
className="inline-flex items-center gap-1.5 rounded-full bg-[#f85149]/10 px-3 py-1.5 text-[12px] font-semibold text-[#f85149] transition-colors hover:bg-[#f85149]/20 disabled:opacity-40"
>
<EmojiIcon name="X" className="size-3" />
Reject
</button>
{pending && <EmojiIcon name="Loader2" className="size-4 animate-spin text-[#6B6B6B]" />}
</div>)}

{/* Posts List */}
{posts.length === 0? (<div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[rgba(0,0,0,0.08)] bg-white py-16">
<div className="flex size-14 items-center justify-center rounded-full bg-[#A8C5A0]/15 text-[#A8C5A0]">
<EmojiIcon name="CheckCircle" className="size-6" />
</div>
<p className="text-[14px] text-[#6B6B6B]">No </p>
</div>): (<div className="flex flex-col gap-3">
{posts.map(post => {
const profile = post.public_profiles
const name = profile?.username || profile?.display_name || "Anonymous"
const avatar = profile?.avatar_url
const badge = STATUS_BADGE[post.review_status] || STATUS_BADGE.pending
const isSelected = selected.has(post.id)
const imgCount = post.images?.length || 0
const showActions = post.review_status === "pending"

return (<article
key={post.id}
className={`rounded-[18px] border bg-white p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] ${
isSelected? "border-[#FF7A59]/40 ring-1 ring-[#FF7A59]/20": "border-[rgba(0,0,0,0.05)]"
}`}
>
{/* Header */}
<div className="flex items-start gap-3">
{showActions && (<input
type="checkbox"
checked={isSelected}
onChange={() => toggleSelect(post.id)}
className="mt-1 size-4 shrink-0 accent-[#FF7A59]"
/>)}
<div className="flex min-w-0 flex-1 items-start gap-3">
{avatar? (<div className="relative size-10 shrink-0 rounded-full ring-2 ring-[#F0EFED]">
<Image src={avatar} alt="" fill className="rounded-full object-cover" sizes="40px" />
</div>): (<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8D5C4] to-[#8B5E46] text-[14px] font-bold text-white">
{name[0]}
</div>)}
<div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
<span className="truncate text-[14px] font-semibold text-[#111111]">{name}</span>
<span
className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
style={{ backgroundColor: badge.bg, color: badge.text }}
>
{badge.label}
</span>
{post.is_deleted && (<span className="rounded-full bg-[#6B6B6B]/10 px-2 py-0.5 text-[10px] text-[#6B6B6B]">
alreadyDelete
</span>)}
</div>
<div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[#9B9A98]">
<span>{formatTime(post.created_at)}</span>
{post.pet_type && (<>
<span> · </span>
<span>{post.pet_type === "cat"? "🐱": "🐶"} {post.breed || ""}</span>
</>)}
{post.ip_address && (<>
<span> · </span>
<span>IP: {post.ip_address}</span>
</>)}
</div>
</div>
</div>
</div>

{/* Content */}
<p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-[1.7] text-[#333333]">
{post.content}
</p>

{/* Images */}
{imgCount > 0 && (<div className="mt-3 grid gap-1.5 overflow-hidden rounded-xl" style={{ gridTemplateColumns: `repeat(${Math.min(imgCount, 3)}, 1fr)` }}>
{post.images!.slice(0, 6).map((img, i) => (<div key={i} className="relative aspect-square w-full bg-[#F7F6F3]">
<Image src={img} alt="" fill className="object-cover" sizes="200px" />
</div>))}
</div>)}

{/* Reject Reason */}
{post.review_status === "rejected" && post.reject_reason && (<div className="mt-3 rounded-[10px] bg-[#f85149]/8 px-3 py-2 text-[12.5px] text-[#f85149]">
Rejectreason:{post.reject_reason}
</div>)}

{/* Footer */}
<div className="mt-3 flex items-center justify-between border-t border-[#F0EFED] pt-3">
<div className="flex items-center gap-4 text-[12px] text-[#9B9A98]">
<span className="inline-flex items-center gap-1">
<EmojiIcon name="Heart" className="size-3" />
{post.likes_count || 0}
</span>
<span className="inline-flex items-center gap-1">
<EmojiIcon name="MessageSquare" className="size-3" />
{post.comments_count || 0}
</span>
</div>

{showActions && (<div className="flex items-center gap-2">
<button
type="button"
onClick={() => onReject(post.id)}
disabled={pending}
className="inline-flex items-center gap-1.5 rounded-full border border-[#f85149]/30 px-3.5 py-1.5 text-[12px] font-semibold text-[#f85149] transition-colors hover:bg-[#f85149]/10 disabled:opacity-40"
>
<EmojiIcon name="X" className="size-3" />
Reject
</button>
<button
type="button"
onClick={() => onApprove(post.id)}
disabled={pending}
className="inline-flex items-center gap-1.5 rounded-full bg-[#3fb950] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#37a847] disabled:opacity-40"
>
<EmojiIcon name="Check" className="size-3" />
past 
</button>
</div>)}
</div>
</article>)
})}
</div>)}

{/* Reject Dialog */}
{rejectDialog.postId || rejectDialog.batch? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
<div className="w-full max-w-[440px] overflow-hidden rounded-[20px] bg-white shadow-2xl">
<div className="flex items-center justify-between border-b border-[#EEE] px-5 py-4">
<h3 className="text-[16px] font-semibold text-[#111111]">
{rejectDialog.batch? `Reject (${selected.size})`: "RejectPost"}
</h3>
<button
onClick={() => { setRejectDialog({ postId: null, batch: false }); setRejectReason("") }}
className="flex size-8 items-center justify-center rounded-full bg-[#F5F5F5] hover:bg-[#EEE]"
>
<EmojiIcon name="X" className="size-4 text-[#6B6B6B]" />
</button>
</div>
<div className="p-5">
<p className="text-[13px] text-[#6B6B6B]">
{rejectDialog.batch? `will Reject ${selected.size} Post,pleaseRejectreason.`: "pleaseRejectreason, onUser."}
</p>
<textarea
value={rejectReason}
onChange={e => setRejectReason(e.target.value)}
placeholder="e.g.: Community,..."
rows={3}
maxLength={200}
className="mt-3 w-full resize-none rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#F7F6F3] p-3 text-[13.5px] outline-none focus:border-[#FF7A59]"
/>
<div className="mt-4 flex justify-end gap-2">
<button
type="button"
onClick={() => { setRejectDialog({ postId: null, batch: false }); setRejectReason("") }}
className="rounded-full px-4 py-2 text-[13px] text-[#6B6B6B] hover:bg-[#F7F6F3]"
>
Cancel
</button>
<button
type="button"
onClick={onConfirmReject}
disabled={pending ||!rejectReason.trim()}
className="inline-flex items-center gap-1.5 rounded-full bg-[#f85149] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#e0342a] disabled:opacity-50"
>
{pending && <EmojiIcon name="Loader2" className="size-3 animate-spin" />}
ConfirmReject
</button>
</div>
</div>
</div>
</div>): null}
</div>)
}
