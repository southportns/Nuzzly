import { EmojiIcon } from "@/components/ui/emoji-icon"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/query"
import { getAttachments } from "@/lib/supabase/queries/attachment-queries"
import { AttachmentsList } from "@/components/dashboard/attachments-list"
import { UploadButton } from "@/components/dashboard/upload-button"

export default async function AttachmentsPage() {
const { data: { user } } = await getUser()
if (!user) redirect("/login")

const supabase = await createClient()

// 获取User 第aonly Pet
const { data: pets } = await supabase.from("pets").select("id, name").eq("profile_id", user.id).eq("is_active", true).order("created_at").limit(1)

const petId = pets?.[0]?.id

// 获取Attachment
const attachments = petId? await getAttachments(petId): []

// Statistics
const images = attachments.filter(a => a.file_type?.startsWith("image/"))
const documents = attachments.filter(a => a.file_type === "application/pdf")
const others = attachments.filter(a =>!a.file_type?.startsWith("image/") && a.file_type!== "application/pdf")

// 计算Total Size
const totalSize = attachments.reduce((sum, a) => sum + (a.file_size || 0), 0)
const formatSize = (bytes: number) => {
if (bytes < 1024) return bytes + " B"
if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

return (<div className="space-y-6">
{/* Header */}
<div className="flex items-center justify-between">
<div>
<h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
Pet Attachments
</h1>
<p className="mt-2 text-[14px] text-[#6B6B6B]">Manage your pet photos,medical documents and other attachments</p>
</div>
<UploadButton petId={petId?? null} />
</div>

{/* Stats */}
<div className="grid grid-cols-4 gap-4">
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<EmojiIcon name="Paperclip" className="size-4 text-[#FF7A59]" />
<span className="text-[12px] text-[#6B6B6B]">All</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{attachments.length}</span>
</div>
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<EmojiIcon name="Image" className="size-4 text-[#585858]" />
<span className="text-[12px] text-[#6B6B6B]">Images</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{images.length}</span>
</div>
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<EmojiIcon name="FileText" className="size-4 text-[#6B6B6B]" />
<span className="text-[12px] text-[#6B6B6B]">Documents</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{documents.length}</span>
</div>
<div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-4">
<div className="flex items-center gap-2 mb-2">
<span className="text-[12px] text-[#6B6B6B]">Total Size</span>
</div>
<span className="text-[24px] font-semibold text-[#111111]">{formatSize(totalSize)}</span>
</div>
</div>

{/* Attachments List */}
<section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
<div className="flex items-center gap-2 mb-4">
<EmojiIcon name="Paperclip" className="size-5 text-[#FF7A59]" />
<span className="text-[15px] font-semibold text-[#111111]">All Attachments</span>
</div>

{attachments && attachments.length > 0? (<AttachmentsList attachments={attachments} />): (<div className="py-12 text-center">
<EmojiIcon name="Upload" className="mx-auto mb-3 size-12 text-[#e0e0e0]" />
<p className="text-[14px] text-[#6B6B6B]">No attachments</p>
<p className="mt-1 text-[12px] text-[#999]">Click the button above to upload your first file</p>
</div>)}
</section>
</div>)
}
