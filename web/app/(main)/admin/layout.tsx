import { EmojiIcon } from "@/components/ui/emoji-icon"
import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/lib/supabase/query"
import { cn } from "@/lib/utils"

const adminNavItems = [
{ href: "/admin", label: "Overview", iconName: "LayoutDashboard" },
{ href: "/admin/community", label: "CommunityReview", iconName: "MessageSquare" },
{ href: "/admin/users", label: "User Management", iconName: "Users" },
{ href: "/admin/products", label: "ProductManagement", iconName: "Package" },
{ href: "/admin/reviews", label: "ReviewReview", iconName: "MessageSquareWarning" },
{ href: "/admin/outcomes-dashboard", label: "Outcomes Dashboard", iconName: "BarChart3" },
]

export default async function AdminLayout({
children,
}: {
children: React.ReactNode
}) {
const { user, isAdmin } = await requireAdmin()

if (!user) redirect("/login")
if (!isAdmin) redirect("/dashboard")

return (<div className="bg-[#F7F6F3]">
<div className="mx-auto flex w-full max-w-[1440px] gap-8 px-6 py-10 md:px-12">
{/* Admin sidebar */}
<aside className="sticky top-[88px] hidden h-fit w-[220px] shrink-0 md:block">
<div className="mb-4 flex items-center gap-2 rounded-[16px] border border-[#7BA7BC]/25 bg-[#7BA7BC]/8 px-3 py-2.5">
<EmojiIcon name="Shield" className="size-4 text-[#4A7A91]" />
<span className="text-[12px] font-semibold text-[#4A7A91]">Admin Console</span>
</div>

<Link
href="/dashboard"
className="mb-3 inline-flex items-center gap-1 text-[12px] text-[#6B6B6B] transition-colors hover:text-[#111111]"
>
<EmojiIcon name="ChevronLeft" className="size-3" />
return to Dashboard
</Link>

<nav className="flex flex-col gap-1 rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white p-2">
{adminNavItems.map((item) => (<AdminNavLink key={item.href} item={item} />))}
</nav>
</aside>

{/* Mobile horizontal nav */}
<nav className="sticky top-[72px] z-30 -mx-6 mb-4 flex w-[calc(100%+3rem)] gap-1 overflow-x-auto border-b border-[rgba(0,0,0,0.05)] bg-[#F7F6F3]/80 px-6 py-2 backdrop-blur md:hidden">
{adminNavItems.map((item) => (<AdminNavLink key={item.href} item={item} compact />))}
</nav>

<main className="min-w-0 flex-1">{children}</main>
</div>
</div>)
}

function AdminNavLink({
item,
compact,
}: {
item: { href: string; label: string; iconName: string }
compact?: boolean
}) {
// We avoid usePathname in a server component; rely on the page-level active styling.
return (<Link
href={item.href}
className={cn("flex items-center gap-2.5 rounded-[12px] text-[14px] font-medium text-[#444444] transition-colors hover:bg-[#F0EFED] hover:text-[#111111]",
compact? "shrink-0 px-3 py-1.5": "px-3 py-2.5")}
>
<EmojiIcon name={item.iconName} className="size-4" />
{item.label}
</Link>)
}
