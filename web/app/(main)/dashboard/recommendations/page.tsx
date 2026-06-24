import { redirect } from "next/navigation"
import { ThumbsUp, ThumbsDown, Eye, MousePointerClick } from "lucide-react"
import { getUser } from "@/lib/supabase/query"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "推荐反馈 — PetRWD",
}

const eventMeta: Record<string, { label: string; icon: typeof ThumbsUp; color: string }> = {
  accept: { label: "采纳推荐", icon: ThumbsUp, color: "text-[#FF7A59] bg-[#FF7A59]/10" },
  reject: { label: "拒绝推荐", icon: ThumbsDown, color: "text-[#ff3b30] bg-[#ff3b30]/10" },
  click: { label: "点击查看", icon: MousePointerClick, color: "text-[#7BA7BC] bg-[#7BA7BC]/10" },
  view: { label: "浏览", icon: Eye, color: "text-[#6B6B6B] bg-[#6B6B6B]/10" },
}

export default async function RecommendationsPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()
  const { data } = await supabase
    .from("feedback_events")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  const events = (data ?? []) as Array<{
    id: string
    event_type: string
    product_id: string | null
    created_at: string
    metadata: Record<string, unknown> | null
  }>

  const accept = events.filter((e) => e.event_type === "accept").length
  const reject = events.filter((e) => e.event_type === "reject").length
  const click = events.filter((e) => e.event_type === "click").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          推荐反馈
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">
          你的反馈帮助我们更精准地推荐适合的产品
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <p className="text-[12px] text-[#6B6B6B]">已采纳</p>
          <p className="mt-1 text-[28px] font-semibold text-[#FF7A59]">{accept}</p>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <p className="text-[12px] text-[#6B6B6B]">已拒绝</p>
          <p className="mt-1 text-[28px] font-semibold text-[#ff3b30]">{reject}</p>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <p className="text-[12px] text-[#6B6B6B]">点击查看</p>
          <p className="mt-1 text-[28px] font-semibold text-[#7BA7BC]">{click}</p>
        </div>
      </section>

      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
        {events.length > 0 ? (
          <ul className="divide-y divide-[#F0EFED]">
            {events.map((e) => {
              const meta = eventMeta[e.event_type] ?? eventMeta.view
              const Icon = meta.icon
              return (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-3">
                    <span className={`flex size-8 items-center justify-center rounded-full ${meta.color}`}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-medium text-[#111111]">{meta.label}</span>
                      {e.product_id ? (
                        <span className="text-[11.5px] text-[#6B6B6B]">产品 #{e.product_id.slice(0, 8)}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="text-[12px] text-[#6B6B6B]">
                    {new Date(e.created_at).toLocaleString("zh-CN", { hour12: false })}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="py-12 text-center">
            <Eye className="mx-auto size-10 text-[#D2D1CF]" />
            <p className="mt-3 text-[14px] text-[#6B6B6B]">暂无推荐反馈记录</p>
            <p className="mt-1 text-[12px] text-[#D2D1CF]">与推荐卡片互动后会自动记录</p>
          </div>
        )}
      </section>
    </div>
  )
}
