import Link from "next/link"
import { redirect } from "next/navigation"
import { Clock } from "lucide-react"
import { getUser, queryPendingSchedules } from "@/lib/supabase/query"

export const metadata = {
  title: "长期追踪 — PetRWD",
}

export default async function FollowupsPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const { data: schedules } = await queryPendingSchedules(user.id)
  const now = new Date()
  const items = (schedules ?? []).map((s) => ({
    ...s,
    dueDate: new Date(s.due_date),
    isOverdue: new Date(s.due_date) < now,
  }))

  const pending = items.filter((i) => !i.isOverdue)
  const overdue = items.filter((i) => i.isOverdue)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          长期追踪
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">
          评价后的第 7 / 30 / 90 天回访，更新产品的长期效果
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <p className="text-[12px] text-[#6B6B6B]">待完成</p>
          <p className="mt-1 text-[28px] font-semibold text-[#111111]">{pending.length}</p>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <p className="text-[12px] text-[#6B6B6B]">已逾期</p>
          <p className="mt-1 text-[28px] font-semibold text-[#ff3b30]">{overdue.length}</p>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <p className="text-[12px] text-[#6B6B6B]">总计</p>
          <p className="mt-1 text-[28px] font-semibold text-[#111111]">{items.length}</p>
        </div>
      </section>

      {items.length > 0 ? (
        <section className="space-y-3">
          {overdue.length > 0 && (
            <div className="rounded-[20px] border border-[#ff3b30]/15 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-[#ff3b30]" />
                <span className="text-[14px] font-semibold text-[#ff3b30]">已逾期 · {overdue.length}</span>
              </div>
              <div className="space-y-2">
                {overdue.map((s) => (
                  <FollowupRow key={s.id} schedule={s} />
                ))}
              </div>
            </div>
          )}
          {pending.length > 0 && (
            <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-[#ff9500]" />
                <span className="text-[14px] font-semibold text-[#111111]">待完成 · {pending.length}</span>
              </div>
              <div className="space-y-2">
                {pending.map((s) => (
                  <FollowupRow key={s.id} schedule={s} />
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-12 text-center">
          <Clock className="mx-auto size-10 text-[#D2D1CF]" />
          <p className="mt-3 text-[14px] text-[#6B6B6B]">暂无长期追踪任务</p>
          <p className="mt-1 text-[12px] text-[#D2D1CF]">完成评价后会自动生成 Day 7 / 30 / 90 回访</p>
        </section>
      )}
    </div>
  )
}

function FollowupRow({ schedule }: { schedule: { id: string; due_date: string; followup_day: number; product_reviews: { products: { name: string }; pets: { name: string } } } & { dueDate: Date; isOverdue: boolean } }) {
  return (
    <Link
      href={`/dashboard/followups/${schedule.id}`}
      className={`flex items-center justify-between rounded-[12px] border p-3 transition-all ${
        schedule.isOverdue
          ? "border-[#ff3b30]/15 bg-[#ff3b30]/5 hover:bg-[#ff3b30]/8"
          : "border-transparent bg-[#F7F6F3] hover:border-[rgba(0,0,0,0.06)] hover:bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-[#111111]">
            {schedule.product_reviews.products.name}
          </p>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[12px] text-[#6B6B6B]">
            Day {schedule.followup_day}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
          {schedule.product_reviews.pets.name} · 截止 {schedule.dueDate.toLocaleDateString("zh-CN")}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] ${
          schedule.isOverdue ? "bg-[#ff3b30]/10 text-[#ff3b30]" : "bg-[#F0EFED] text-[#6B6B6B]"
        }`}
      >
        {schedule.isOverdue ? "已逾期" : "待完成"}
      </span>
    </Link>
  )
}
