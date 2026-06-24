"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, Search, Loader2, PawPrint } from "lucide-react"

interface Pet {
  id: string
  name: string
  breed: string | null
  species: string
  stomach_health: string
}

interface Props {
  onRecommend: (petId: string, query: string) => void
  loading: boolean
}

export function RecommendationInput({ onRecommend, loading }: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPetId, setSelectedPetId] = useState("")
  const [query, setQuery] = useState("")
  const [loadingPets, setLoadingPets] = useState(true)

  useEffect(() => {
    if (user) {
      supabase
        .from("pets")
        .select("id,name,breed,species,stomach_health")
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .then(({ data }) => {
          const petsData = data as unknown as Pet[] | null
          setPets(petsData ?? [])
          setLoadingPets(false)
        })
    }
  }, [user])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPetId) return
    onRecommend(selectedPetId, query)
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/3 to-transparent mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-5 text-primary" />
          AI 智能产品推荐
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          基于社区真实长期反馈数据，为你的宠物精准匹配最适合的产品
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingPets ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : pets.length === 0 ? (
            <div className="text-center py-3 text-sm text-muted-foreground">
              还没有宠物档案，请先
              <Link href="/dashboard/pets/new" className="text-primary mx-1 hover:underline">添加宠物</Link>
              以获取个性化推荐
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">选择宠物</label>
                <SelectDropdown
                  value={selectedPetId}
                  onChange={setSelectedPetId}
                  options={pets.map<SelectOption>((pet) => ({
                    value: pet.id,
                    label: `${pet.name} · ${pet.breed ?? "未知品种"}${pet.stomach_health === "sensitive" ? " · 肠胃敏感" : ""}`,
                    icon: <PawPrint className="size-4 text-[#FF7A59]" />,
                  }))}
                  placeholder="选择要推荐的宠物…"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  具体需求或症状（可选）
                </label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="例如：布偶猫长期软便、低敏幼猫粮、性价比高..."
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading || !selectedPetId}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                {loading ? "正在分析数据…" : "获取智能推荐"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
