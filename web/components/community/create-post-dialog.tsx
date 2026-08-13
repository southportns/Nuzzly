"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { preprocessImage } from "@/lib/image"
import { openLoginModal } from "@/hooks/use-login-modal"
import { toast } from "sonner"
import type { User } from "@supabase/supabase-js"
import { useTranslations } from "next-intl"

interface CreatePostDialogProps {
open: boolean
onOpenChange: (open: boolean) => void
user: User | null
onPosted: () => void
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
const ALL_MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES].join(",")
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

interface MediaFile {
file: File
type: "image" | "video"
previewUrl: string
}

export function CreatePostDialog({ open, onOpenChange, user, onPosted }: CreatePostDialogProps) {
const t = useTranslations("Community")
const [content, setContent] = useState("")
const [petType, setPetType] = useState("")
const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
const [agreed, setAgreed] = useState(false)
const [submitting, setSubmitting] = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)

const PET_TYPES = useMemo(() => [
{ value: "", label: t("petTypeAll") },
{ value: "cat", label: t("petTypeCat") },
{ value: "dog", label: t("petTypeDog") },
], [t])

useEffect(() => {
if (open) return
const timer = setTimeout(() => {
setContent("")
setPetType("")
mediaFiles.forEach(m => URL.revokeObjectURL(m.previewUrl))
setMediaFiles([])
setAgreed(false)
}, 200)
return () => clearTimeout(timer)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open])

function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
const files = Array.from(e.target.files || [])
const remaining = 9 - mediaFiles.length
const valid = files.slice(0, remaining).filter(f => {
const isImage = IMAGE_TYPES.includes(f.type)
const isVideo = VIDEO_TYPES.includes(f.type)
if (!isImage && !isVideo) {
toast.warning(t("mediaFormatInvalid"))
return false
}
if (isImage && f.size > MAX_IMAGE_SIZE) {
toast.warning(t("imageMaxSize"))
return false
}
if (isVideo && f.size > MAX_VIDEO_SIZE) {
toast.warning(t("videoMaxSize"))
return false
}
return true
})
if (valid.length > 0) {
const newMedia: MediaFile[] = valid.map(f => ({
file: f,
type: IMAGE_TYPES.includes(f.type) ? "image" : "video",
previewUrl: URL.createObjectURL(f),
}))
setMediaFiles(prev => [...prev, ...newMedia])
}
e.target.value = ""
}

function removeMedia(index: number) {
URL.revokeObjectURL(mediaFiles[index].previewUrl)
setMediaFiles(prev => prev.filter((_, i) => i !== index))
}

async function handleSubmit() {
if (submitting) return
if (!user) {
openLoginModal()
return
}
if (!content.trim()) {
toast.warning(t("contentRequired"))
return
}
if (!agreed) {
toast.warning(t("agreeFirst"))
return
}

setSubmitting(true)
const supabase = createClient()

try {
const auditRes = await fetch("/api/community/audit", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ content }),
})
const auditData = await auditRes.json().catch(() => ({}))
if (!auditRes.ok || auditData.passed === false) {
toast.error(auditData.reason || auditData.error || t("auditFailed"))
setSubmitting(false)
return
}

const auditToken = auditData.audit_token
const clientIp = auditData.client_ip
if (!auditToken) {
toast.error(t("auditRetry"))
setSubmitting(false)
return
}

const mediaUrls: string[] = []
for (const media of mediaFiles) {
try {
let uploadFile: File = media.file
let contentType: string = media.file.type

if (media.type === "image") {
const processed = await preprocessImage(media.file, {
maxWidth: 1280,
maxHeight: 1280,
quality: 0.85,
type: media.file.type === "image/png" ? "image/png" : "image/jpeg",
})
uploadFile = processed
contentType = processed.type
}

const ext = media.type === "video" ? (media.file.name.split(".").pop() || "mp4") : (contentType === "image/png" ? "png" : "jpg")
const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
const { data: uploadData, error: uploadErr } = await supabase.storage.from("community-posts").upload(path, uploadFile, { contentType, upsert: false })
if (uploadErr) {
console.warn("[create-post] Upload failed:", uploadErr.message)
continue
}
const { data: urlData } = supabase.storage.from("community-posts").getPublicUrl(uploadData.path)
mediaUrls.push(urlData.publicUrl)
} catch (processErr) {
console.warn("[create-post] Processing failed:", processErr)
}
}

const { error } = await supabase.rpc("create_community_post", {
p_content: content,
p_images: mediaUrls,
p_pet_type: petType || null,
p_breed: null,
p_audit_token: auditToken,
p_ip_address: clientIp,
} as never)

if (error) {
toast.error(error.message || t("publishFailed"))
setSubmitting(false)
return
}

toast.success(t("publishSuccess"))
onOpenChange(false)
onPosted()
} catch (err) {
toast.error(err instanceof Error ? err.message : t("publishFailed"))
} finally {
setSubmitting(false)
}
}

if (!open) return null

return (<div
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
<EmojiIcon name="X" className="size-4 text-[#6B6B6B]" />
</button>
<span className="text-[16px] font-semibold text-[#1A1A1A]">{t("publishActivity")}</span>
<button
onClick={handleSubmit}
disabled={!content.trim() || submitting}
className="rounded-full bg-[#8B5E46] px-4 py-1.5 text-[14px] font-medium text-white transition-colors hover:bg-[#7A523D] disabled:opacity-40"
>
{submitting ? t("publishing") : t("publish")}
</button>
</div>

{/* body */}
<div className="flex-1 overflow-y-auto p-5">
<textarea
value={content}
onChange={e => setContent(e.target.value)}
placeholder={t("shareExperience")}
maxLength={2000}
rows={5}
className="w-full resize-none outline-none text-[14px] leading-relaxed text-[#1A1A1A] placeholder:text-[#AAA]"
/>
<div className="text-right text-[12px] text-[#AAA]">{content.length}/2000</div>

{/* Preview */}
{mediaFiles.length > 0 ? (<div className="mt-3 grid grid-cols-3 gap-2">
{mediaFiles.map((media, i) => (<div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-black">
{media.type === "video" ? (<video
src={media.previewUrl}
className="size-full object-cover"
muted
playsInline
/>) : (<img src={media.previewUrl} alt="" className="size-full object-cover" />)}
{media.type === "video" && (<div className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50">
<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white">
<polygon points="5 3 19 12 5 21 5 3" />
</svg>
</div>)}
<button
onClick={() => removeMedia(i)}
className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/50"
>
<EmojiIcon name="X" className="size-3 text-white" />
</button>
</div>))}
{mediaFiles.length < 9 && (<button
onClick={() => fileInputRef.current?.click()}
className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#E0E0E0] hover:border-[#8B5E46]"
>
<EmojiIcon name="ImagePlus" className="size-6 text-[#BBB]" />
</button>)}
</div>) : (<button
onClick={() => fileInputRef.current?.click()}
className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#E0E0E0] px-4 py-3 text-[13px] text-[#999] hover:border-[#8B5E46]"
>
<EmojiIcon name="ImagePlus" className="size-5" />
<span>{t("addMedia")}</span>
</button>)}
<input
ref={fileInputRef}
type="file"
accept={ALL_MEDIA_TYPES}
multiple
className="hidden"
onChange={handleFileSelect}
/>

{/* Pet Type */}
<div className="mt-5">
<div className="mb-2 text-[13px] text-[#888]">{t("petTypeOptional")}</div>
<div className="flex gap-2">
{PET_TYPES.map(pt => (<button
key={pt.value}
onClick={() => setPetType(pt.value)}
className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
petType === pt.value ? "bg-[#8B5E46] text-white" : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EEE]"
}`}
>
{pt.label}
</button>))}
</div>
</div>

{/* Agreement */}
<label className="mt-5 flex cursor-pointer items-start gap-2 text-[12px] text-[#888]">
<input
type="checkbox"
checked={agreed}
onChange={e => setAgreed(e.target.checked)}
className="mt-0.5 accent-[#8B5E46]"
/>
<span>{t("agreeCommunityRules")}</span>
</label>
</div>
</div>
</div>)
}

export default CreatePostDialog
