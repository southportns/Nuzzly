import { redirect } from "next/navigation"
import { requireAdmin, listCommunityPostsForAdmin, getCommunityStats } from "@/lib/supabase/query"
import type { CommunityReviewStatus } from "@/lib/supabase/queries/admin-queries"
import { CommunityModeration } from "@/components/admin/community-moderation"

export const metadata = {
title: "CommunityReview — Nuzzly Town Admin",
}

type SearchParams = Promise<{
status?: string
}>

const VALID_STATUSES: CommunityReviewStatus[] = ["pending", "approved", "rejected", "auto_approved"]

export default async function AdminCommunityPage({ searchParams }: { searchParams: SearchParams }) {
const { user, isAdmin } = await requireAdmin()
if (!user) redirect("/login")
if (!isAdmin) redirect("/dashboard")

const sp = await searchParams
const statusParam = sp.status
const status: CommunityReviewStatus | "all" =
statusParam && VALID_STATUSES.includes(statusParam as CommunityReviewStatus)? (statusParam as CommunityReviewStatus): "all"

const [stats, { data: posts, error }] = await Promise.all([
getCommunityStats(),
listCommunityPostsForAdmin({
status: status === "all"? undefined: status,
limit: 200,
}),
])

return (<div className="flex flex-col gap-6">
<div>
<h1 className="text-[26px] font-bold tracking-tight text-[#111111]">CommunityReview</h1>
<p className="mt-1 text-[14px] text-[#6B6B6B]">
Review community posts,manage reports,maintain community order
</p>
</div>

{error && (<div className="rounded-[14px] border border-[#ff3b30]/30 bg-[#ff3b30]/8 p-4 text-[13px] text-[#ff3b30]">
failed to load:{error.message}
</div>)}

<CommunityModeration
posts={posts?? []}
initialStatus={status}
stats={stats}
/>
</div>)
}
