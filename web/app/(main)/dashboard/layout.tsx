import { redirect } from "next/navigation"
import { getUser, queryProfile } from "@/lib/supabase/query"
import { DashboardSidebar, DashboardMobileNav } from "@/components/dashboard/dashboard-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const { data: profile } = await queryProfile(user.id)

  const displayName =
    (profile as { display_name?: string | null } | null)?.display_name ??
    (profile as { full_name?: string | null } | null)?.full_name ??
    ""
  const username =
    (profile as { username?: string | null } | null)?.username ?? ""
  const trustScore = (profile as { trust_score?: number | null } | null)?.trust_score ?? 0

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F7F6F3]">
      <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-10 md:px-10">
        <DashboardSidebar
          displayName={displayName}
          username={username}
          trustScore={trustScore}
          email={user.email}
        />

        <DashboardMobileNav />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
