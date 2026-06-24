import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Activity, AlertTriangle, ChevronRight, Stethoscope, Utensils } from "lucide-react"
import { formatPetAge } from "@/lib/utils"

interface HealthOverviewProps {
  pets: Array<{
    id: string
    name: string
    species: string
    breed: string | null
    age_years: number
    age_months: number
    weight_kg: number | null
    stomach_health: string | null
    disease_history: string | null
    neutered: boolean | null
    photo_url?: string | null
  }>
}

const stomachLabels: Record<string, { label: string; color: string }> = {
  normal: { label: "肠胃正常", color: "#34C759" },
  sensitive: { label: "肠胃敏感", color: "#FF9500" },
  very_sensitive: { label: "极易敏感", color: "#FF3B30" },
}

export function HealthOverview({ pets }: HealthOverviewProps) {
  return (
    <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="size-5 text-[#FF7A59]" />
          <span className="text-[15px] font-semibold text-[#111111]">宠物健康概览</span>
        </div>
        <Link href="/dashboard/pets" className="flex items-center gap-1 text-[12.5px] text-[#FF7A59] hover:underline">
          详情 <ChevronRight className="size-3" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pets.map((pet) => {
          const stomachInfo = stomachLabels[pet.stomach_health ?? "normal"] ?? stomachLabels.normal
          const hasDisease = !!pet.disease_history

          return (
            <Link
              key={pet.id}
              href={`/dashboard/pets/${pet.id}`}
              className="group rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-[#F7F6F3] p-4 transition-all hover:bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
            >
              {/* Pet Header */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-10 shrink-0 overflow-hidden rounded-xl bg-[#FF7A59]/10">
                  {pet.photo_url ? (
                    <img src={pet.photo_url} alt={pet.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-lg">
                      {pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#111111]">{pet.name}</h3>
                  <p className="text-[12px] text-[#6B6B6B]">
                    {pet.breed ?? "未知"} · {formatPetAge(pet)}
                  </p>
                </div>
              </div>

              {/* Health Stats */}
              <div className="space-y-2">
                {/* Stomach Health */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                    <Utensils className="size-3.5" />
                    肠胃状况
                  </span>
                  <Badge
                    variant="outline"
                    className="rounded-full text-[11px]"
                    style={{ borderColor: stomachInfo.color, color: stomachInfo.color }}
                  >
                    {stomachInfo.label}
                  </Badge>
                </div>

                {/* Weight */}
                {pet.weight_kg && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                      <Activity className="size-3.5" />
                      体重
                    </span>
                    <span className="text-[12px] font-medium text-[#111111]">{Number(pet.weight_kg).toFixed(2)} kg</span>
                  </div>
                )}

                {/* Disease Alert */}
                {hasDisease && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
                      <Stethoscope className="size-3.5" />
                      疾病史
                    </span>
                    <Badge variant="destructive" className="rounded-full text-[11px]">
                      <AlertTriangle className="mr-1 size-3" />
                      有记录
                    </Badge>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

