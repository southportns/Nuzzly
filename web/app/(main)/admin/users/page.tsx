import { EmojiIcon } from "@/components/ui/emoji-icon"
import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAdmin, listUsers } from "@/lib/supabase/query"
import { UserRowActions } from "@/components/admin/user-row-actions"

export const metadata = {
title: "User Management — Nuzzly Town Admin",
}

type SearchParams = Promise<{
search?: string
flagged?: string
}>

export default async function AdminUsersPage({
searchParams,
}: {
searchParams: SearchParams
}) {
const { user, isAdmin } = await requireAdmin()
if (!user) redirect("/login")
if (!isAdmin) redirect("/dashboard")

const sp = await searchParams
const search = sp.search?.trim()?? ""
const flaggedOnly = sp.flagged === "1"

const { data: usersRaw, error } = await listUsers({
search: search || undefined,
flagged: flaggedOnly,
limit: 200,
})
const users = (usersRaw?? []) as Array<{
id: string
username: string
display_name: string | null
trust_score: number | null
review_count: number | null
is_admin: boolean | null
is_flagged: boolean | null
flag_reason: string | null
created_at: string
}>

return (<div className="flex flex-col gap-6">
<div className="flex items-end justify-between gap-4">
<div>
<h1 className="text-[26px] font-bold tracking-tight text-[#111111]">User Management</h1>
<p className="mt-1 text-[14px] text-[#6B6B6B]">
{users?.length?? 0} users{flaggedOnly? "(showing flagged only)": ""}
</p>
</div>
</div>

{/* Filter bar */}
<form className="flex flex-wrap items-center gap-3 rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-3">
<label className="flex flex-1 items-center gap-2 rounded-full bg-[#F7F6F3] px-4 py-2.5">
<EmojiIcon name="Search" className="size-4 text-[#9B9A98]" />
<input
name="search"
defaultValue={search}
placeholder="SearchUsername / Nickname"
className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9B9A98]"
/>
</label>
<label className="flex items-center gap-2 text-[13px] text-[#444444]">
<input
type="checkbox"
name="flagged"
value="1"
defaultChecked={flaggedOnly}
className="size-4 accent-[#FF7A59]"
/>
showing flagged only
</label>
<button
type="submit"
className="rounded-full bg-[#111111] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#333]"
>
Filter
</button>
{(search || flaggedOnly) && (<Link
href="/admin/users"
className="rounded-full px-3 py-2 text-[13px] text-[#6B6B6B] hover:text-[#111111]"
>
Clear
</Link>)}
</form>

{error && (<div className="rounded-[14px] border border-[#ff3b30]/30 bg-[#ff3b30]/8 p-4 text-[13px] text-[#ff3b30]">
failed to load:{error.message}
</div>)}

<div className="overflow-hidden rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white">
<table className="w-full table-fixed text-left text-[13.5px]">
<colgroup>
<col className="w-[26%]" />
<col className="w-[12%]" />
<col className="w-[12%]" />
<col className="w-[14%]" />
<col className="w-[16%]" />
<col className="w-[20%]" />
</colgroup>
<thead className="bg-[#F7F6F3] text-[12px] uppercase tracking-wider text-[#6B6B6B]">
<tr>
<th className="px-4 py-3 font-semibold">User</th>
<th className="px-4 py-3 font-semibold">Trust Score</th>
<th className="px-4 py-3 font-semibold">Reviews</th>
<th className="px-4 py-3 font-semibold">Status</th>
<th className="px-4 py-3 font-semibold">Sign UpTime</th>
<th className="px-4 py-3 text-right font-semibold">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-[#F0EFED]">
{users && users.length > 0? (users.map((u) => (<tr key={u.id} className="transition-colors hover:bg-[#FBFAF8]">
<td className="px-4 py-3">
<div className="flex items-center gap-2.5">
<div className="flex size-8 items-center justify-center rounded-full bg-[#F0EFED] text-[12px] font-semibold text-[#444444]">
{(u.display_name?? u.username).charAt(0).toUpperCase()}
</div>
<div className="min-w-0">
<p className="truncate text-[13.5px] font-semibold text-[#111111]">
{u.display_name?? u.username}
</p>
<p className="text-[11.5px] text-[#9B9A98]">@{u.username}</p>
</div>
</div>
</td>
<td className="px-4 py-3 text-[#444444]">{u.trust_score?? 0}</td>
<td className="px-4 py-3 text-[#444444]">{u.review_count?? 0}</td>
<td className="px-4 py-3">
<div className="flex flex-col gap-1">
{u.is_admin? (<span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#7BA7BC]/14 px-2 py-0.5 text-[11px] font-semibold text-[#4A7A91]">
Admin
</span>): null}
{u.is_flagged? (<span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[11px] font-semibold text-[#ff3b30]">
Flagged
</span>): (<span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#A8C5A0]/14 px-2 py-0.5 text-[11px] text-[#5C7C56]">
Normal
</span>)}
</div>
</td>
<td className="px-4 py-3 text-[12.5px] text-[#6B6B6B]">
{new Date(u.created_at).toLocaleDateString("en-US")}
</td>
<td className="px-4 py-3">
<UserRowActions
userId={u.id}
username={u.username}
isFlagged={!!u.is_flagged}
isAdmin={!!u.is_admin}
flagReason={u.flag_reason?? null}
/>
</td>
</tr>))): (<tr>
<td colSpan={6} className="px-4 py-12 text-center text-[14px] text-[#6B6B6B]">
No matching User
</td>
</tr>)}
</tbody>
</table>
</div>
</div>)
}
