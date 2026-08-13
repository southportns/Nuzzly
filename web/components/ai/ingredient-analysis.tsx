"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SelectDropdown, type SelectOption } from "@/components/ui/select-dropdown"
import { MarkdownRenderer } from "@/components/ai/markdown-renderer"
import { useTranslations } from "next-intl"

// Images压缩:避免large 图直接 base64 导致please求体past large
// 最long 边Limit 1280px,JPEG 质量 0.85,足 retainedIngredients表文 chars清晰度
async function compressImage(file: File, maxSize = 1280, quality = 0.85): Promise<string> {
return new Promise((resolve, reject) => {
const reader = new FileReader()
reader.onload = (e) => {
const img = new Image()
img.onload = () => {
const canvas = document.createElement("canvas")
let { width, height } = img
if (width > maxSize || height > maxSize) {
if (width > height) {
height = (height * maxSize) / width
width = maxSize
} else {
width = (width * maxSize) / height
height = maxSize
}
}
canvas.width = width
canvas.height = height
const ctx = canvas.getContext("2d")
if (!ctx) {
reject(new Error("Canvas not supported"))
return
}
ctx.drawImage(img, 0, 0, width, height)
resolve(canvas.toDataURL("image/jpeg", quality))
}
img.onerror = () => reject(new Error("Image failed to load"))
img.src = e.target?.result as string
}
reader.onerror = () => reject(new Error("File read failed"))
reader.readAsDataURL(file)
})
}

interface Pet {
id: string
name: string
breed: string | null
species: string
stomach_health: string
}

interface AnalysisResult {
ingredients: Array<{
name: string
type: string
percentage?: number
risk_level: "low" | "medium" | "high"
description: string
suitable_for: string[]
}>
summary: string
protein_source: string
risk_summary: string
suitable_breeds: string[]
warnings: string[]
}

export function IngredientAnalysis() {
const { user } = useAuth()
const supabase = createClient()
const [mode, setMode] = useState<"text" | "image">("text")
const [input, setInput] = useState("")
const [imageFile, setImageFile] = useState<File | null>(null)
const [imagePreview, setImagePreview] = useState<string>("") // after data URL, after
const [loading, setLoading] = useState(false)
const [result, setResult] = useState<AnalysisResult | null>(null)
const [error, setError] = useState("")
const t = useTranslations("AI")

// PetSelect
const [pets, setPets] = useState<Pet[]>([])
const [selectedPetId, setSelectedPetId] = useState("")
const [loadingPets, setLoadingPets] = useState(true)

const fileInputRef = useRef<HTMLInputElement>(null)

// 加载UserPet列表
useEffect(() => {
if (!user) return
supabase.from("pets").select("id,name,breed,species,stomach_health").eq("profile_id", user.id).eq("is_active", true).then(({ data }) => {
const petsData = data as unknown as Pet[] | null
setPets(petsData?? [])
setLoadingPets(false)
})
}, [user])

// Selected Petfor object(use on 端 prompt 拼接)
const selectedPet = pets.find((p) => p.id === selectedPetId) || null

function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
const file = e.target.files?.[0]
if (!file) return
processImageFile(file)
}

async function processImageFile(file: File) {
if (!file.type.startsWith("image/")) {
setError(t("uploadImageHint"))
return
}
if (file.size > 10 * 1024 * 1024) {
setError(t("uploadImageFormats"))
return
}
setError("")
setResult(null)
try {
const compressed = await compressImage(file)
setImageFile(file)
setImagePreview(compressed)
} catch (err) {
setError(err instanceof Error ? err.message : t("analysisResultTitle"))
}
}

function handleDrop(e: React.DragEvent) {
e.preventDefault()
const file = e.dataTransfer.files[0]
if (file) processImageFile(file)
}

function removeImage() {
setImageFile(null)
setImagePreview("")
if (fileInputRef.current) fileInputRef.current.value = ""
}

// 构建Pet信息文本(文 chars模式use on prompt 拼接)
function buildPetContextText(): string {
if (!selectedPet) return ""
const parts: string[] = []
parts.push(`Breed:${selectedPet.breed?? "Unknown"}`)
parts.push(`:${selectedPet.species === "cat"? "": selectedPet.species === "dog"? "": selectedPet.species}`)
if (selectedPet.stomach_health === "sensitive") {
parts.push("StomachCondition:Sensitive(need toNotehypoallergenic)")
} else if (selectedPet.stomach_health === "normal") {
parts.push("StomachCondition:Normal")
}
return `when Analysis Pet:${selectedPet.name}(${parts.join(",")})`
}

async function handleAnalyze() {
let endpoint = "/api/ai/chat"
let body:
| { messages: Array<{ role: string; content: string }> }
| { image: string; petId?: string }

const petContext = buildPetContextText()

if (mode === "text") {
if (!input.trim()) return
endpoint = "/api/ai/chat"
const petHint = petContext? `${petContext}\n\n`: ""
// DeepSeek API for system 角色支持not Stable,统ause user 角色
// 角色设定 and 格式 求作 for the first user Messages,ActualIngredients表作 for 第二 user Messages
body = {
messages: [
{
role: "user",
content: `You are"Pomi"🐱,Town canSmartPet.I will to you a Cat Food/Dog FoodIngredients chars,pleaseyou Markdown structureoutput AnalysisResult:

### 1.
2-3.

### 2. Analysis,,Fat,FeatureAddCategory, bullet not past 30 chars,use **low / /high Risk** RiskGrade.

### 3. NutritionMetricReview
ReviewCrude Protein,Crude Fat,FiberWhether(Cat FoodCrude Protein≥30%,≥25%;Dog FoodCrude Protein≥25%).

### 4. for object
 and not PetType.

### 5. notes
max 3 trueneed to.

open "~" or "~",when emoji,not Duplicate.`,
},
{
role: "user",
content: `${petHint}pleaseAnalysis Ingredients, Markdown structureoutput:\n\n${input}`,
},
],
}
} else {
if (!imagePreview) return
endpoint = "/api/ai/ingredient-vision"
body = selectedPetId? { image: imagePreview, petId: selectedPetId }: { image: imagePreview }
}

setLoading(true)
setError("")
setResult(null)

try {
const response = await fetch(endpoint, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
})

if (!response.ok) {
const err = await response.json().catch(() => ({ error: t("recommendFailed") }))
throw new Error(err.error ?? t("recommendFailed"))
}

// 读取 SSE 流
const reader = response.body?.getReader()
const decoder = new TextDecoder()
let summary = ""
// 循环检测:防止 LLM 陷 token Duplicate循环(if反复output "磷酸氢二钠")
// new Strategy:检测严格Duplicate short token 连续 现many 次,避免 Normal列表项误杀
let loopDetected = false

if (reader) {
while (!loopDetected) {
const { done, value } = await reader.read()
if (done) break
const chunk = decoder.decode(value, { stream: true })
const lines = chunk.split("\n").filter((l) => l.startsWith("data: "))
for (const line of lines) {
const data = line.replace("data: ", "").trim()
if (data === "[DONE]") continue
try {
const parsed = JSON.parse(data)
const text = parsed.choices?.[0]?.delta?.content?? ""
summary += text

// 循环检测: based on on token 粒度 连续Duplicate判断
// GLM-4V-Flash 循环时通常Yes同ashort token(2-8 chars符)连续 现
if (text && summary.length > 80) {
const tail = summary.slice(-80)
// Strategy A:检测同a token Whether连续 现 8 次 (if "磷酸氢二钠,磷酸氢二钠,磷酸氢二钠...")
// use 分隔符拆分 after 判断末尾 token 连续次数
const separatorPattern = /[,,;;,.\. ]/
const tokens = tail.split(separatorPattern).filter((t) => t.trim().length > 0)
if (tokens.length >= 8) {
const lastToken = tokens[tokens.length - 1]
let repeatCount = 0
for (let i = tokens.length - 1; i >= 0; i--) {
if (tokens[i] === lastToken) repeatCount++
else break
}
// only has同a token 末尾连续 现 8 次,才Determine for 循环
if (repeatCount >= 8) {
loopDetected = true
console.warn(`[ingredient-analysis] to token Duplicate,.Duplicate token: "${lastToken}",: ${repeatCount}`,)
break
}
}

// Strategy B:检测末尾 80 chars符 Whether存 5-14 chars符 段连续Duplicate 5+ 次
// 段long 度至few 5,避免 常见short 词(if"蛋白""vitamins")误判
for (let fragLen = 5; fragLen <= 14; fragLen++) {
const frag = tail.slice(-fragLen)
if (frag.trim().length < fragLen) continue
let count = 0
let pos = 0
while ((pos = tail.indexOf(frag, pos))!== -1) {
count++
pos += Math.max(1, fragLen - 1)
}
if (count >= 5) {
loopDetected = true
console.warn(`[ingredient-analysis] to Duplicate,.Duplicate: "${frag}",: ${count}`,)
break
}
}
}
} catch {}
if (loopDetected) break
}
}
if (loopDetected) {
try {
await reader.cancel()
} catch {}
// to 截断 容a 收尾标记
summary += `\n\n> ⚠️ ${t("loopDetectedWarning")}`
}
}

setResult({
ingredients: [],
summary: summary || t("analysisResultTitle"),
protein_source: "",
risk_summary: "",
suitable_breeds: [],
warnings: [],
})
} catch (err) {
setError(err instanceof Error ? err.message : t("recommendFailed"))
}
setLoading(false)
}

const canAnalyze = mode === "text"?!!input.trim():!!imagePreview
const isAnalyzing = loading

return (<div className="space-y-6">
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2 text-base">
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-4 text-[#FF7A59]">
<g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)">
<path d="M8.5 12.75L10.75 15L8.5 17.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
<path d="M4.655 4.505C3.4774 5.6413 2.75 7.2359 2.75 9C2.75 12.452 5.55 15.25 9 15.25C9.6 15.25 10.17 15.166 10.72 15.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
<path d="M9.5 5.25L7.25 3L9.5 0.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" data-color="color-2" fill="none" />
<path d="M13.3444 13.4937C14.5146 12.3575 15.25 10.7634 15.25 9C15.25 5.548 12.45 2.75 9.00002 2.75C8.42002 2.75 7.86002 2.82895 7.33002 2.97595" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" data-color="color-2" fill="none" />
</g>
</svg>
{t("ingredientAnalysisTitle")}
</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<p className="text-sm text-[#6B6B6B]">
{t("ingredientAnalysisDesc")}
</p>

{/* PetSelect */}
{loadingPets? (<Skeleton className="h-10 w-full rounded-lg" />): pets.length === 0? (<div className="rounded-xl border border-dashed border-[#E0DFDD] bg-[#FAFAF9] p-3 text-center text-[12px] text-[#6B6B6B]">
{t("noPetForAnalysis")}
<Link href="/dashboard/pets/new" className="text-[#FF7A59] mx-1 hover:underline">{t("addPetForAnalysis")}</Link>
{t("addPetForAnalysisSuffix")}
</div>): (<div>
<label className="text-xs text-[#6B6B6B] mb-1.5 block">{t("selectPetOptional")}</label>
<SelectDropdown
value={selectedPetId}
onChange={setSelectedPetId}
options={pets.map<SelectOption>((pet) => ({
value: pet.id,
label: `${pet.name} · ${pet.breed?? t("unknownBreed")}${pet.stomach_health === "sensitive"? ` · ${t("sensitiveStomach")}`: ""}`,
icon: <EmojiIcon name="PawPrint" className="size-4 text-[#FF7A59]" />,
}))}
placeholder={t("selectPetPlaceholderOptional")}
/>
</div>)}

{/* Mode toggle */}
<div className="flex gap-2">
<button
onClick={() => setMode("text")}
className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
mode === "text"? "bg-[#FF7A59]/10 text-[#FF7A59]": "bg-[#F0EFED] text-[#6B6B6B] hover:bg-[#E5E4E2]"
}`}
>
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-3.5">
<g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)">
<path d="M14.25,15.5H3.75c-1.517,0-2.75-1.233-2.75-2.75v-.75c0-.414,.336-.75,.75-.75s.75,.336,.75,.75v.75c0,.689,.561,1.25,1.25,1.25H14.25c.689,0,1.25-.561,1.25-1.25v-.75c0-.414,.336-.75,.75-.75s.75,.336,.75,.75v.75c0,1.517-1.233,2.75-2.75,2.75Z" fill="currentColor" />
<path d="M16.25,6.75c-.414,0-.75-.336-.75-.75v-.75c0-.689-.561-1.25-1.25-1.25H3.75c-.689,0-1.25,.561-1.25,1.25v.75c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75v-.75c0-1.517,1.233-2.75,2.75-2.75H14.25c1.517,0,2.75,1.233,2.75,2.75v.75c0,.414-.336,.75-.75,.75Z" fill="currentColor" />
<path d="M12.489,11.959l-2.73-6.5c-.117-.278-.39-.459-.691-.459h-.135c-.302,0-.574,.181-.691,.459l-2.73,6.5c-.16,.382,.02,.822,.401,.982,.379,.16,.821-.018,.981-.401l.437-1.041h3.339l.437,1.041c.12,.287,.398,.459,.691,.459,.097,0,.195-.019,.29-.059,.382-.16,.562-.6,.401-.982Zm-4.528-1.959l1.039-2.474,1.039,2.474h-2.078Z" fill="currentColor" data-color="color-2" />
<circle cx="1.75" cy="9" r=".75" fill="currentColor" />
<circle cx="16.25" cy="9" r=".75" fill="currentColor" />
</g>
</svg>
{t("textInput")}
</button>
<button
onClick={() => setMode("image")}
className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
mode === "image"? "bg-[#FF7A59]/10 text-[#FF7A59]": "bg-[#F0EFED] text-[#6B6B6B] hover:bg-[#E5E4E2]"
}`}
>
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18" className="size-3.5">
<g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)">
<path d="M6.587,12.243l5.206-5.2c.391-.391,1.024-.391,1.414,0l3.043,3.043" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
<path d="M1.75,6.75v6.5c0,1.105,.895,2,2,2H12.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
<rect x="4.75" y="2.75" width="11.5" height="9.5" rx="2" ry="2" transform="translate(21 15) rotate(180)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<path d="M8,7c-.551,0-1-.449-1-1s.449-1,1-1,1,.449,1,1-.449,1-1,1Z" fill="currentColor" data-color="color-2" />
</g>
</svg>
{t("imageInput")}
</button>
</div>

{/* Text input mode */}
{mode === "text" && (<Textarea
value={input}
onChange={(e) => setInput(e.target.value)}
placeholder={t("textInputPlaceholder")}
rows={5}
/>)}

{/* Image upload mode */}
{mode === "image" && (<div className="space-y-3">
<input
ref={fileInputRef}
type="file"
accept="image/*"
className="hidden"
onChange={handleImageSelect}
/>

{!imagePreview? (<div
onClick={() => fileInputRef.current?.click()}
onDragOver={(e) => e.preventDefault()}
onDrop={handleDrop}
className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#E0DFDD] bg-[#FAFAF9] p-8 transition-colors hover:border-[#FF7A59]/40 hover:bg-[#FF7A59]/5 cursor-pointer"
>
<div className="flex size-12 items-center justify-center rounded-full bg-[#F0EFED]">
<EmojiIcon name="Upload" className="size-5 text-[#6B6B6B]" />
</div>
<div className="text-center">
<p className="text-[13px] font-medium text-[#111111]">{t("uploadImageHint")}</p>
<p className="mt-1 text-[11px] text-[#A0A09E]"> {t("uploadImageFormats")}</p>
</div>
</div>): (<div className="space-y-3">
<div className="relative">
<img
src={imagePreview}
alt="IngredientsPreview"
className="w-full rounded-2xl border border-[rgba(0,0,0,0.05)] object-contain max-h-64"
/>
<button
onClick={removeImage}
className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
>
<EmojiIcon name="X" className="size-4" />
</button>
</div>
</div>)}
</div>)}

<Button onClick={handleAnalyze} disabled={isAnalyzing ||!canAnalyze}>
{isAnalyzing && <EmojiIcon name="Loader2" className="mr-2 size-4 animate-spin" />}
{isAnalyzing? t("aiAnalyzing"): t("startAnalysis")}
</Button>
</CardContent>
</Card>

{error && (<div className="rounded-[12px] border border-[#E85D4A]/20 bg-[#E85D4A]/5 p-4">
<p className="text-sm text-[#E85D4A]">
<EmojiIcon name="AlertTriangle" className="mr-2 inline size-4" />{error}
</p>
</div>)}

{result && (<Card>
<CardContent className="pt-6 space-y-4">
{/* AI Analysis:used MarkdownRenderer, and Free Chata */}
<div className="rounded-lg bg-[#F0EFED] p-4">
<p className="text-sm font-medium text-[#111111] mb-2">{t("analysisResultTitle")}</p>
<div className="text-sm text-[#6B6B6B]">
<MarkdownRenderer content={result.summary} />
</div>
</div>

{result.warnings.length > 0 && (<div className="space-y-2">
<p className="text-sm font-medium text-[#E8A87C]">{t("warnings")}</p>
{result.warnings.map((w, i) => (<div key={i} className="flex items-start gap-2 text-sm">
<EmojiIcon name="Info" className="mt-0.5 size-3.5 shrink-0 text-[#E8A87C]" />
<span className="text-[#6B6B6B]">{w}</span>
</div>))}
</div>)}

{result.suitable_breeds.length > 0 && (<div>
<p className="text-sm font-medium text-[#111111]">{t("suitableBreeds")}</p>
<div className="mt-2 flex flex-wrap gap-2">
{result.suitable_breeds.map((breed) => (<Badge key={breed} variant="secondary">{breed}</Badge>))}
</div>
</div>)}
</CardContent>
</Card>)}

{/* Tips */}
<Card className="border-dashed">
<CardContent className="pt-6">
<p className="text-sm font-medium text-[#111111]">{t("usageTips")}</p>
<div className="mt-3 space-y-2 text-sm text-[#6B6B6B]">
<p>• {t("tipUploadImage")}</p>
<p>• {t("tipPasteText")}</p>
<p>• {t("tipAiAnalysis")}</p>
<p>• {t("tipRiskBreed")}</p>
</div>
</CardContent>
</Card>
</div>)
}
