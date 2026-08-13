"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { createFollowupEntry, completeFollowupSchedule } from "@/lib/supabase/queries/followup-queries"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const steps = [" ", "", "", "Feeding", "Repurchase"]

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
if (loading) return
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
toast.success(`Day ${followupDay} TrackingFeedbackalreadySubmit！`)
router.push("/dashboard")
router.refresh()
}

return (<div className="mx-auto max-w-lg">
<div className="mb-6">
<div className="flex justify-between mb-2">
{steps.map((label, i) => (<span
key={label}
className={cn("text-xs", i + 1 === step? "text-primary font-medium": i + 1 < step? "text-muted-foreground": "text-muted-foreground/50")}
>
{i + 1 < step? <EmojiIcon name="CheckCircle2" className="size-3 inline mr-0.5" />: null}
{label}
</span>))}
</div>
<Progress value={step * 20} className="h-1.5" />
</div>

<div className="mb-4 text-center">
<p className="text-sm text-muted-foreground">
{productName} · {petName} · Day {followupDay}
</p>
</div>

{/* Step 1: Stool */}
{step === 1 && (<Card>
<CardHeader className="text-center">
<CardTitle className="text-xl">💩 How to？</CardTitle>
<CardDescription>used {productName} after,{petName} Condition</CardDescription>
</CardHeader>
<CardContent className="space-y-3">
{[
{ value: "improved", emoji: "🙂", label: "good ", desc: "Normal,No" },
{ value: "unchanged", emoji: "😐", label: "General", desc: " and not many " },
{ value: "worsened", emoji: "😞", label: "not good ", desc: "Soft Stool, or " },
].map((opt) => (<button
key={opt.value}
onClick={() => { setStool(opt.value); setStep(2) }}
className={cn("w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
stool === opt.value && "border-primary/50 bg-primary/5")}
>
<span className="text-2xl">{opt.emoji}</span>
<div>
<p className="font-medium">{opt.label}</p>
<p className="text-xs text-muted-foreground">{opt.desc}</p>
</div>
</button>))}
<button
onClick={() => { setStool("not_applicable"); setStep(2) }}
className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
>
past Question
</button>
</CardContent>
</Card>)}

{/* Step 2: Coat */}
{step === 2 && (<Card>
<CardHeader className="text-center">
<CardTitle className="text-xl">✨ ChangeHow to？</CardTitle>
<CardDescription>used after StatusChange</CardDescription>
</CardHeader>
<CardContent className="space-y-3">
{[
{ value: "improved", emoji: "✨", label: "good ", desc: "," },
{ value: "unchanged", emoji: "😐", label: "no Change", desc: " and a" },
{ value: "worsened", emoji: "😞", label: " ", desc: ",Sheddingmany " },
].map((opt) => (<button
key={opt.value}
onClick={() => { setCoat(opt.value); setStep(3) }}
className={cn("w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
coat === opt.value && "border-primary/50 bg-primary/5")}
>
<span className="text-2xl">{opt.emoji}</span>
<div>
<p className="font-medium">{opt.label}</p>
<p className="text-xs text-muted-foreground">{opt.desc}</p>
</div>
</button>))}
<button
onClick={() => { setCoat("not_applicable"); setStep(3) }}
className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
>
past Question
</button>
<Button variant="ghost" size="sm" onClick={() => setStep(1)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />Previous
</Button>
</CardContent>
</Card>)}

{/* Step 3: Energy */}
{step === 3 && (<Card>
<CardHeader className="text-center">
<CardTitle className="text-xl">⚡ StatusHow to？</CardTitle>
<CardDescription>Pet and </CardDescription>
</CardHeader>
<CardContent className="space-y-3">
{[
{ value: "improved", emoji: "⚡", label: "", desc: " has" },
{ value: "unchanged", emoji: "😐", label: "Normal", desc: " and a" },
{ value: "worsened", emoji: "😴", label: "low ", desc: " " },
].map((opt) => (<button
key={opt.value}
onClick={() => { setEnergy(opt.value); setStep(4) }}
className={cn("w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
energy === opt.value && "border-primary/50 bg-primary/5")}
>
<span className="text-2xl">{opt.emoji}</span>
<div>
<p className="font-medium">{opt.label}</p>
<p className="text-xs text-muted-foreground">{opt.desc}</p>
</div>
</button>))}
<button
onClick={() => { setEnergy("not_applicable"); setStep(4) }}
className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
>
past Question
</button>
<Button variant="ghost" size="sm" onClick={() => setStep(2)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />Previous
</Button>
</CardContent>
</Card>)}

{/* Step 4: Continued Usage */}
{step === 4 && (<Card>
<CardHeader className="text-center">
<CardTitle className="text-xl">🍽️ WhetherFeeding？</CardTitle>
<CardDescription>you will to {petName} {productName} ？</CardDescription>
</CardHeader>
<CardContent className="space-y-3">
{[
{ value: true, emoji: "✅", label: "Yes,Feeding" },
{ value: false, emoji: "❌", label: "not,already " },
].map((opt) => (<button
key={String(opt.value)}
onClick={() => { setContinuedUsage(opt.value); setStep(5) }}
className={cn("w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
continuedUsage === opt.value && "border-primary/50 bg-primary/5")}
>
<span className="text-2xl">{opt.emoji}</span>
<p className="font-medium">{opt.label}</p>
</button>))}
<Button variant="ghost" size="sm" onClick={() => setStep(3)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />Previous
</Button>
</CardContent>
</Card>)}

{/* Step 5: Repurchase + Submit */}
{step === 5 && (<Card>
<CardHeader className="text-center">
<CardTitle className="text-xl">❤️ WhetherRepurchase？</CardTitle>
<CardDescription>you will again this products？</CardDescription>
</CardHeader>
<CardContent className="space-y-3">
{[
{ value: "will_repurchase", emoji: "❤️", label: "will Repurchase", desc: "again " },
{ value: "undecided", emoji: "🤔", label: "not ", desc: "still " },
{ value: "will_not", emoji: "❌", label: "not will Repurchase", desc: "not will again " },
].map((opt) => (<button
key={opt.value}
onClick={() => setRepurchase(opt.value)}
className={cn("w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
repurchase === opt.value && "border-primary/50 bg-primary/5")}
>
<span className="text-2xl">{opt.emoji}</span>
<div>
<p className="font-medium">{opt.label}</p>
<p className="text-xs text-muted-foreground">{opt.desc}</p>
</div>
</button>))}

<div className="pt-4 space-y-3">
<Textarea
value={notes}
onChange={(e) => setNotes(e.target.value)}
placeholder="still hasWhat ？(Optional)"
rows={2}
/>
<Button className="w-full" onClick={handleSubmit} disabled={loading}>
{loading && <EmojiIcon name="Loader2" className="size-4 mr-2 animate-spin" />}
SubmitTrackingFeedback
</Button>
<Button variant="ghost" size="sm" className="w-full" onClick={() => setStep(4)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />Previous
</Button>
</div>
</CardContent>
</Card>)}
</div>)
}
