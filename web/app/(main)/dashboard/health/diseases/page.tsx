import { EmojiIcon } from "@/components/ui/emoji-icon"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/query"
import { getDiseaseRecords } from "@/lib/supabase/queries/disease-queries"
import { DiseaseRecordsList } from "@/components/dashboard/disease-records-list"
import { getTranslations } from "next-intl/server"

export default async function DiseaseRecordsPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const t = await getTranslations("Health")
  const tCommon = await getTranslations("Common")

  const supabase = await createClient()

  // Get user's first pet
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)

  const petId = pets?.[0]?.id

  // Get disease records
  const diseases = petId ? await getDiseaseRecords(petId) : []

  // Stats (compatible with resolved / recovered status values)
  const activeDiseases = diseases.filter(d => d.status === "active" || d.status === "under_treatment")
  const chronicDiseases = diseases.filter(d => d.status === "chronic")
  const resolvedDiseases = diseases.filter(d => d.status === "resolved" || d.status === "recovered")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
            {t("diseaseHistory")}
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">{t("diseaseSubtitle")}</p>
        </div>
        <a
          href={`/dashboard/health/diseases/new?pet=${petId}`}
          className="flex items-center gap-2 rounded-full bg-[#FF7A59] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#FF6A49]"
        >
          <EmojiIcon name="Plus" className="size-4" />
          {t("addRecord")}
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <EmojiIcon name="AlertTriangle" className="size-4 text-[#ff9500]" />
            <span className="text-[12px] text-[#6B6B6B]">{t("ongoing")}</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{activeDiseases.length}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <EmojiIcon name="Activity" className="size-4 text-[#585858]" />
            <span className="text-[12px] text-[#6B6B6B]">{t("chronic")}</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{chronicDiseases.length}</span>
        </div>
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <EmojiIcon name="CheckCircle" className="size-4 text-[#34c759]" />
            <span className="text-[12px] text-[#6B6B6B]">{t("recovered")}</span>
          </div>
          <span className="text-[32px] font-semibold text-[#111111]">{resolvedDiseases.length}</span>
        </div>
      </div>

      {/* Disease Records List */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <EmojiIcon name="AlertTriangle" className="size-5 text-[#FF7A59]" />
          <span className="text-[15px] font-semibold text-[#111111]">{t("allRecords")}</span>
        </div>
        
        {diseases && diseases.length > 0 ? (
          <DiseaseRecordsList records={diseases} />
        ) : (
          <div className="py-12 text-center">
            <EmojiIcon name="Activity" className="mx-auto mb-3 size-12 text-[#e0e0e0]" />
            <p className="text-[14px] text-[#6B6B6B]">{t("noDiseaseRecords")}</p>
            <p className="mt-1 text-[12px] text-[#999]">{t("addFirstRecord")}</p>
          </div>
        )}
      </section>
    </div>
  )
}
