"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
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
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

type DurationBucketValue =
| "lt_1w"
| "1w_to_2w"
| "2w_to_1m"
| "1m_to_3m"
| "m6"
| "m6_to_1y"
| "gt_1y"
| "custom"

interface Pet {
id: string
name: string
breed: string | null
species: string
stomach_health: string
photo_url?: string | null
}

export function ReviewWizard({ productId, productName }: { productId: string; productName?: string }) {
const t = useTranslations("Review")
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

const durations = useMemo<{ value: DurationBucketValue; label: string; days: string }[]>(() => [
{ value: "lt_1w", label: t("durationLt1w"), days: t("durationLt1wDays") },
{ value: "1w_to_2w", label: t("duration1w2w"), days: t("duration1w2wDays") },
{ value: "2w_to_1m", label: t("duration2w1m"), days: t("duration2w1mDays") },
{ value: "1m_to_3m", label: t("duration1m3m"), days: t("duration1m3mDays") },
{ value: "m6", label: t("duration6m"), days: t("duration6mDays") },
{ value: "m6_to_1y", label: t("duration6m1y"), days: t("duration6m1yDays") },
{ value: "gt_1y", label: t("durationGt1y"), days: t("durationGt1yDays") },
{ value: "custom", label: t("durationCustom"), days: t("durationCustomDays") },
], [t])

function trustLabel(v: DurationBucketValue): string {
switch (v) {
case "gt_1y":
case "m6_to_1y":
return t("highestCredibility")
case "m6":
case "1m_to_3m":
return t("highCredibility")
case "custom":
return t("scoredByActualDays")
default:
return ""
}
}

function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
const files = Array.from(e.target.files ?? [])
if (files.length + proofFiles.length > 5) {
toast.error(t("maxUpload"))
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
const petsData = data as unknown as Pet[] | null
setPets(petsData ?? [])
})
}
}, [step, user])

async function handleSubmit() {
if (loading) return
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
toast.error(reviewResult.error ?? t("submitFailed"))
return
}

const reviewId = reviewResult.reviewId

if (proofFiles.length > 0) {
for (const file of proofFiles) {
const voucherResult = await submitReviewVoucherAction(reviewId, file, user.id)
if (!voucherResult.success) {
toast.error(t("uploadFailed", { error: voucherResult.error ?? "Unknown error" }))
}
}
}

fetch(`/api/reviews/${reviewId}/process-timeline`, { method: "POST" }).catch(() => {})

toast.success(t("submitSuccess"))
router.push(`/products/${productId}`)
router.refresh()
}

const stepLabels = [t("selectDuration"), t("selectPet"), t("structuredFeedback"), t("review"), t("upload"), t("submit")]

return (<div className="mx-auto max-w-lg">
{/* Progress */}
<div className="mb-8">
<div className="flex justify-between mb-2">
{stepLabels.map((label, i) => (<span key={i} className={cn("text-xs", i + 1 === step ? "text-primary font-medium" : i + 1 < step ? "text-muted-foreground" : "text-muted-foreground/50")}>
{i + 1 < step ? <EmojiIcon name="CheckCircle2" className="size-3 inline mr-0.5" /> : null}
{label}
</span>))}
</div>
<Progress value={step * (100 / 6)} className="h-1.5" />
</div>

{/* Step 1: Usage Duration */}
{step === 1 && (<Card>
<CardHeader>
<CardTitle>{t("howLongUsed")}</CardTitle>
<CardDescription>{productName ?? t("selectUsageDuration")}</CardDescription>
</CardHeader>
<CardContent>
<div className="space-y-2">
{durations.map((d) => (<button
key={d.value}
type="button"
onClick={() => {
setUsageDuration(d.value)
if (d.value !== "custom") setStep(2)
}}
className={cn("w-full flex items-center justify-between rounded-lg border border-border/40 p-4 text-left transition-colors hover:bg-muted/50",
usageDuration === d.value && "border-primary/50 bg-primary/5")}
>
<div>
<span className="font-medium">{d.label}</span>
<p className="text-xs text-muted-foreground">{d.days}</p>
</div>
<Badge variant="outline" className="gap-1">
<EmojiIcon name="Clock" className="size-3" />
{trustLabel(d.value)}
</Badge>
</button>))}
</div>

{usageDuration === "custom" && (<div className="mt-4 space-y-3 rounded-lg border border-border/40 bg-muted/30 p-4">
<Label htmlFor="custom-days">{t("customDaysLabel")}</Label>
<Input
id="custom-days"
type="number"
min={1}
max={3650}
value={customDays}
onChange={(e) => setCustomDays(e.target.value)}
placeholder={t("customDaysPlaceholder")}
/>
<p className="text-xs text-muted-foreground">{t("customDaysHint")}</p>
<div className="flex justify-end pt-1">
<Button
size="sm"
onClick={() => setStep(2)}
disabled={!customDays || Number(customDays) < 1 || Number(customDays) > 3650}
>
{t("next")}<EmojiIcon name="ChevronRight" className="size-4 ml-1" />
</Button>
</div>
</div>)}
</CardContent>
</Card>)}

{/* Step 2: Pet Selection */}
{step === 2 && (<Card>
<CardHeader>
<CardTitle>{t("selectPetTitle")}</CardTitle>
<CardDescription>{t("selectPetDesc")}</CardDescription>
</CardHeader>
<CardContent>
{pets.length === 0 ? (<div className="text-center py-6">
<p className="text-muted-foreground text-sm mb-4">{t("noPetProfile")}</p>
<Button variant="outline" onClick={() => router.push("/pets/new")}>{t("createPetProfile")}</Button>
</div>) : (<div className="space-y-2">
{pets.map((pet) => (<button
key={pet.id}
onClick={() => { setPetId(pet.id); setStep(3) }}
className={cn("w-full flex items-center gap-3 rounded-lg border border-border/40 p-4 text-left transition-colors hover:bg-muted/50",
petId === pet.id && "border-primary/50 bg-primary/5")}
>
<div className="relative flex size-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
{pet.photo_url ? (<Image src={pet.photo_url} alt={pet.name} fill className="object-cover" sizes="40px" />) : (<div className="flex size-full items-center justify-center text-lg">
{pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
</div>)}
</div>
<div>
<span className="font-medium">{pet.name}</span>
<p className="text-xs text-muted-foreground">
{pet.breed ?? t("unknownBreed")}
{pet.stomach_health === "sensitive" && ` · ${t("stomachSensitive")}`}
</p>
</div>
</button>))}
</div>)}
<div className="flex gap-2 mt-4">
<Button variant="ghost" size="sm" onClick={() => setStep(1)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />{t("previous")}
</Button>
</div>
</CardContent>
</Card>)}

{/* Step 3: Structured Ratings */}
{step === 3 && (<Card>
<CardHeader>
<CardTitle>{t("structuredRating")}</CardTitle>
<CardDescription>{t("ratingDesc")}</CardDescription>
</CardHeader>
<CardContent className="space-y-6">
<RatingRow label={t("palatability")} description={t("palatabilityDesc")} value={palatability} onChange={setPalatability} />
<RatingRow label={t("stool")} description={t("stoolDesc")} value={stool} onChange={setStool} />
<RatingRow label={t("blackChin")} description={t("blackChinDesc")} value={blackChin} onChange={setBlackChin} />
<RatingRow label={t("vomit")} description={t("vomitDesc")} value={vomit} onChange={setVomit} />
<RatingRow label={t("tearStain")} description={t("tearStainDesc")} value={tearStain} onChange={setTearStain} />
<RatingRow label={t("shedding")} description={t("sheddingDesc")} value={shedding} onChange={setShedding} />
<RatingRow label={t("coat")} description={t("coatDesc")} value={coat} onChange={setCoat} />
<RatingRow label={t("energy")} description={t("energyDesc")} value={energy} onChange={setEnergy} />
<RatingRow label={t("overall")} description={t("overallDesc")} value={overall} onChange={setOverall} />

<div className="flex gap-2 pt-2">
<Button variant="ghost" size="sm" onClick={() => setStep(2)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />{t("previous")}
</Button>
<Button size="sm" className="ml-auto" onClick={() => setStep(4)}
disabled={!palatability && !stool && !coat && !energy && !overall && !blackChin && !vomit && !tearStain && !shedding}>
{t("next")}<EmojiIcon name="ChevronRight" className="size-4 ml-1" />
</Button>
</div>
</CardContent>
</Card>)}

{/* Step 4: Detailed Review */}
{step === 4 && (<Card>
<CardHeader>
<CardTitle>{t("detailedReview")}</CardTitle>
<CardDescription>{t("detailedReviewDesc")}</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<div className="space-y-2">
<Label>{t("reviewText")}</Label>
<Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
placeholder={t("reviewTextPlaceholder")} rows={4} />
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label>{t("pros")}</Label>
<Input value={pros} onChange={(e) => setPros(e.target.value)} placeholder={t("prosPlaceholder")} />
</div>
<div className="space-y-2">
<Label>{t("cons")}</Label>
<Input value={cons} onChange={(e) => setCons(e.target.value)} placeholder={t("consPlaceholder")} />
</div>
</div>
<div className="space-y-2">
<Label>{t("transitionDays")}</Label>
<Input type="number" value={transitionDays} onChange={(e) => setTransitionDays(e.target.value)}
placeholder={t("transitionDaysPlaceholder")} min={0} max={30} />
</div>
<div className="space-y-3 pt-2">
<div className="flex items-center gap-2">
<RadioGroup value={wouldRepurchase === null ? "" : String(wouldRepurchase)} onValueChange={(v) => setWouldRepurchase(v === "true")} className="flex gap-4">
<div className="flex items-center gap-1.5">
<RadioGroupItem value="true" id="repurchase-yes" />
<Label htmlFor="repurchase-yes">{t("repurchaseYes")}</Label>
</div>
<div className="flex items-center gap-1.5">
<RadioGroupItem value="false" id="repurchase-no" />
<Label htmlFor="repurchase-no">{t("repurchaseNo")}</Label>
</div>
</RadioGroup>
</div>
<div className="flex items-center space-x-2">
<Checkbox id="verified" checked={verifiedPurchase} onCheckedChange={(v) => setVerifiedPurchase(v === true)} />
<Label htmlFor="verified" className="text-sm">{t("verifiedPurchase")}</Label>
</div>
</div>
<div className="flex gap-2 pt-2">
<Button variant="ghost" size="sm" onClick={() => setStep(3)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />{t("previous")}
</Button>
<Button size="sm" className="ml-auto" onClick={() => setStep(5)}>
{t("next")}<EmojiIcon name="ChevronRight" className="size-4 ml-1" />
</Button>
</div>
</CardContent>
</Card>)}

{/* Step 5: Proof Upload */}
{step === 5 && (<Card>
<CardHeader>
<CardTitle>{t("uploadTitle")}</CardTitle>
<CardDescription>{t("uploadDesc")}</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<div className="rounded-lg border-2 border-dashed border-[rgba(0,0,0,0.1)] bg-[#F0EFED]/50 p-6 text-center transition-colors hover:border-[#FF7A59]/30">
<EmojiIcon name="Upload" className="mx-auto size-8 text-[#6B6B6B]" />
<p className="mt-2 text-sm text-[#6B6B6B]">{t("clickToUpload")}</p>
<p className="mt-1 text-xs text-[#6B6B6B]/60">{t("uploadFormats")}</p>
<input
type="file"
accept="image/*"
multiple
onChange={handleProofUpload}
className="absolute inset-0 cursor-pointer opacity-0"
/>
</div>

{proofPreviews.length > 0 && (<div className="grid grid-cols-3 gap-3">
{proofPreviews.map((preview, i) => (<div key={i} className="group relative">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={preview} alt={`Proof ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
<button
type="button"
onClick={() => removeProof(i)}
className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#E85D4A] text-white text-xs opacity-0 transition-opacity group-hover:opacity-100"
>
&times;
</button>
</div>))}
</div>)}

<div className="rounded-lg border border-[#FF7A59]/20 bg-[#FF7A59]/5 p-4">
<p className="text-sm font-medium text-[#FF7A59]">{t("uploadBenefitTitle")}</p>
<ul className="mt-1 space-y-1 text-xs text-[#6B6B6B]">
<li>{t("uploadBenefit1")}</li>
<li>{t("uploadBenefit2")}</li>
<li>{t("uploadBenefit3")}</li>
</ul>
</div>

<div className="flex gap-2 pt-2">
<Button variant="ghost" size="sm" onClick={() => setStep(4)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />{t("previous")}
</Button>
<Button size="sm" className="ml-auto" onClick={() => setStep(6)}>
{t("next")}<EmojiIcon name="ChevronRight" className="size-4 ml-1" />
</Button>
</div>
</CardContent>
</Card>)}

{/* Step 6: Confirm & Submit */}
{step === 6 && (<Card>
<CardHeader>
<CardTitle>{t("confirmSubmit")}</CardTitle>
<CardDescription>{t("confirmSubmitDesc")}</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<SummaryRow label={t("product")} value={productName ?? "--"} />
<SummaryRow
label={t("usageDuration")}
value={
usageDuration === "custom" ? `${t("durationCustom")} ${customDays || "--"}` : durations.find((d) => d.value === usageDuration)?.label
}
/>
<SummaryRow label={t("pet")} value={pets.find((p) => p.id === petId)?.name} />
{overall && (<div className="flex items-center gap-2">
<span className="text-sm text-muted-foreground">{t("rating")}</span>
<div className="flex gap-0.5">
{Array.from({ length: 5 }).map((_, i) => (<EmojiIcon name="Star" key={i} className={cn("size-4", i < overall ? "fill-amber-400 text-amber-400" : "text-muted")} />))}
</div>
</div>)}
{wouldRepurchase !== null && (<SummaryRow label={t("repurchaseLabel")} value={wouldRepurchase ? t("repurchaseYes") : t("repurchaseNo")} />)}
{reviewText && (<div>
<span className="text-sm text-muted-foreground">{t("reviewText")}</span>
<p className="mt-1 text-sm bg-muted/50 rounded-lg p-3">{reviewText}</p>
</div>)}
{proofFiles.length > 0 && (<div>
<span className="text-sm text-muted-foreground">{t("proofImages")}</span>
<div className="mt-1 flex gap-2">
{proofPreviews.map((preview, i) => (// eslint-disable-next-line @next/next/no-img-element
<img key={i} src={preview} alt={`Proof ${i + 1}`} className="h-12 w-12 rounded object-cover" />))}
</div>
</div>)}

{/* Followup reminder info */}
<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
<p className="text-sm font-medium text-primary">{t("longTrackingReminder")}</p>
<p className="mt-1 text-xs text-muted-foreground">
{t("longTrackingDesc")}
</p>
</div>

<div className="flex gap-2 pt-2">
<Button variant="ghost" size="sm" onClick={() => setStep(5)}>
<EmojiIcon name="ChevronLeft" className="size-4 mr-1" />{t("previous")}
</Button>
<Button size="sm" className="ml-auto" onClick={handleSubmit} disabled={loading}>
{loading && <EmojiIcon name="Loader2" className="size-4 mr-2 animate-spin" />}
{t("submitReview")}
</Button>
</div>
</CardContent>
</Card>)}
</div>)
}

function RatingRow({ label, description, value, onChange }: {
label: string
description: string
value: number | null
onChange: (v: number) => void
}) {
return (<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium">{label}</p>
<p className="text-xs text-muted-foreground">{description}</p>
</div>
<div className="flex gap-1">
{[1, 2, 3, 4, 5].map((score) => (<button
key={score}
onClick={() => onChange(score)}
className={cn("p-0.5 transition-colors",
value !== null && score <= value ? "text-amber-400" : "text-muted hover:text-amber-400/50")}
>
<EmojiIcon name="Star" className={cn("size-5", value !== null && score <= value ? "fill-amber-400" : "")} />
</button>))}
</div>
</div>)
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
return (<div className="flex justify-between text-sm">
<span className="text-muted-foreground">{label}</span>
<span className="font-medium">{value ?? "--"}</span>
</div>)
}
