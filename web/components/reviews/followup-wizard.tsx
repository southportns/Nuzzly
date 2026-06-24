"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { createFollowupEntry, completeFollowupSchedule } from "@/lib/supabase/queries/followup-queries"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { ChevronLeft, Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = ["排便", "毛发", "精神", "喂食", "复购"]

export function FollowupWizard({
  scheduleId,
  productName,
  petName,
  followupDay,
}: {
  scheduleId: string
  productName: string
  petName: string
  followupDay: number
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [stool, setStool] = useState<string>("")
  const [coat, setCoat] = useState<string>("")
  const [energy, setEnergy] = useState<string>("")
  const [appetite, _setAppetite] = useState<string>("")
  const [continuedUsage, setContinuedUsage] = useState<boolean | null>(null)
  const [repurchase, setRepurchase] = useState<string>("")
  const [satisfaction, _setSatisfaction] = useState<number | null>(null)
  const [notes, setNotes] = useState("")

  async function handleSubmit() {
    if (!user) return
    setLoading(true)

    // P1: route through Write Gateway
    const entryError = await createFollowupEntry({
      schedule_id: scheduleId,
      stool_status: stool || null,
      coat_status: coat || null,
      energy_status: energy || null,
      appetite_status: appetite || null,
      continued_usage: continuedUsage,
      repurchase_intent: repurchase || null,
      overall_satisfaction: satisfaction,
      health_notes: notes || null,
    }, user.id)

    if (entryError.error) {
      toast.error(entryError.error.message)
      setLoading(false)
      return
    }

    // Mark schedule as completed
    await completeFollowupSchedule(scheduleId, user.id)

    setLoading(false)
    toast.success(`Day ${followupDay} 追踪反馈已提交！`)
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {steps.map((label, i) => (
            <span
              key={label}
              className={cn("text-xs", i + 1 === step ? "text-primary font-medium" : i + 1 < step ? "text-muted-foreground" : "text-muted-foreground/50")}
            >
              {i + 1 < step ? <CheckCircle2 className="size-3 inline mr-0.5" /> : null}
              {label}
            </span>
          ))}
        </div>
        <Progress value={step * 20} className="h-1.5" />
      </div>

      <div className="mb-4 text-center">
        <p className="text-sm text-muted-foreground">
          {productName} · {petName} · Day {followupDay}
        </p>
      </div>

      {/* Step 1: Stool */}
      {step === 1 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">💩 排便情况如何？</CardTitle>
            <CardDescription>使用 {productName} 后，{petName} 的排便状况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "improved", emoji: "🙂", label: "很好", desc: "成型正常，无异味加重" },
              { value: "unchanged", emoji: "😐", label: "一般", desc: "和之前差不多" },
              { value: "worsened", emoji: "😞", label: "不好", desc: "软便、腹泻或便秘" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStool(opt.value); setStep(2) }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
                  stool === opt.value && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => { setStool("not_applicable"); setStep(2) }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
            >
              跳过此问题
            </button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Coat */}
      {step === 2 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">✨ 毛发变化如何？</CardTitle>
            <CardDescription>使用后的毛发状态变化</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "improved", emoji: "✨", label: "更好了", desc: "毛发更亮、更顺滑" },
              { value: "unchanged", emoji: "😐", label: "没变化", desc: "和之前一样" },
              { value: "worsened", emoji: "😞", label: "更差了", desc: "干燥、掉毛增多" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setCoat(opt.value); setStep(3) }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
                  coat === opt.value && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => { setCoat("not_applicable"); setStep(3) }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
            >
              跳过此问题
            </button>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ChevronLeft className="size-4 mr-1" />上一步
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Energy */}
      {step === 3 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">⚡ 精神状态如何？</CardTitle>
            <CardDescription>宠物的精力和活跃程度</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "improved", emoji: "⚡", label: "活跃", desc: "比之前更有精力" },
              { value: "unchanged", emoji: "😐", label: "正常", desc: "和平时一样" },
              { value: "worsened", emoji: "😴", label: "低迷", desc: "比之前更懒散" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setEnergy(opt.value); setStep(4) }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
                  energy === opt.value && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => { setEnergy("not_applicable"); setStep(4) }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
            >
              跳过此问题
            </button>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              <ChevronLeft className="size-4 mr-1" />上一步
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Continued Usage */}
      {step === 4 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">🍽️ 是否继续喂食？</CardTitle>
            <CardDescription>你会继续给 {petName} 吃 {productName} 吗？</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: true, emoji: "✅", label: "是，继续喂食" },
              { value: false, emoji: "❌", label: "不，已经停了" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => { setContinuedUsage(opt.value); setStep(5) }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
                  continuedUsage === opt.value && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <p className="font-medium">{opt.label}</p>
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              <ChevronLeft className="size-4 mr-1" />上一步
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Repurchase + Submit */}
      {step === 5 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">❤️ 是否愿意复购？</CardTitle>
            <CardDescription>你会再次购买这个产品吗？</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "will_repurchase", emoji: "❤️", label: "会复购", desc: "愿意再次购买" },
              { value: "undecided", emoji: "🤔", label: "不确定", desc: "还在考虑" },
              { value: "will_not", emoji: "❌", label: "不会复购", desc: "不会再买" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRepurchase(opt.value)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
                  repurchase === opt.value && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}

            <div className="pt-4 space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="还有什么想补充的吗？（可选）"
                rows={2}
              />
              <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                提交追踪反馈
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep(4)}>
                <ChevronLeft className="size-4 mr-1" />上一步
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
