import { CommunityFeed } from "@/components/community/community-feed"

export const metadata = {
  title: "社区 - Nuzzly毛球镇",
}

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <CommunityFeed />
    </div>
  )
}
