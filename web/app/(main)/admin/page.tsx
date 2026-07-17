import Link from "next/link"
import { requireAdmin, getAdminStats, listReviewsForAdmin, listUsers } from "@/lib/supabase/query"
import { redirect } from "next/navigation"
import { Users, PawPrint, Package, Star, AlertTriangle, MessageSquareWarning, ChevronRight } from "lucide-react"

export const metadata = {
  title: "管理员控制台 — Nuzzly毛球镇",
}

export default async function AdminOverviewPage() {
  const { user, isAdmin } = await requireAdmin()
  if (!user) redirect("/login")
  if (!isAdmin) redirect("/dashboard")

  const [stats, recentReviews, flaggedUsers] = await Promise.all([
    getAdminStats(),
    listReviewsForAdmin({ limit: 5 }),
    listUsers({ flagged: true, limit: 5 }),
  ])

  const cards = [
    { label: "总用户", value: stats.userCount, icon: Users, href: "/admin/users", accent: "#7BA7BC" },
    { label: "总宠物档案", value: stats.petCount, icon: PawPrint, href: "/admin/users", accent: "#A8C5A0" },
    { label: "产品数", value: stats.productCount, icon: Package, href: "/admin/products", accent: "#E8A87C" },
    { label: "评价总数", value: stats.reviewCount, icon: Star, href: "/admin/reviews", accent: "#FF7A59" },
    { label: "近 7 天新评价", value: stats.reviewLast7d, icon: MessageSquareWarning, href: "/admin/reviews", accent: "#B59BD8" },
    { label: "被标记用户", value: stats.flaggedCount, icon: AlertTriangle, href: "/admin/users?flagged=1", accent: "#ff3b30" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#111111]">概览</h1>
        <p className="mt-1 text-[14px] text-[#6B6B6B]">
          欢迎回来，<span className="font-semibold text-[#111111]">{user.email}</span>。这里可以监控系统健康度与社区秩序。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group flex items-center justify-between rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5 transition-shadow hover:shadow-[0_6px_24px_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="flex size-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}
              >
                <c.icon className="size-5" />
              </div>
              <div>
                <div className="text-[24px] font-bold leading-none text-[#111111]">{c.value.toLocaleString()}</div>
                <div className="mt-1.5 text-[12.5px] text-[#6B6B6B]">{c.label}</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-[#D2D1CF] transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#111111]">最近评价</h2>
            <Link href="/admin/reviews" className="text-[12.5px] text-[#FF7A59] hover:underline">
              查看全部
            </Link>
          </div>
          {recentReviews.data && recentReviews.data.length > 0 ? (
            <ul className="flex flex-col divide-y divide-[#F0EFED]">
              {recentReviews.data.map((r: {
                id: string
                overall_rating: number | null
                review_text: string | null
                created_at: string
                profiles: { username: string; display_name: string | null; is_flagged: boolean | null } | null
                products: { name: string } | null
              }) => (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FF7A59]/10 text-[12px] font-bold text-[#FF7A59]">
                    {r.overall_rating ?? "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-[#111111]">
                      {r.products?.name ?? "—"}
                    </p>
                    <p className="line-clamp-1 text-[12.5px] text-[#6B6B6B]">
                      {r.review_text ?? "（无内容）"}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[#D2D1CF]">
                      @{r.profiles?.username ?? "未知"} · {new Date(r.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-[#6B6B6B]">暂无最近评价</p>
          )}
        </section>

        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#111111]">被标记用户</h2>
            <Link href="/admin/users?flagged=1" className="text-[12.5px] text-[#FF7A59] hover:underline">
              管理
            </Link>
          </div>
          {flaggedUsers.data && flaggedUsers.data.length > 0 ? (
            <ul className="flex flex-col divide-y divide-[#F0EFED]">
              {flaggedUsers.data.map((u: {
                id: string
                username: string
                display_name: string | null
                trust_score: number | null
                flag_reason: string | null
              }) => (
                <li key={u.id} className="flex items-center gap-3 py-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#ff3b30]/10 text-[11px] font-bold text-[#ff3b30]">
                    {(u.display_name ?? u.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-[#111111]">
                      {u.display_name ?? u.username}
                    </p>
                    <p className="line-clamp-1 text-[12px] text-[#ff3b30]">
                      {u.flag_reason ?? "已标记"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[11px] text-[#ff3b30]">
                    信任分 {u.trust_score ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[#A8C5A0]/15 text-[#A8C5A0]">
                <AlertTriangle className="size-5" />
              </div>
              <p className="text-[13px] text-[#6B6B6B]">社区秩序良好，暂无被标记用户</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
