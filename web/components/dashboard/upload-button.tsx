"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useRef } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface Props {
petId: string | null
}

export function UploadButton({ petId }: Props) {
const t = useTranslations("Common")
const [uploading, setUploading] = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)

async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
const file = e.target.files?.[0]
if (!file || !petId) return

setUploading(true)

try {
const formData = new FormData()
formData.append("file", file)
formData.append("pet_id", petId)
formData.append("category", "other")

const response = await fetch("/api/attachments/upload", {
method: "POST",
body: formData,
})

if (!response.ok) throw new Error("upload failed")

toast.success(t("uploadSuccess"))
window.location.reload()
} catch {
toast.error(t("uploadFailed"))
} finally {
setUploading(false)
if (fileInputRef.current) {
fileInputRef.current.value = ""
}
}
}

return (<>
<input
ref={fileInputRef}
type="file"
accept="image/*,.pdf,.doc,.docx"
onChange={handleUpload}
className="hidden"
/>
<button
onClick={() => fileInputRef.current?.click()}
disabled={uploading || !petId}
className="flex items-center gap-2 rounded-full bg-[#FF7A59] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#FF6A49] disabled:opacity-50"
>
{uploading ? (<EmojiIcon name="Loader2" className="size-4 animate-spin" />) : (<EmojiIcon name="Upload" className="size-4" />)}
{t("fileUpload")}
</button>
</>)
}
