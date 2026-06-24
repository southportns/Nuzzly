import { Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { getUser, queryPets } from "@/lib/supabase/query"
import { formatPetAge } from "@/lib/utils"
import { PawPrint } from "lucide-react"
import { PetDeleteButton } from "@/components/pets/pet-delete-button"

const lifeStageLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  kitten: { label: "幼年", variant: "default" },
  young_adult: { label: "青年", variant: "secondary" },
  adult: { label: "壮年", variant: "outline" },
  senior: { label: "中年", variant: "secondary" },
  geriatric: { label: "老年", variant: "destructive" },
  super_senior: { label: "高龄", variant: "destructive" },
}

export const metadata = {
  title: "我的宠物 — PetRWD",
}

export default async function DashboardPetsPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const { data: pets } = await queryPets(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
            我的宠物
          </h1>
          <p className="mt-2 text-[14px] text-[#6B6B6B]">
            管理你的宠物档案，获得更精准的产品推荐
          </p>
        </div>
        <Link
          href="/dashboard/pets/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#E86A4A] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          添加宠物
        </Link>
      </div>

      <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
        {pets && pets.length > 0 ? (
          <div className="space-y-2">
            {pets.map((pet) => {
              const lifeStage = pet.life_stage
              const lifeStageInfo = lifeStage ? lifeStageLabels[lifeStage] : null
              return (
                <div key={pet.id} className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/pets/${pet.id}`}
                    className="group flex flex-1 items-center gap-4 rounded-[14px] border border-transparent bg-[#F7F6F3] p-4 transition-all hover:border-[rgba(0,0,0,0.06)] hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex size-12 shrink-0 overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
                      {pet.photo_url ? (
                        <img src={pet.photo_url} alt={pet.name} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-lg">
                          {pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#111111]">{pet.name}</p>
                        {lifeStageInfo && (
                          <Badge variant={lifeStageInfo.variant} className="text-[10.5px]">
                            {lifeStageInfo.label}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-[#6B6B6B]">
                        {pet.breed ?? "未知品种"} · {formatPetAge(pet)}
                        {pet.stomach_health === "sensitive" && " · 肠胃敏感"}
                      </p>
                    </div>
                  </Link>
                  {pet.id && <PetDeleteButton petId={pet.id} petName={pet.name} />}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <PawPrint className="mx-auto size-10 text-[#D2D1CF]" />
            <p className="mt-3 text-[14px] text-[#6B6B6B]">还没有宠物档案</p>
            <p className="mt-1 text-[12px] text-[#D2D1CF]">添加宠物后能获得更精准的产品推荐</p>
            <Link
              href="/dashboard/pets/new"
              className="mt-5 inline-flex h-[40px] items-center gap-1.5 rounded-full bg-[#FF7A59] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#E86A4A]"
            >
              <Plus className="size-4" />
              创建第一份宠物档案
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
