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

// 图片压缩：避免大图直接 base64 导致请求体过大
// 最长边限制 1280px，JPEG 质量 0.85，足以保留成分表文字清晰度
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
          reject(new Error("Canvas 不支持"))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.onerror = () => reject(new Error("图片加载失败"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("文件读取失败"))
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
  const [imagePreview, setImagePreview] = useState<string>("") // 压缩后的 data URL，直传后端
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  // 宠物选择
  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPetId, setSelectedPetId] = useState("")
  const [loadingPets, setLoadingPets] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载用户宠物列表
  useEffect(() => {
    if (!user) return
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
  }, [user])

  // 选中的宠物对象（用于前端 prompt 拼接）
  const selectedPet = pets.find((p) => p.id === selectedPetId) || null

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    processImageFile(file)
  }

  async function processImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB")
      return
    }
    setError("")
    setResult(null)
    try {
      const compressed = await compressImage(file)
      setImageFile(file)
      setImagePreview(compressed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片处理失败")
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

  // 构建宠物信息文本（文字模式用于 prompt 拼接）
  function buildPetContextText(): string {
    if (!selectedPet) return ""
    const parts: string[] = []
    parts.push(`品种：${selectedPet.breed ?? "未知"}`)
    parts.push(`种类：${selectedPet.species === "cat" ? "猫" : selectedPet.species === "dog" ? "狗" : selectedPet.species}`)
    if (selectedPet.stomach_health === "sensitive") {
      parts.push("肠胃状况：敏感（需注意低敏配方）")
    } else if (selectedPet.stomach_health === "normal") {
      parts.push("肠胃状况：正常")
    }
    return `当前分析的宠物信息：${selectedPet.name}（${parts.join("，")}）`
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
      const petHint = petContext ? `${petContext}\n\n` : ""
      // DeepSeek API 对 system 角色支持不稳定，统一用 user 角色
      // 把角色设定和格式要求作为第一条 user 消息，实际成分表作为第二条 user 消息
      body = {
        messages: [
          {
            role: "user",
            content: `你是"球球"🐱，毛球镇的可爱智能宠物顾问。我会给你一份猫粮/狗粮成分表文字，请你按以下 Markdown 结构输出分析结果：

### 1. 配方总览
2-3 句话概括整体配方质量。

### 2. 主要原料分析
按动物蛋白、谷物碳水、脂肪油脂、功能性添加剂分类列出，每个 bullet 不超过 30 字，用 **低/中/高风险** 标注风险等级。

### 3. 营养指标评价
评价粗蛋白、粗脂肪、粗纤维是否达标（猫粮粗蛋白≥30%优质，≥25%合格；狗粮粗蛋白≥25%优质）。

### 4. 适合对象
适合与不适合的宠物类型。

### 5. 注意事项
最多 3 条真正需要警惕的点。

开头加"喵~"或"汪~"，适当 emoji，简洁不重复。`,
          },
          {
            role: "user",
            content: `${petHint}请分析以下成分表，按上面要求的 Markdown 结构输出：\n\n${input}`,
          },
        ],
      }
    } else {
      if (!imagePreview) return
      endpoint = "/api/ai/ingredient-vision"
      body = selectedPetId ? { image: imagePreview, petId: selectedPetId } : { image: imagePreview }
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
        const err = await response.json().catch(() => ({ error: "分析失败" }))
        throw new Error(err.error ?? "分析失败")
      }

      // 读取 SSE 流
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let summary = ""
      // 循环检测：防止 LLM 陷入 token 重复循环（如反复输出"磷酸氢二钠"）
      // 新策略：检测严格重复的短 token 连续出现多次，避免把正常列表项误杀
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
              const text = parsed.choices?.[0]?.delta?.content ?? ""
              summary += text

              // 循环检测：基于 token 粒度的连续重复判断
              // GLM-4V-Flash 循环时通常是同一短 token（2-8 字符）连续出现
              if (text && summary.length > 80) {
                const tail = summary.slice(-80)
                // 策略 A：检测同一 token 是否连续出现 8 次以上（如 "磷酸氢二钠、磷酸氢二钠、磷酸氢二钠..."）
                // 用分隔符拆分后判断末尾 token 连续次数
                const separatorPattern = /[,，;；、。\. ]/
                const tokens = tail.split(separatorPattern).filter((t) => t.trim().length > 0)
                if (tokens.length >= 8) {
                  const lastToken = tokens[tokens.length - 1]
                  let repeatCount = 0
                  for (let i = tokens.length - 1; i >= 0; i--) {
                    if (tokens[i] === lastToken) repeatCount++
                    else break
                  }
                  // 只有同一 token 在末尾连续出现 8 次以上，才判定为循环
                  if (repeatCount >= 8) {
                    loopDetected = true
                    console.warn(
                      `[ingredient-analysis] 检测到 token 重复循环，主动截断。重复 token: "${lastToken}"，连续次数: ${repeatCount}`,
                    )
                    break
                  }
                }

                // 策略 B：检测末尾 80 字符内是否存在 5-14 字符的片段连续重复 5+ 次
                // 片段长度至少 5，避免把常见短词（如"蛋白""维生素"）误判
                for (let fragLen = 5; fragLen <= 14; fragLen++) {
                  const frag = tail.slice(-fragLen)
                  if (frag.trim().length < fragLen) continue
                  let count = 0
                  let pos = 0
                  while ((pos = tail.indexOf(frag, pos)) !== -1) {
                    count++
                    pos += Math.max(1, fragLen - 1)
                  }
                  if (count >= 5) {
                    loopDetected = true
                    console.warn(
                      `[ingredient-analysis] 检测到片段重复循环，主动截断。重复片段: "${frag}"，次数: ${count}`,
                    )
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
          // 给截断的内容一个收尾标记
          summary += "\n\n> ⚠️ AI 输出出现循环，已自动截断。可尝试重新分析或调整图片清晰度。"
        }
      }

      setResult({
        ingredients: [],
        summary: summary || "分析完成",
        protein_source: "待解析",
        risk_summary: "待解析",
        suitable_breeds: [],
        warnings: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败")
    }
    setLoading(false)
  }

  const canAnalyze = mode === "text" ? !!input.trim() : !!imagePreview
  const isAnalyzing = loading

  return (
    <div className="space-y-6">
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
            成分分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#6B6B6B]">
            上传成分表图片或粘贴文字，AI 将自动分析风险等级和适配性。
          </p>

          {/* 宠物选择 */}
          {loadingPets ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : pets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E0DFDD] bg-[#FAFAF9] p-3 text-center text-[12px] text-[#6B6B6B]">
              还没有宠物档案，建议先
              <Link href="/dashboard/pets/new" className="text-[#FF7A59] mx-1 hover:underline">添加宠物</Link>
              以获取更精准的成分适配分析
            </div>
          ) : (
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1.5 block">选择宠物（可选，用于个性化分析）</label>
              <SelectDropdown
                value={selectedPetId}
                onChange={setSelectedPetId}
                options={pets.map<SelectOption>((pet) => ({
                  value: pet.id,
                  label: `${pet.name} · ${pet.breed ?? "未知品种"}${pet.stomach_health === "sensitive" ? " · 肠胃敏感" : ""}`,
                  icon: <EmojiIcon name="PawPrint" className="size-4 text-[#FF7A59]" />,
                }))}
                placeholder="不指定宠物，进行通用分析…"
              />
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("text")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
                mode === "text"
                  ? "bg-[#FF7A59]/10 text-[#FF7A59]"
                  : "bg-[#F0EFED] text-[#6B6B6B] hover:bg-[#E5E4E2]"
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
              文字输入
            </button>
            <button
              onClick={() => setMode("image")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
                mode === "image"
                  ? "bg-[#FF7A59]/10 text-[#FF7A59]"
                  : "bg-[#F0EFED] text-[#6B6B6B] hover:bg-[#E5E4E2]"
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
              图片识别
            </button>
          </div>

          {/* Text input mode */}
          {mode === "text" && (
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：鸡肉粉、鱼肉、玉米、糙米、鸡脂肪、啤酒酵母、甜菜粕、天然调味、氯化胆碱、牛磺酸、维生素预混料、矿物质预混料…"
              rows={5}
            />
          )}

          {/* Image upload mode */}
          {mode === "image" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#E0DFDD] bg-[#FAFAF9] p-8 transition-colors hover:border-[#FF7A59]/40 hover:bg-[#FF7A59]/5 cursor-pointer"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#F0EFED]">
                    <EmojiIcon name="Upload" className="size-5 text-[#6B6B6B]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-[#111111]">点击或拖拽上传成分表图片</p>
                    <p className="mt-1 text-[11px] text-[#A0A09E]">支持 JPG、PNG 格式，AI 直接识别分析</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="成分表预览"
                      className="w-full rounded-2xl border border-[rgba(0,0,0,0.05)] object-contain max-h-64"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                    >
                      <EmojiIcon name="X" className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={isAnalyzing || !canAnalyze}>
            {isAnalyzing && <EmojiIcon name="Loader2" className="mr-2 size-4 animate-spin" />}
            {isAnalyzing ? "AI 分析中…" : "开始分析"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-[12px] border border-[#E85D4A]/20 bg-[#E85D4A]/5 p-4">
          <p className="text-sm text-[#E85D4A]">
            <EmojiIcon name="AlertTriangle" className="mr-2 inline size-4" />{error}
          </p>
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* AI 分析摘要：使用 MarkdownRenderer 渲染，与自由对话样式一致 */}
            <div className="rounded-lg bg-[#F0EFED] p-4">
              <p className="text-sm font-medium text-[#111111] mb-2">AI 分析摘要</p>
              <div className="text-sm text-[#6B6B6B]">
                <MarkdownRenderer content={result.summary} />
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#E8A87C]">注意事项</p>
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <EmojiIcon name="Info" className="mt-0.5 size-3.5 shrink-0 text-[#E8A87C]" />
                    <span className="text-[#6B6B6B]">{w}</span>
                  </div>
                ))}
              </div>
            )}

            {result.suitable_breeds.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[#111111]">适合品种</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.suitable_breeds.map((breed) => (
                    <Badge key={breed} variant="secondary">{breed}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-[#111111]">使用示例</p>
          <div className="mt-3 space-y-2 text-sm text-[#6B6B6B]">
            <p>• 上传猫粮包装背面的成分表图片</p>
            <p>• 或直接粘贴成分表文字内容</p>
            <p>• AI 会识别主要蛋白来源、填充物、添加剂等</p>
            <p>• 给出风险评估和品种适配建议</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
