import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { SettingsCard } from "@/components/settings/settings-card"

export default function ContentSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          My Content
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">Manage your posts and bookmarks</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/followups"
            className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
          >
            <span className="text-[15px] text-[#111111]">My Reviews</span>
          </Link>
          <Link
            href="/dashboard/followups"
            className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
          >
            <span className="text-[15px] text-[#111111]">Long-term Tracking</span>
          </Link>
          <Link
            href="/dashboard/bookmarks"
            className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
          >
            <span className="text-[15px] text-[#111111]">Bookmarked Products</span>
          </Link>
        </div>
      </SettingsCard>
    </div>
  )
}
