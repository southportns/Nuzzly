import { redirect } from "next/navigation"
import { AlertTriangle, Plus, Activity, CheckCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/query"
import { getDiseaseRecords } from "@/lib/supabase/queries/disease-queries"
import { DiseaseRecordsList } from "@/components/dashboard/disease-records-list"

export default async function DiseaseRecordsPage() {
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

  // 获取疾病记录
  const diseases = petId ? await getDiseaseRecords(petId) : []

  // 统计
  const activeDiseases = diseases.filter(d => d.status === "active" || d.status === "under_treatment")
  const chronicDiseases = diseases.filter(d => d.status === "chronic")
  const resolvedDiseases = diseases.filter(d => d.status === "resolved")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
            疾病记录
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">追踪宠物的疾病历史和治疗状态</p>
        </div>
        <a
          href={`/dashboard/health/diseases/new?pet=${petId}`}
          className="flex items-center gap-2 rounded-full bg-[#FF7A59] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#FF6A49]"
        >
          <Plus className="size-4" />
          添加记录
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-[#ff9500]" />
            <span className="text-[12px] text-[#6B6B6B]">进行中</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{activeDiseases.length}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="size-4 text-[#585858]" />
            <span className="text-[12px] text-[#6B6B6B]">慢性病</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{chronicDiseases.length}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="size-4 text-[#34c759]" />
            <span className="text-[12px] text-[#6B6B6B]">已康复</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{resolvedDiseases.length}</span>
        </div>
      </div>

      {/* Disease Records List */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="size-5 text-[#FF7A59]" />
          <span className="text-[15px] font-semibold text-[#111111]">全部记录</span>
        </div>
        
        {diseases && diseases.length > 0 ? (
          <DiseaseRecordsList records={diseases} />
        ) : (
          <div className="py-12 text-center">
            <Activity className="mx-auto mb-3 size-12 text-[#e0e0e0]" />
            <p className="text-[14px] text-[#6B6B6B]">暂无疾病记录</p>
            <p className="mt-1 text-[12px] text-[#999]">点击上方按钮添加第一条记录</p>
          </div>
        )}
      </section>
    </div>
  )
}
