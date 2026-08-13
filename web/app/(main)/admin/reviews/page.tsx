import { EmojiIcon } from "@/components/ui/emoji-icon"
import { redirect } from "next/navigation"
import { requireAdmin, listReviewsForAdmin } from "@/lib/supabase/query"
import Link from "next/link"

export const metadata = {
title: "ReviewReview — Nuzzly Town Admin",
}

export default async function AdminReviewsPage() {
const { user, isAdmin } = await requireAdmin()
if (!user) redirect("/login")
if (!isAdmin) redirect("/dashboard")

const { data: reviewsRaw, error } = await listReviewsForAdmin({ limit: 200 })
const reviews = (reviewsRaw?? []) as Array<{
id: string
overall_rating: number
content: string | null
review_text: string | null
usage_duration: string | null
product_id: string
created_at: string
profiles?: { username: string; display_name: string | null; is_flagged: boolean | null } | null
products?: { name: string } | null
}>

return (<div className="flex flex-col gap-6">
<div>
<h1 className="text-[26px] font-bold tracking-tight text-[#111111]">ReviewReview</h1>
<p className="mt-1 text-[14px] text-[#6B6B6B]">
{reviews?.length?? 0} reviews · sorted by time desc
</p>
</div>

{error && (<div className="rounded-[14px] border border-[#ff3b30]/30 bg-[#ff3b30]/8 p-4 text-[13px] text-[#ff3b30]">
failed to load:{error.message}
</div>)}

<div className="flex flex-col gap-3">
{reviews && reviews.length > 0? (reviews.map((r) => {
const author = r.profiles
const product = r.products
return (<article
key={r.id}
className="rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white p-5"
>
<header className="flex items-center justify-between gap-3">
<div className="flex min-w-0 items-center gap-3">
<div className="flex size-9 items-center justify-center rounded-xl bg-[#FF7A59]/10 text-[14px] font-bold text-[#FF7A59]">
{r.overall_rating}
</div>
<div className="min-w-0">
<p className="truncate text-[14px] font-semibold text-[#111111]">
{product?.name?? "—"}
</p>
<p className="text-[12px] text-[#6B6B6B]">
@{author?.username?? "Unknown"} · used {r.usage_duration} · {" "}
{new Date(r.created_at).toLocaleString("en-US")}
</p>
</div>
</div>
<div className="flex items-center gap-2">
{author?.is_flagged? (<span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[11px] font-semibold text-[#ff3b30]">
Author flagged
</span>): null}
{r.overall_rating!= null && r.overall_rating <= 2? (<span className="rounded-full bg-[#ff9500]/12 px-2 py-0.5 text-[11px] font-semibold text-[#b67300]">
Low score alert
</span>): null}
</div>
</header>
{r.review_text && (<p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.7] text-[#444444]">
{r.review_text}
</p>)}
<footer className="mt-3 flex items-center justify-end">
<Link
href={`/products/${r.product_id}`}
target="_blank"
className="inline-flex items-center gap-1 text-[12.5px] text-[#FF7A59] hover:underline"
>
ViewProduct <EmojiIcon name="ChevronRight" className="size-3" />
</Link>
</footer>
</article>)
})): (<div className="rounded-[18px] border border-dashed border-[rgba(0,0,0,0.08)] p-12 text-center text-[14px] text-[#6B6B6B]">
NoReview
</div>)}
</div>
</div>)
}
