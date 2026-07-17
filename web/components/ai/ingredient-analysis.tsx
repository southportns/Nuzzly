"use client"

import { useState, useRef } from "react"
import { createWorker } from "tesseract.js"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, FlaskConical, AlertTriangle, Info, Upload, X, FileImage, Type } from "lucide-react"

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
  const [mode, setMode] = useState<"text" | "image">("text")
  const [input, setInput] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [ocrText, setOcrText] = useState("")
  const [ocrLoading, setOcrLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    processImageFile(file)
  }

  function processImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB")
      return
    }
    setImageFile(file)
    setOcrText("")
    setError("")
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processImageFile(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview("")
    setOcrText("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function runOcr() {
    if (!imageFile) return
    setOcrLoading(true)
    setError("")
    try {
      const worker = await createWorker("chi_sim+eng", 1, {
        logger: () => {},
      })
      const { data } = await worker.recognize(imageFile)
      await worker.terminate()
      const text = data.text.trim()
      if (!text) {
        setError("未能识别出文字，请尝试更清晰的图片或使用文字输入模式")
        setOcrLoading(false)
        return
      }
      setOcrText(text)
    } catch (err) {
      console.error("[OCR] error:", err)
      setError(err instanceof Error ? err.message : "OCR 识别失败")
    }
    setOcrLoading(false)
  }

  async function handleAnalyze() {
    let textToAnalyze = ""

    if (mode === "text") {
      if (!input.trim()) return
      textToAnalyze = input
    } else {
      if (!ocrText) {
        // 先执行 OCR
        await runOcr()
        return
      }
      textToAnalyze = ocrText
    }

    if (!textToAnalyze.trim()) return

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `请分析以下猫粮成分表，给出每个成分的风险等级、主要蛋白来源、适合的猫咪品种，以及整体评价：\n\n${textToAnalyze}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "分析失败" }))
        throw new Error(err.error ?? "分析失败")
      }

      // 读取 SSE 流
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let summary = ""

      if (reader) {
        while (true) {
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
            } catch {}
          }
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

  const canAnalyze = mode === "text" ? !!input.trim() : !!imageFile
  const isAnalyzing = loading || ocrLoading

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="size-4 text-[#FF7A59]" />
            成分分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#6B6B6B]">
            上传成分表图片或粘贴文字，AI 将自动分析风险等级和适配性。
          </p>

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
              <Type className="size-3.5" />
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
              <FileImage className="size-3.5" />
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
                    <Upload className="size-5 text-[#6B6B6B]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-[#111111]">点击或拖拽上传成分表图片</p>
                    <p className="mt-1 text-[11px] text-[#A0A09E]">支持 JPG、PNG 格式，建议清晰拍摄</p>
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
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* OCR 提取结果预览 */}
                  {ocrText && (
                    <div className="rounded-xl border border-[#A8C5A0]/30 bg-[#A8C5A0]/5 p-3">
                      <p className="text-[11px] font-medium text-[#5A8A52] mb-1">已识别文字：</p>
                      <p className="text-[12px] text-[#6B6B6B] whitespace-pre-wrap line-clamp-4">{ocrText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={isAnalyzing || !canAnalyze}>
            {isAnalyzing && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "image"
              ? ocrLoading
                ? "正在识别文字…"
                : loading
                  ? "AI 分析中…"
                  : ocrText
                    ? "开始分析"
                    : "识别并分析"
              : "开始分析"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-[12px] border border-[#E85D4A]/20 bg-[#E85D4A]/5 p-4">
          <p className="text-sm text-[#E85D4A]">
            <AlertTriangle className="mr-2 inline size-4" />{error}
          </p>
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-lg bg-[#F0EFED] p-4">
              <p className="text-sm font-medium text-[#111111]">AI 分析摘要</p>
              <p className="mt-1 text-sm text-[#6B6B6B] whitespace-pre-wrap">{result.summary}</p>
            </div>

            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#E8A87C]">注意事项</p>
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-[#E8A87C]" />
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
