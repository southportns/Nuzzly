import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"

export default function SettingsSubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6B6B6B] transition-colors hover:text-[#111111]"
      >
        <EmojiIcon name="ArrowLeft" className="size-4" />
        返回设置
      </Link>
      {children}
    </div>
  )
}
