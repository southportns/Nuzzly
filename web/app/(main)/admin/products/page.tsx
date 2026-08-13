import { EmojiIcon } from "@/components/ui/emoji-icon"
import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAdmin, listProductsForAdmin } from "@/lib/supabase/query"

export const metadata = {
title: "ProductManagement — Nuzzly Town Admin",
}

type SearchParams = Promise<{ search?: string }>

export default async function AdminProductsPage({
searchParams,
}: {
searchParams: SearchParams
}) {
const { user, isAdmin } = await requireAdmin()
if (!user) redirect("/login")
if (!isAdmin) redirect("/dashboard")

const sp = await searchParams
const search = sp.search?.trim()?? ""

const { data: productsRaw, error } = await listProductsForAdmin({
search: search || undefined,
limit: 200,
})
const products = (productsRaw?? []) as Array<{ id: string; name: string; created_at: string; product_categories?: { name: string } | null }>

return (<div className="flex flex-col gap-6">
<div>
<h1 className="text-[26px] font-bold tracking-tight text-[#111111]">ProductManagement</h1>
<p className="mt-1 text-[14px] text-[#6B6B6B]"> {products?.length?? 0} products</p>
</div>

<form className="flex items-center gap-3 rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-3">
<label className="flex flex-1 items-center gap-2 rounded-full bg-[#F7F6F3] px-4 py-2.5">
<EmojiIcon name="Search" className="size-4 text-[#9B9A98]" />
<input
name="search"
defaultValue={search}
placeholder="Search product name"
className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9B9A98]"
/>
</label>
<button
type="submit"
className="rounded-full bg-[#111111] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#333]"
>
Search
</button>
{search && (<Link href="/admin/products" className="rounded-full px-3 py-2 text-[13px] text-[#6B6B6B] hover:text-[#111111]">
Clear
</Link>)}
</form>

{error && (<div className="rounded-[14px] border border-[#ff3b30]/30 bg-[#ff3b30]/8 p-4 text-[13px] text-[#ff3b30]">
failed to load:{error.message}
</div>)}

<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
{products && products.length > 0? (products.map((p) => {
// joined categories (single object under product_categories)
const category = p.product_categories
return (<Link
key={p.id}
href={`/products/${p.id}`}
target="_blank"
className="group flex items-center justify-between rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white p-4 transition-shadow hover:shadow-[0_6px_24px_rgba(0,0,0,0.05)]"
>
<div className="min-w-0">
<p className="truncate text-[14px] font-semibold text-[#111111]">{p.name}</p>
<p className="mt-0.5 text-[12px] text-[#6B6B6B]">
{category?.name?? "—"} · {new Date(p.created_at).toLocaleDateString("en-US")}
</p>
</div>
<EmojiIcon name="ChevronRight" className="size-4 shrink-0 text-[#D2D1CF] transition-transform group-hover:translate-x-0.5" />
</Link>)
})): (<div className="col-span-full rounded-[18px] border border-dashed border-[rgba(0,0,0,0.08)] p-12 text-center text-[14px] text-[#6B6B6B]">
No matching Product
</div>)}
</div>
</div>)
}
