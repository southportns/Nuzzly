"use client"

import { useState } from "react"
import { Image, FileText, Download, Trash2, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  category: string
  created_at: string
}

interface Props {
  attachments: Attachment[]
}

const categoryLabels: Record<string, { label: string; color: string; bg: string }> = {
  photo: { label: "照片", color: "text-[#007AFF]", bg: "bg-[#007AFF]/10" },
  medical: { label: "医疗", color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
  vaccine: { label: "疫苗", color: "text-[#AF52DE]", bg: "bg-[#AF52DE]/10" },
  document: { label: "证件", color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
  other: { label: "其他", color: "text-[#6B6B6B]", bg: "bg-[#6B6B6B]/10" },
}

export function AttachmentsList({ attachments }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function formatSize(bytes: number | null) {
    if (bytes == null) return ""
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  function isImage(type: string | null) {
    return type?.startsWith("image/")
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这个附件吗？")) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/attachments/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("删除失败")

      toast.success("附件已删除")
      window.location.reload()
    } catch (error) {
      toast.error("删除失败，请重试")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {attachments.map((attachment) => {
        const isDeleting = deletingId === attachment.id
        const category = categoryLabels[attachment.category] || categoryLabels.other

        return (
          <div
            key={attachment.id}
            className="group relative overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.05)] bg-[#F7F6F3]"
          >
            {/* Preview */}
            {isImage(attachment.file_type) ? (
              <div className="aspect-square bg-[#E8E8E8]">
                <img
                  src={attachment.file_url}
                  alt={attachment.file_name}
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-[#E8E8E8]">
                <FileText className="size-12 text-[#999]" />
              </div>
            )}

            {/* Actions (on hover) */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <a
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white p-2 text-[#111111] hover:bg-[#F7F6F3]"
              >
                <Eye className="size-4" />
              </a>
              <a
                href={attachment.file_url}
                download={attachment.file_name}
                className="rounded-full bg-white p-2 text-[#111111] hover:bg-[#F7F6F3]"
              >
                <Download className="size-4" />
              </a>
              <button
                onClick={() => handleDelete(attachment.id)}
                disabled={isDeleting}
                className="rounded-full bg-white p-2 text-[#ff3b30] hover:bg-[#F7F6F3]"
              >
                {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>

            {/* Info */}
            <div className="p-2">
              <p className="truncate text-[12px] text-[#111111]">{attachment.file_name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${category.color} ${category.bg}`}>
                  {category.label}
                </span>
                <span className="text-[10px] text-[#999]">{formatSize(attachment.file_size)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
