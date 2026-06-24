import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/lib/supabase/query"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Package,
  MessageSquareWarning,
  Shield,
  ChevronLeft,
} from "lucide-react"

const adminNavItems = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/products", label: "产品管理", icon: Package },
  { href: "/admin/reviews", label: "评价审核", icon: MessageSquareWarning },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin } = await requireAdmin()

  if (!user) redirect("/login")
  if (!isAdmin) redirect("/dashboard")

  return (
    <div className="bg-[#F7F6F3]">
      <div className="mx-auto flex w-full max-w-[1440px] gap-8 px-6 py-10 md:px-12">
        {/* Admin sidebar */}
        <aside className="sticky top-[88px] hidden h-fit w-[220px] shrink-0 md:block">
          <div className="mb-4 flex items-center gap-2 rounded-[16px] border border-[#7BA7BC]/25 bg-[#7BA7BC]/8 px-3 py-2.5">
            <Shield className="size-4 text-[#4A7A91]" />
            <span className="text-[12px] font-semibold text-[#4A7A91]">管理员控制台</span>
          </div>

          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1 text-[12px] text-[#6B6B6B] transition-colors hover:text-[#111111]"
          >
            <ChevronLeft className="size-3" />
            返回个人中心
          </Link>

          <nav className="flex flex-col gap-1 rounded-[18px] border border-[rgba(0,0,0,0.05)] bg-white p-2">
            {adminNavItems.map((item) => (
              <AdminNavLink key={item.href} item={item} />
            ))}
          </nav>
        </aside>

        {/* Mobile horizontal nav */}
        <nav className="sticky top-[72px] z-30 -mx-6 mb-4 flex w-[calc(100%+3rem)] gap-1 overflow-x-auto border-b border-[rgba(0,0,0,0.05)] bg-[#F7F6F3]/80 px-6 py-2 backdrop-blur md:hidden">
          {adminNavItems.map((item) => (
            <AdminNavLink key={item.href} item={item} compact />
          ))}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

function AdminNavLink({
  item,
  compact,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
  compact?: boolean
}) {
  // We avoid usePathname in a server component; rely on the page-level active styling.
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-[12px] text-[14px] font-medium text-[#444444] transition-colors hover:bg-[#F0EFED] hover:text-[#111111]",
        compact ? "shrink-0 px-3 py-1.5" : "px-3 py-2.5"
      )}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  )
}
