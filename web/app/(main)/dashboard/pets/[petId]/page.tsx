import { notFound } from "next/navigation"
import { formatPetAge } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { queryPet, queryDietLogs, queryWeightLogs, queryAllergies, getUser, queryProfile } from "@/lib/supabase/query"
import Link from "next/link"
import { DietLogForm } from "@/components/pets/diet-log-form"
import { DietLogList } from "@/components/pets/diet-log-list"
import { WeightTracker } from "@/components/pets/weight-tracker"
import { AllergyManager } from "@/components/pets/allergy-manager"
import { HealthTimeline } from "@/components/pets/health-timeline"
import { HealthRecords } from "@/components/pets/health-records"
import { FoodHistory } from "@/components/pets/food-history"
import { DietTrendChart } from "@/components/pets/diet-trend-chart"
import { SymptomTracker } from "@/components/pets/symptom-tracker"
import { RepurchaseReminder } from "@/components/pets/repurchase-reminder"
import { generatePetCode } from "@/components/resident-book/utils"
import { Utensils, Activity, Heart, Edit3, AlertTriangle, Clock, Stethoscope, ChevronRight, Fingerprint } from "lucide-react"

const lifeStageLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  kitten: { label: "幼年", variant: "default" },
  young_adult: { label: "青年", variant: "secondary" },
  adult: { label: "壮年", variant: "outline" },
  senior: { label: "中年", variant: "secondary" },
  geriatric: { label: "老年", variant: "destructive" },
  super_senior: { label: "高龄", variant: "destructive" },
}

export default async function DashboardPetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params

  const { data: { user } } = await getUser()
  if (!user) notFound()

  const [{ data: pet }, { data: dietLogs }, { data: weightLogs }, { data: allergies }, profile] = await Promise.all([
    queryPet(petId),
    queryDietLogs(petId),
    queryWeightLogs(petId),
    queryAllergies(petId),
    queryProfile(user.id),
  ])

  if (!pet) notFound()

  const lifeStage = (pet as { life_stage?: string }).life_stage
  const lifeStageInfo = lifeStage ? lifeStageLabels[lifeStage] : null

  // 生成深圳地标 DB4403/T 467-2024 格式的宠物唯一标识编码
  const petCode = generatePetCode(pet.species, pet.breed, (profile as { user_number?: number } | null)?.user_number, 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12.5px] text-[#6B6B6B]">
        <Link href="/dashboard/pets" className="transition-colors hover:text-[#111111]">我的宠物</Link>
        <ChevronRight className="size-3" />
        <span className="text-[#111111]">{pet.name}</span>
      </div>

      {/* Pet Header */}
      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 overflow-hidden rounded-2xl bg-[#FF7A59]/10">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-2xl">
                {pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-[24px] font-semibold leading-tight text-[#111111]">{pet.name}</h1>
            <p className="mt-0.5 text-[13.5px] text-[#6B6B6B]">
              {pet.breed ?? "未知品种"} · {formatPetAge(pet)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{pet.gender === "male" ? "公" : pet.gender === "female" ? "母" : "未知"}</Badge>
              {pet.weight_kg && <Badge variant="secondary">{Number(pet.weight_kg).toFixed(2)}kg</Badge>}
              {pet.neutered && <Badge variant="secondary">已绝育</Badge>}
              <Badge variant={pet.stomach_health === "sensitive" ? "destructive" : "secondary"}>
                {pet.stomach_health === "normal" ? "肠胃正常" : pet.stomach_health === "sensitive" ? "肠胃敏感" : "极易敏感"}
              </Badge>
              {lifeStageInfo && <Badge variant={lifeStageInfo.variant}>{lifeStageInfo.label}</Badge>}
              <Badge variant="outline" className="gap-1 font-mono text-[11px]">
                <Fingerprint className="size-3" />
                {petCode}
              </Badge>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/pets/${pet.id}/edit`}>
              <Edit3 className="mr-1 size-3.5" />编辑档案
            </Link>
          </Button>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-10 -mx-4 bg-[#F7F7F5]/80 px-4 py-2 backdrop-blur-xl md:-mx-6 md:px-6">
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex min-w-full justify-start gap-1 rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-white p-1 shadow-sm">
              <TabsTrigger value="overview" className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-[#111111] data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Heart className="mr-1.5 size-3.5" />概览
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-[#111111] data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Clock className="mr-1.5 size-3.5" />健康事件
              </TabsTrigger>
              <TabsTrigger value="health" className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-[#111111] data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Stethoscope className="mr-1.5 size-3.5" />健康记录
              </TabsTrigger>
              <TabsTrigger value="food" className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-[#111111] data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Utensils className="mr-1.5 size-3.5" />食品历史
              </TabsTrigger>
              <TabsTrigger value="diet" className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-[#111111] data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Utensils className="mr-1.5 size-3.5" />饮食记录
              </TabsTrigger>
              <TabsTrigger value="weight" className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-[#111111] data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Activity className="mr-1.5 size-3.5" />体重趋势
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Diet Trend Chart */}
          <DietTrendChart petId={petId} />

          {/* Symptom Tracker */}
          <SymptomTracker petId={petId} />

          {/* Repurchase Reminder */}
          {user && <RepurchaseReminder petId={petId} userId={user.id} />}

          {pet.disease_history && (
            <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
              <CardHeader><CardTitle className="text-base">疾病史</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-[#6B6B6B]">{pet.disease_history}</p></CardContent>
            </Card>
          )}

          {pet.medication_log && (
            <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
              <CardHeader><CardTitle className="text-base">用药记录</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-[#6B6B6B]">{pet.medication_log}</p></CardContent>
            </Card>
          )}

          <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-[#E8A87C]" />过敏信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AllergyManager petId={petId} initialAllergies={allergies ?? []} />
            </CardContent>
          </Card>

          <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
            <CardHeader><CardTitle className="text-base">最近饮食</CardTitle></CardHeader>
            <CardContent>
              <DietLogList initialLogs={(dietLogs ?? []).slice(0, 5)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Timeline Tab */}
        <TabsContent value="timeline">
          <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white p-2">
            <HealthTimeline petId={petId} />
          </Card>
        </TabsContent>

        {/* Health Records Tab */}
        <TabsContent value="health">
          <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white p-2">
            <HealthRecords petId={petId} />
          </Card>
        </TabsContent>

        {/* Food History Tab */}
        <TabsContent value="food">
          <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white p-2">
            <FoodHistory petId={petId} />
          </Card>
        </TabsContent>

        {/* Diet Log Tab */}
        <TabsContent value="diet" className="space-y-4">
          <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
            <CardHeader>
              <CardTitle className="text-base">添加饮食记录</CardTitle>
            </CardHeader>
            <CardContent>
              <DietLogForm petId={petId} />
            </CardContent>
          </Card>

          {dietLogs && dietLogs.length > 0 && (
            <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white">
              <CardHeader><CardTitle className="text-base">历史记录</CardTitle></CardHeader>
              <CardContent>
                <DietLogList initialLogs={dietLogs} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Weight Tracker Tab */}
        <TabsContent value="weight">
          <Card className="rounded-[20px] border-[rgba(0,0,0,0.05)] bg-white p-2">
            <WeightTracker
              petId={petId}
              currentWeight={pet.weight_kg ? Number(pet.weight_kg) : null}
              weightLogs={(weightLogs ?? []).map((log) => ({
                id: log.id,
                weight_kg: Number(log.weight_kg),
                logged_date: log.logged_date,
              }))}
            />
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

