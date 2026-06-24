"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { submitReviewAction, submitReviewVoucherAction } from "@/app/(main)/products/[productId]/actions"
import type { Database } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { CheckCircle2, ChevronLeft, ChevronRight, Star, Upload, Loader2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type DurationBucketValue =
  | "lt_1w"
  | "1w_to_2w"
  | "2w_to_1m"
  | "1m_to_3m"
  | "m6"
  | "m6_to_1y"
  | "gt_1y"
  | "custom"

const durations: { value: DurationBucketValue; label: string; days: string }[] = [
  { value: "lt_1w",     label: "一周以内",       days: "1-6天" },
  { value: "1w_to_2w",  label: "一周到半个月",   days: "7-14天" },
  { value: "2w_to_1m",  label: "半个月到一个月", days: "15-30天" },
  { value: "1m_to_3m",  label: "一个月到三个月", days: "31-90天" },
  { value: "m6",        label: "半年",           days: "约180天" },
  { value: "m6_to_1y",  label: "半年到一年",     days: "180-365天" },
  { value: "gt_1y",     label: "一年以上",       days: "365天+" },
  { value: "custom",    label: "自定义",         days: "输入具体天数" },
]

function trustLabel(v: DurationBucketValue): string {
  switch (v) {
    case "gt_1y":
    case "m6_to_1y":
      return "最高可信度"
    case "m6":
    case "1m_to_3m":
      return "高可信度"
    case "custom":
      return "按实际天数计分"
    default:
      return ""
  }
}

interface Pet {
  id: string
  name: string
  breed: string | null
  species: string
  stomach_health: string
  photo_url?: string | null
}

export function ReviewWizard({ productId, productName }: { productId: string; productName?: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pets, setPets] = useState<Pet[]>([])

  // Form state
  const [petId, setPetId] = useState("")
  const [usageDuration, setUsageDuration] = useState<DurationBucketValue | "">("")
  const [customDays, setCustomDays] = useState("")
  const [palatability, setPalatability] = useState<number | null>(null)
  const [stool, setStool] = useState<number | null>(null)
  const [coat, setCoat] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [overall, setOverall] = useState<number | null>(null)
  const [blackChin, setBlackChin] = useState<number | null>(null)
  const [vomit, setVomit] = useState<number | null>(null)
  const [tearStain, setTearStain] = useState<number | null>(null)
  const [shedding, setShedding] = useState<number | null>(null)
  const [wouldRepurchase, setWouldRepurchase] = useState<boolean | null>(null)
  const [reviewText, setReviewText] = useState("")
  const [pros, setPros] = useState("")
  const [cons, setCons] = useState("")
  const [transitionDays, setTransitionDays] = useState("")
  const [verifiedPurchase, setVerifiedPurchase] = useState(false)
  const [proofFiles, setProofFiles] = useState<File[]>([])
  const [proofPreviews, setProofPreviews] = useState<string[]>([])

  function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length + proofFiles.length > 5) {
      toast.error("最多上传 5 张凭证")
      return
    }
    setProofFiles((prev) => [...prev, ...files])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => setProofPreviews((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }

  function removeProof(index: number) {
    setProofFiles((prev) => prev.filter((_, i) => i !== index))
    setProofPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (step === 2 && user) {
      supabase.from("pets").select("id,name,breed,species,stomach_health").eq("profile_id", user.id).eq("is_active", true).then(({ data }) => {
        // Use type assertion since we know the schema
        const petsData = data as unknown as Pet[] | null
        setPets(petsData ?? [])
      })
    }
  }, [step, user])

  async function handleSubmit() {
    if (!user || !usageDuration) return
    setLoading(true)

    const reviewRecord = {
      product_id: productId,
      pet_id: petId,
      profile_id: user.id,
      usage_duration: usageDuration as Database["public"]["Enums"]["usage_duration_t"],
      usage_duration_custom_days: usageDuration === "custom" && customDays ? Number(customDays) : null,
      palatability_rating: palatability,
      stool_rating: stool,
      coat_rating: coat,
      energy_rating: energy,
      overall_rating: overall,
      black_chin_rating: blackChin,
      vomit_rating: vomit,
      tear_stain_rating: tearStain,
      shedding_rating: shedding,
      would_repurchase: wouldRepurchase,
      review_text: reviewText || null,
      pros: pros || null,
      cons: cons || null,
      transition_period_days: transitionDays ? parseInt(transitionDays) : null,
      verified_purchase: verifiedPurchase,
    }

    const reviewResult = await submitReviewAction(reviewRecord, user.id)
    setLoading(false)

    if (!reviewResult.success || !reviewResult.reviewId) {
      toast.error(reviewResult.error ?? "提交失败")
      return
    }

    const reviewId = reviewResult.reviewId

    // Upload proof files if review was created successfully
    if (proofFiles.length > 0) {
      for (const file of proofFiles) {
        const voucherResult = await submitReviewVoucherAction(reviewId, file, user.id)
        if (!voucherResult.success) {
          toast.error(`凭证上传失败: ${voucherResult.error}`)
        }
      }
    }

    // Fire-and-forget: trigger timeline processing (AI extraction + trust score)
    fetch(`/api/reviews/${reviewId}/process-timeline`, { method: "POST" })
      .catch(() => {}) // silently ignore — timeline processing is non-critical

    toast.success("评价已提交！系统将在7/14/30/60/90/180天后提醒你进行长期追踪反馈。")
    router.push(`/products/${productId}`)
    router.refresh()
  }

  const stepLabels = ["选择时长", "选择宠物", "结构化反馈", "详细评价", "上传凭证", "提交"]

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {stepLabels.map((label, i) => (
            <span key={label} className={cn("text-xs", i + 1 === step ? "text-primary font-medium" : i + 1 < step ? "text-muted-foreground" : "text-muted-foreground/50")}>
              {i + 1 < step ? <CheckCircle2 className="size-3 inline mr-0.5" /> : null}
              {label}
            </span>
          ))}
        </div>
        <Progress value={step * (100 / 6)} className="h-1.5" />
      </div>

      {/* Step 1: Usage Duration */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>你已经使用这款产品多久了？</CardTitle>
            <CardDescription>{productName ?? "选择产品使用时长"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => {
                    setUsageDuration(d.value)
                    if (d.value !== "custom") setStep(2)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border border-border/40 p-4 text-left transition-colors hover:bg-muted/50",
                    usageDuration === d.value && "border-primary/50 bg-primary/5"
                  )}
                >
                  <div>
                    <span className="font-medium">{d.label}</span>
                    <p className="text-xs text-muted-foreground">{d.days}</p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="size-3" />
                    {trustLabel(d.value)}
                  </Badge>
                </button>
              ))}
            </div>

            {usageDuration === "custom" && (
              <div className="mt-4 space-y-3 rounded-lg border border-border/40 bg-muted/30 p-4">
                <Label htmlFor="custom-days">具体使用天数</Label>
                <Input
                  id="custom-days"
                  type="number"
                  min={1}
                  max={3650}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="例如 45"
                />
                <p className="text-xs text-muted-foreground">范围 1 - 3650 天</p>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={() => setStep(2)}
                    disabled={!customDays || Number(customDays) < 1 || Number(customDays) > 3650}
                  >
                    下一步<ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pet Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>选择使用该产品的宠物</CardTitle>
            <CardDescription>基于宠物体质进行精准匹配</CardDescription>
          </CardHeader>
          <CardContent>
            {pets.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-4">还没有宠物档案</p>
                <Button variant="outline" onClick={() => router.push("/pets/new")}>创建宠物档案</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {pets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => { setPetId(pet.id); setStep(3) }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border border-border/40 p-4 text-left transition-colors hover:bg-muted/50",
                      petId === pet.id && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex size-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
                      {pet.photo_url ? (
                        <img src={pet.photo_url} alt={pet.name} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-lg">
                          {pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{pet.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {pet.breed ?? "未知品种"}
                        {pet.stomach_health === "sensitive" && " · 肠胃敏感"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft className="size-4 mr-1" />上一步
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Structured Ratings */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>结构化评分</CardTitle>
            <CardDescription>请对以下维度进行评分（1=很差, 5=很好）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RatingRow label="适口性" description="宠物是否爱吃" value={palatability} onChange={setPalatability} />
            <RatingRow label="排便情况" description="便便是否正常（1=很差, 5=很好）" value={stool} onChange={setStool} />
            <RatingRow label="黑下巴" description="是否有黑下巴问题（1=严重, 5=无）" value={blackChin} onChange={setBlackChin} />
            <RatingRow label="呕吐" description="是否有呕吐问题（1=频繁, 5=无）" value={vomit} onChange={setVomit} />
            <RatingRow label="泪痕" description="泪痕情况（1=严重, 5=无）" value={tearStain} onChange={setTearStain} />
            <RatingRow label="掉毛" description="掉毛情况（1=严重, 5=无）" value={shedding} onChange={setShedding} />
            <RatingRow label="毛发改善" description="毛发是否有改善" value={coat} onChange={setCoat} />
            <RatingRow label="精神状态" description="精力是否充沛" value={energy} onChange={setEnergy} />
            <RatingRow label="总体评分" description="你的综合评价" value={overall} onChange={setOverall} />

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ChevronLeft className="size-4 mr-1" />上一步
              </Button>
              <Button size="sm" className="ml-auto" onClick={() => setStep(4)}
                disabled={!palatability && !stool && !coat && !energy && !overall && !blackChin && !vomit && !tearStain && !shedding}>
                下一步<ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Detailed Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>详细反馈</CardTitle>
            <CardDescription>写下你的使用体验（可选但推荐，提高评价可信度）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>评价内容</Label>
              <Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                placeholder="分享一下你家宠物的使用体验，其他铲屎官需要你的真实反馈…" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优点 👍</Label>
                <Input value={pros} onChange={(e) => setPros(e.target.value)} placeholder="例如：适口性好，便便正常" />
              </div>
              <div className="space-y-2">
                <Label>缺点 👎</Label>
                <Input value={cons} onChange={(e) => setCons(e.target.value)} placeholder="例如：价格偏高" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>换粮过渡期（天）</Label>
              <Input type="number" value={transitionDays} onChange={(e) => setTransitionDays(e.target.value)}
                placeholder="如从旧粮切换到新粮用了几天" min={0} max={30} />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <RadioGroup value={wouldRepurchase === null ? "" : String(wouldRepurchase)} onValueChange={(v) => setWouldRepurchase(v === "true")} className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="true" id="repurchase-yes" />
                    <Label htmlFor="repurchase-yes">会复购</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="false" id="repurchase-no" />
                    <Label htmlFor="repurchase-no">不会复购</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="verified" checked={verifiedPurchase} onCheckedChange={(v) => setVerifiedPurchase(v === true)} />
                <Label htmlFor="verified" className="text-sm">我已购买并使用过此产品</Label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <ChevronLeft className="size-4 mr-1" />上一步
              </Button>
              <Button size="sm" className="ml-auto" onClick={() => setStep(5)}>
                下一步<ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Proof Upload */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>上传购买凭证</CardTitle>
            <CardDescription>上传购买记录、包装照片等凭证，提升评价可信度（可选）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-[rgba(0,0,0,0.1)] bg-[#F0EFED]/50 p-6 text-center transition-colors hover:border-[#FF7A59]/30">
              <Upload className="mx-auto size-8 text-[#6B6B6B]" />
              <p className="mt-2 text-sm text-[#6B6B6B]">点击或拖拽上传凭证图片</p>
              <p className="mt-1 text-xs text-[#6B6B6B]/60">支持 JPG/PNG，最多 5 张，每张不超过 5MB</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleProofUpload}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>

            {proofPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {proofPreviews.map((preview, i) => (
                  <div key={i} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`凭证 ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeProof(i)}
                      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#E85D4A] text-white text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-[#FF7A59]/20 bg-[#FF7A59]/5 p-4">
              <p className="text-sm font-medium text-[#FF7A59]">凭证说明</p>
              <ul className="mt-1 space-y-1 text-xs text-[#6B6B6B]">
                <li>购买小票 / 订单截图 / 包装正面照 / 批次号照片</li>
                <li>凭证将由 AI 系统进行真实性验证</li>
                <li>上传凭证可显著提升评价权重和信任分</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(4)}>
                <ChevronLeft className="size-4 mr-1" />上一步
              </Button>
              <Button size="sm" className="ml-auto" onClick={() => setStep(6)}>
                下一步<ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Confirm & Submit */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>确认提交</CardTitle>
            <CardDescription>提交后系统将定期提醒你进行长期追踪反馈</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow label="产品" value={productName ?? "已选择"} />
            <SummaryRow
              label="使用时长"
              value={
                usageDuration === "custom"
                  ? `自定义 ${customDays || "--"} 天`
                  : durations.find((d) => d.value === usageDuration)?.label
              }
            />
            <SummaryRow label="宠物" value={pets.find((p) => p.id === petId)?.name} />
            {overall && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">总体评分</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("size-4", i < overall ? "fill-amber-400 text-amber-400" : "text-muted")} />
                  ))}
                </div>
              </div>
            )}
            {wouldRepurchase !== null && (
              <SummaryRow label="是否复购" value={wouldRepurchase ? "会复购" : "不会复购"} />
            )}
            {reviewText && (
              <div>
                <span className="text-sm text-muted-foreground">评价内容</span>
                <p className="mt-1 text-sm bg-muted/50 rounded-lg p-3">{reviewText}</p>
              </div>
            )}
            {proofFiles.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">购买凭证</span>
                <div className="mt-1 flex gap-2">
                  {proofPreviews.map((preview, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={preview} alt={`凭证 ${i + 1}`} className="h-12 w-12 rounded object-cover" />
                  ))}
                </div>
              </div>
            )}

            {/* Followup reminder info */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">长期追踪提醒</p>
              <p className="mt-1 text-xs text-muted-foreground">
                提交后，系统将在第 7/14/30/60/90/180 天自动提醒你更新使用反馈。
                每次更新将提升你的评价可信度。
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(5)}>
                <ChevronLeft className="size-4 mr-1" />上一步
              </Button>
              <Button size="sm" className="ml-auto" onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                提交评价
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RatingRow({ label, description, value, onChange }: {
  label: string
  description: string
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => onChange(score)}
            className={cn(
              "p-0.5 transition-colors",
              value !== null && score <= value ? "text-amber-400" : "text-muted hover:text-amber-400/50"
            )}
          >
            <Star className={cn("size-5", value !== null && score <= value ? "fill-amber-400" : "")} />
          </button>
        ))}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "--"}</span>
    </div>
  )
}
