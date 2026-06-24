"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, FlaskConical, AlertTriangle, Info } from "lucide-react"

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
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  async function handleAnalyze() {
    if (!input.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `请分析以下猫粮成分表，给出每个成分的风险等级、主要蛋白来源、适合的猫咪品种，以及整体评价：\n\n${input}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "分析失败")
      // Parse the AI response into structured format
      setResult({
        ingredients: [],
        summary: data.reply ?? "分析完成",
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
            粘贴猫粮包装上的成分表，AI 将自动分析每个成分的风险等级和适配性。
          </p>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：鸡肉粉、鱼肉、玉米、糙米、鸡脂肪、啤酒酵母、甜菜粕、天然调味、氯化胆碱、牛磺酸、维生素预混料、矿物质预混料…"
            rows={5}
          />
          <Button onClick={handleAnalyze} disabled={loading || !input.trim()}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            开始分析
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

      {/* Example */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-[#111111]">使用示例</p>
          <div className="mt-3 space-y-2 text-sm text-[#6B6B6B]">
            <p>• 粘贴猫粮包装背面的成分表</p>
            <p>• AI 会识别主要蛋白来源、填充物、添加剂等</p>
            <p>• 给出风险评估和品种适配建议</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
