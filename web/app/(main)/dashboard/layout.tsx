import { redirect } from "next/navigation"
import { getUser, queryProfile } from "@/lib/supabase/query"
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const { data: profile } = await queryProfile(user.id)

  const username =
    (profile as { username?: string | null } | null)?.username ?? ""
  const trustScore = (profile as { trust_score?: number | null } | null)?.trust_score ?? 0
  const avatarUrl =
    (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null
  const userNumber =
    (profile as { user_number?: string | number | null } | null)?.user_number ?? null

  return (
    <DashboardLayoutClient
      userId={user.id}
      username={username}
      trustScore={trustScore}
      email={user.email}
      avatarUrl={avatarUrl}
      userNumber={userNumber ? String(userNumber) : null}
    >
      {children}
    </DashboardLayoutClient>
  )
}
