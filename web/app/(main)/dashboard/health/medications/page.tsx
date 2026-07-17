import { redirect } from "next/navigation"
import { Pill, Plus, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/query"
import { getMedicationRecords, getOngoingMedications } from "@/lib/supabase/queries/medication-queries"
import { MedicationRecordsList } from "@/components/dashboard/medication-records-list"

export default async function MedicationRecordsPage() {
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

  // 获取用药记录
  const [medications, ongoingMedications] = await Promise.all([
    petId ? getMedicationRecords(petId) : Promise.resolve([]),
    petId ? getOngoingMedications(petId) : Promise.resolve([]),
  ])

  const completedMedications = medications.filter(m => !m.is_ongoing)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
            用药记录
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">管理宠物的用药历史和当前用药</p>
        </div>
        <a
          href={`/dashboard/health/medications/new?pet=${petId}`}
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
            <Pill className="size-4 text-[#FF7A59]" />
            <span className="text-[12px] text-[#6B6B6B]">持续用药</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{ongoingMedications.length}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="size-4 text-[#34c759]" />
            <span className="text-[12px] text-[#6B6B6B]">已完成</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{completedMedications.length}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="size-4 text-[#6B6B6B]" />
            <span className="text-[12px] text-[#6B6B6B]">总记录</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{medications.length}</span>
        </div>
      </div>

      {/* Ongoing Medications */}
      {ongoingMedications.length > 0 && (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="size-5 text-[#ff9500]" />
            <span className="text-[15px] font-semibold text-[#111111]">当前用药</span>
          </div>
          <MedicationRecordsList records={ongoingMedications} showStopButton />
        </section>
      )}

      {/* All Medications */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Pill className="size-5 text-[#FF7A59]" />
          <span className="text-[15px] font-semibold text-[#111111]">用药历史</span>
        </div>
        
        {medications && medications.length > 0 ? (
          <MedicationRecordsList records={medications} />
        ) : (
          <div className="py-12 text-center">
            <Pill className="mx-auto mb-3 size-12 text-[#e0e0e0]" />
            <p className="text-[14px] text-[#6B6B6B]">暂无用药记录</p>
            <p className="mt-1 text-[12px] text-[#999]">点击上方按钮添加第一条记录</p>
          </div>
        )}
      </section>
    </div>
  )
}
