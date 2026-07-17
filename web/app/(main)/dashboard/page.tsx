import { redirect } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, Star, PawPrint, Clock, ChevronRight, ThumbsUp, ThumbsDown, Eye, Bell, Heart, Sparkles, ArrowRight, Plus, CheckSquare, Activity, Pill, Paperclip, Calendar } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatPetAge } from "@/lib/utils"
import { getUser, queryProfile, queryPets, queryUserReviews, queryPendingSchedules, queryNotifications, queryBookmarks, queryAllergies, queryWeightLogs } from "@/lib/supabase/query"
import { NotificationList } from "@/components/notifications/notification-list"
import { RecommendationCard } from "@/components/dashboard/recommendation-card"
import ResidentBookSection from "@/components/resident-book/resident-book-section"
import { buildResidentBookData } from "@/components/resident-book/utils"
import { getMedicationRecords } from "@/lib/supabase/queries/medication-queries"

export default async function DashboardPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

  const [
    { data: profile },
    { data: pets },
    { data: reviews },
    { data: pendingSchedules },
    { data: notifications },
    { data: bookmarks },
    feedbackResult,
    { data: recommendations },
  ] = await Promise.all([
    queryProfile(user.id),
    queryPets(user.id),
    queryUserReviews(user.id),
    queryPendingSchedules(user.id),
    queryNotifications(user.id, 10),
    queryBookmarks(user.id),
    supabase.from("feedback_events").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase
      .from("recommendation_contexts")
      .select("*, products(id, name, brand, image_url, price, score, score_breakdown)")
      .eq("profile_id", user.id)
      .order("score", { ascending: false })
      .limit(5),
  ])
  const feedbackEvents = (feedbackResult.data ?? []) as Array<{ id: string; event_type: string; product_id: string | null; created_at: string; metadata: Record<string, unknown> | null }>
  const hasPets = pets && pets.length > 0

  // 构建单一户口簿：户主=用户，成员=所有宠物
  const allergiesMap: Record<string, any[]> = {}
  const medsMap: Record<string, any[]> = {}
  const weightLogsMap: Record<string, any[]> = {}

  if (pets && pets.length > 0) {
    await Promise.all(
      pets.map(async (pet) => {
        const [allergiesRes, meds, weightLogsRes] = await Promise.all([
          queryAllergies(pet.id),
          getMedicationRecords(pet.id).catch(() => []),
          queryWeightLogs(pet.id, 2),
        ])
        allergiesMap[pet.id] = allergiesRes.data ?? []
        medsMap[pet.id] = meds ?? []
        weightLogsMap[pet.id] = weightLogsRes.data ?? []
      })
    )
  }

  const residentBook = buildResidentBookData(
    profile,
    pets ?? [],
    allergiesMap,
    medsMap,
    weightLogsMap
  )

  return (
    <div className="space-y-6">
      {/* Personalized Recommendations */}
      {hasPets && recommendations && recommendations.length > 0 && (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[#FF7A59]" />
              <span className="text-[15px] font-semibold text-[#111111]">为你推荐</span>
            </div>
            <Link href="/dashboard/recommendations" className="flex items-center gap-1 text-[12.5px] text-[#FF7A59] hover:underline">
              查看全部 <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 3).map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {/* 毛球镇户口簿（无宠物时显示添加引导） */}
      <ResidentBookSection book={residentBook} hasPets={hasPets ?? false} />

      {/* Trust Score (white card on background) */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-[#FF7A59]" />
          <span className="text-[15px] font-semibold text-[#111111]">信任分</span>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-[48px] font-semibold leading-none text-[#111111]">
            {profile?.trust_score ?? 0}
          </span>
          <span className="mb-1 text-[17px] text-[#6B6B6B]">/100</span>
        </div>
        <Progress value={profile?.trust_score ?? 0} className="mt-3 h-1.5" />
        <div className="mt-4 grid grid-cols-2 gap-3 text-[14px] text-[#6B6B6B]">
          <span>评价数: {profile?.review_count ?? 0}</span>
          <span>长期反馈: {profile?.long_term_review_count ?? 0}</span>
          <span>验证购买: {profile?.verified_purchase_count ?? 0}</span>
          <span>行为分: {profile?.behavior_score ?? 100}</span>
        </div>
      </section>

      {/* Quick Actions: Notifications + Bookmarks (white cards) */}
      <section className="grid gap-5 md:grid-cols-2">
        <Link href="/dashboard/notifications" className="group rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#FF7A59]/10">
              <Bell className="size-5 text-[#FF7A59]" />
            </div>
            <div className="flex-1">
              <span className="text-[14px] font-semibold text-[#111111]">通知中心</span>
              <p className="text-[12px] text-[#6B6B6B]">{notifications?.filter(n => !n.is_read).length ?? 0} 条未读</p>
            </div>
            <ChevronRight className="size-4 text-[#D2D1CF] transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
        <Link href="/dashboard/bookmarks" className="group rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#FF7A59]/10">
              <Heart className="size-5 text-[#FF7A59]" />
            </div>
            <div className="flex-1">
              <span className="text-[14px] font-semibold text-[#111111]">我的收藏</span>
              <p className="text-[12px] text-[#6B6B6B]">{bookmarks?.length ?? 0} 个产品</p>
            </div>
            <ChevronRight className="size-4 text-[#D2D1CF] transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </section>

      {/* New Modules Quick Access */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="mb-4">
          <span className="text-[15px] font-semibold text-[#111111]">健康管理</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/dashboard/daily-tasks" className="flex flex-col items-center gap-2 rounded-[12px] bg-[#F7F6F3] p-4 transition-colors hover:bg-[#F0EFED]">
            <CheckSquare className="size-6 text-[#FF7A59]" />
            <span className="text-[12px] text-[#111111]">每日任务</span>
          </Link>
          <Link href="/dashboard/health/diseases" className="flex flex-col items-center gap-2 rounded-[12px] bg-[#F7F6F3] p-4 transition-colors hover:bg-[#F0EFED]">
            <Activity className="size-6 text-[#ff9500]" />
            <span className="text-[12px] text-[#111111]">疾病记录</span>
          </Link>
          <Link href="/dashboard/health/medications" className="flex flex-col items-center gap-2 rounded-[12px] bg-[#F7F6F3] p-4 transition-colors hover:bg-[#F0EFED]">
            <Pill className="size-6 text-[#007AFF]" />
            <span className="text-[12px] text-[#111111]">用药记录</span>
          </Link>
          <Link href="/dashboard/health/events" className="flex flex-col items-center gap-2 rounded-[12px] bg-[#F7F6F3] p-4 transition-colors hover:bg-[#F0EFED]">
            <Calendar className="size-6 text-[#34c759]" />
            <span className="text-[12px] text-[#111111]">宠物事件</span>
          </Link>
        </div>
      </section>

      {/* Notifications (white card) */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-[#FF7A59]" />
            <span className="text-[15px] font-semibold text-[#111111]">最近通知</span>
          </div>
          <Link href="/dashboard/notifications" className="text-[12.5px] text-[#FF7A59] hover:underline">
            查看全部
          </Link>
        </div>
        <NotificationList initialNotifications={notifications ?? []} />
      </section>

      {/* Pending Follow-ups (white card) */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[#ff9500]" />
            <span className="text-[15px] font-semibold text-[#111111]">待完成长期追踪</span>
          </div>
          {pendingSchedules && pendingSchedules.length > 0 && (
            <span className="rounded-full bg-[#F7F6F3] px-2 py-0.5 text-[12px] text-[#6B6B6B]">
              {pendingSchedules.length}
            </span>
          )}
        </div>
        <div className="mt-4">
          {pendingSchedules && pendingSchedules.length > 0 ? (
            <div className="space-y-2">
              {pendingSchedules.map((s) => {
                const now = new Date()
                const dueDate = new Date(s.due_date)
                const isOverdue = dueDate < now
                return (
                  <Link
                    key={s.id}
                    href={`/dashboard/followups/${s.id}`}
                    className={`flex items-center justify-between rounded-[12px] border p-3 transition-colors ${
                      isOverdue
                        ? "border-[#ff3b30]/20 bg-[#ff3b30]/5 hover:bg-[#ff3b30]/8"
                        : "border-transparent bg-[#F7F6F3] hover:bg-[#F0EFED]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-[#111111]">{s.product_reviews.products.name}</p>
                        <span className="shrink-0 rounded-full bg-[#F0EFED] px-2 py-0.5 text-[12px] text-[#6B6B6B]">
                          Day {s.followup_day}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
                        {s.product_reviews.pets.name} · 截止 {dueDate.toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] ${
                      isOverdue ? "bg-[#ff3b30]/10 text-[#ff3b30]" : "bg-[#F0EFED] text-[#6B6B6B]"
                    }`}>
                      {isOverdue ? "已逾期" : "待完成"}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Clock className="mx-auto mb-2 size-8 text-[#e0e0e0]" />
              <p className="text-[14px] text-[#6B6B6B]">暂无待完成的长期追踪反馈</p>
            </div>
          )}
        </div>
      </section>

      {/* My Pets (white card) */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PawPrint className="size-4 text-[#111111]" />
            <span className="text-[15px] font-semibold text-[#111111]">我的宠物</span>
          </div>
          <Link href="/dashboard/pets" className="text-[12.5px] text-[#FF7A59] hover:underline">
            管理
          </Link>
        </div>
        <div className="mt-4">
          {pets && pets.length > 0 ? (
            <div className="space-y-2">
              {pets.map((pet) => (
                <Link key={pet.id} href={`/dashboard/pets/${pet.id}`} className="flex items-center gap-3 rounded-[12px] border border-transparent bg-[#F7F6F3] p-3 transition-all hover:border-[rgba(0,0,0,0.05)] hover:bg-white">
                  <div className="flex size-10 shrink-0 overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-sm">
                        {pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
                      </div>
                    )}
                  </div>
                  <span className="text-[14px] font-semibold text-[#111111]">{pet.name}</span>
                  <span className="text-[14px] text-[#6B6B6B]">{pet.breed} · {formatPetAge(pet)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[#6B6B6B]">暂无宠物档案</p>
          )}
        </div>
      </section>

      {/* Recent Reviews (white card) */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-[#111111]" />
          <span className="text-[15px] font-semibold text-[#111111]">最近评价</span>
        </div>
        <div className="mt-4">
          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between rounded-[12px] bg-[#F7F6F3] px-3 py-2.5">
                  <span className="text-[14px] text-[#111111]">{review.products?.name}</span>
                  <span className="text-[14px] text-[#6B6B6B]">{review.usage_duration} · {review.overall_rating}分</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[#6B6B6B]">暂无评价记录</p>
          )}
        </div>
      </section>

      {/* Feedback History (white card) */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-[#111111]" />
            <span className="text-[15px] font-semibold text-[#111111]">推荐反馈历史</span>
          </div>
          <Link href="/dashboard/recommendations" className="text-[12.5px] text-[#FF7A59] hover:underline">
            查看全部
          </Link>
        </div>
        <div className="mt-4">
          {feedbackEvents.length > 0 ? (
            <div className="space-y-2">
              {feedbackEvents.slice(0, 10).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-[12px] bg-[#F7F6F3] px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    {e.event_type === "accept" ? <ThumbsUp className="size-3 text-[#FF7A59]" />
                      : e.event_type === "reject" ? <ThumbsDown className="size-3 text-[#ff3b30]" />
                      : <Eye className="size-3 text-[#6B6B6B]" />}
                    <span className="text-[14px] text-[#6B6B6B]">
                      {e.event_type === "accept" ? "采纳推荐" : e.event_type === "reject" ? "拒绝推荐" : e.event_type === "click" ? "点击查看" : "浏览"}
                    </span>
                  </span>
                  <span className="text-[12px] text-[#6B6B6B]">{new Date(e.created_at).toLocaleDateString("zh-CN")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[#6B6B6B]">暂无推荐反馈记录</p>
          )}
        </div>
      </section>
    </div>
  )
}
