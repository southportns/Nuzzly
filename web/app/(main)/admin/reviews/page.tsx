import { redirect } from "next/navigation"
import { requireAdmin, listReviewsForAdmin } from "@/lib/supabase/query"
import { Star, ChevronRight } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "评价审核 — PetRWD 管理员",
}

export default async function AdminReviewsPage() {
  const { user, isAdmin } = await requireAdmin()
  if (!user) redirect("/login")
  if (!isAdmin) redirect("/dashboard")

  const { data: reviews, error } = await listReviewsForAdmin({ limit: 200 })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#111111]">评价审核</h1>
        <p className="mt-1 text-[14px] text-[#6B6B6B]">
          共 {reviews?.length ?? 0} 条评价 · 按时间倒序
        </p>
      </div>

      {error && (
        <div className="rounded-[14px] border border-[#ff3b30]/30 bg-[#ff3b30]/8 p-4 text-[13px] text-[#ff3b30]">
          加载失败：{error.message}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {reviews && reviews.length > 0 ? (
          reviews.map((r) => {
            const author = (r as unknown as { profiles: { username: string; display_name: string | null; is_flagged: boolean | null } | null }).profiles
            const product = (r as unknown as { products: { name: string } | null }).products
            return (
              <article
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
                        {product?.name ?? "—"}
                      </p>
                      <p className="text-[12px] text-[#6B6B6B]">
                        @{author?.username ?? "未知"} · 使用 {r.usage_duration} ·{" "}
                        {new Date(r.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {author?.is_flagged ? (
                      <span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[11px] font-semibold text-[#ff3b30]">
                        作者已标记
                      </span>
                    ) : null}
                    {r.overall_rating != null && r.overall_rating <= 2 ? (
                      <span className="rounded-full bg-[#ff9500]/12 px-2 py-0.5 text-[11px] font-semibold text-[#b67300]">
                        低分预警
                      </span>
                    ) : null}
                  </div>
                </header>
                {r.review_text && (
                  <p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.7] text-[#444444]">
                    {r.review_text}
                  </p>
                )}
                <footer className="mt-3 flex items-center justify-end">
                  <Link
                    href={`/products/${(r as unknown as { product_id: string }).product_id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[12.5px] text-[#FF7A59] hover:underline"
                  >
                    查看产品 <ChevronRight className="size-3" />
                  </Link>
                </footer>
              </article>
            )
          })
        ) : (
          <div className="rounded-[18px] border border-dashed border-[rgba(0,0,0,0.08)] p-12 text-center text-[14px] text-[#6B6B6B]">
            暂无评价
          </div>
        )}
      </div>
    </div>
  )
}
