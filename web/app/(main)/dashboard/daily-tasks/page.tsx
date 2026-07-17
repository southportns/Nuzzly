import { redirect } from "next/navigation"
import { CheckCircle2, Circle, Plus, Calendar, TrendingUp, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/query"
import { getDailyTasks, getDailyTaskLogs, getTaskCompletionStats } from "@/lib/supabase/queries/daily-task-queries"
import { DailyTasksList } from "@/components/dashboard/daily-tasks-list"
import { TaskStats } from "@/components/dashboard/task-stats"

export default async function DailyTasksPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

  // 获取用户的第一只宠物
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)

  const petId = pets?.[0]?.id
  const today = new Date().toISOString().split("T")[0]

  // 获取今日任务和日志
  const [tasks, logs, stats] = await Promise.all([
    petId ? getDailyTasks(user.id, petId) : Promise.resolve([]),
    petId ? getDailyTaskLogs(user.id, petId, today) : Promise.resolve([]),
    petId ? getTaskCompletionStats(user.id, petId, 7) : Promise.resolve(null),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
            每日任务
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">记录和追踪宠物的日常护理任务</p>
        </div>
        <a
          href={`/dashboard/daily-tasks/new?pet=${petId}`}
          className="flex items-center gap-2 rounded-full bg-[#FF7A59] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#FF6A49]"
        >
          <Plus className="size-4" />
          新建任务
        </a>
      </div>

      {/* Stats */}
      {stats && (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-[#FF7A59]" />
            <span className="text-[15px] font-semibold text-[#111111]">本周统计</span>
          </div>
          <TaskStats stats={stats} />
        </section>
      )}

      {/* Today's Tasks */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-[#FF7A59]" />
            <span className="text-[15px] font-semibold text-[#111111]">今日任务</span>
          </div>
          <span className="text-[12px] text-[#6B6B6B]">{new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}</span>
        </div>
        
        {tasks && tasks.length > 0 ? (
          <DailyTasksList tasks={tasks} logs={logs} petId={petId ?? null} date={today} />
        ) : (
          <div className="py-12 text-center">
            <Clock className="mx-auto mb-3 size-12 text-[#e0e0e0]" />
            <p className="text-[14px] text-[#6B6B6B]">暂无每日任务</p>
            <p className="mt-1 text-[12px] text-[#999]">点击上方按钮创建第一个任务</p>
          </div>
        )}
      </section>

      {/* Pet Selector (if multiple pets) */}
      {pets && pets.length > 1 && (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[15px] font-semibold text-[#111111]">选择宠物</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pets.map((pet) => (
              <a
                key={pet.id}
                href={`/dashboard/daily-tasks?pet=${pet.id}`}
                className="rounded-full border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[14px] text-[#6B6B6B] hover:border-[#FF7A59] hover:text-[#FF7A59]"
              >
                {pet.name}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
