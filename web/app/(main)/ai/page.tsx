"use client"

import { useState } from "react"
import { AlertTriangle, FlaskConical, GitCompareArrows } from "lucide-react"
import { AIChat } from "@/components/ai/ai-chat"
import { RecommendationInput } from "@/components/ai/recommendation-input"
import { RecommendationCard } from "@/components/ai/recommendation-card"
import { IngredientAnalysis } from "@/components/ai/ingredient-analysis"
import { ProductCompare } from "@/components/ai/product-compare"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RecommendResponse {
  recommendations: Array<{
    product: { id: string; name: string; brand: string; price_max: number | null }
    score: number
    dimensions: { overall_rating: number; stomach_match: number; stool_safety: number; long_term_stability: number; repurchase_rate: number; breed_match: number }
    explanation: string
    confidence: number
  }>
  warnings: Array<{ product: { id: string; name: string; brand: string }; reason: string; risk_score: number }>
  summary: string
  pet_context: { breed: string; stomach_health: string; age: string }
  breakdown?: {
    product_id: string; pet_id: string; total_score: number
    model_attribution: { disclaimer: string; factors: Array<{ factor: string; label: string; raw_score: number; weight_pct: number; contribution: number; max_contribution: number }> }
    evidence_support: Array<{ data_point: string; observed_value: string; statistical_note: string }>
    negative_signals: Array<{ signal: string; severity: "low" | "medium" | "high"; source: string; actionable: boolean }>
    product_confidence: number
  } | null
  trace_id?: string
  agents?: Array<{ agent_name: string; confidence: number; duration_ms: number; output: Record<string, unknown> }>
  arbitration?: { decision: string; final_score: number; vote_distribution: Record<string, number>; overridden: boolean; override_reason: string | null }
}

export default function AIPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecommendResponse | null>(null)
  const [error, setError] = useState("")

  async function handleRecommend(petId: string, query: string) {
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, query }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Recommendation failed")
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get recommendations")
    }
    setLoading(false)
  }

  return (
    <div className="bg-[#F7F6F3]">
      <div className="mx-auto max-w-[980px] px-6 py-12">
        <div className="text-center">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-normal text-[#111111] md:text-[40px]">
            AI 助手
          </h1>
          <p className="mt-3 text-[17px] leading-[1.47] text-[#6B6B6B]">
            基于社区真实长期反馈数据，为你的宠物提供个性化产品推荐与分析
          </p>
        </div>

        <div className="mt-8">
          <RecommendationInput onRecommend={handleRecommend} loading={loading} />
        </div>

        {error && (
          <div className="mt-6 rounded-[12px] border border-[#ff3b30]/20 bg-[#ff3b30]/5 p-4">
            <p className="text-[14px] text-[#ff3b30]">
              <AlertTriangle className="mr-2 inline size-4" />{error}
            </p>
          </div>
        )}

        {result && (
          <div className="mt-8">
            {/* Summary */}
            <div className="rounded-[12px] border border-[#FF7A59]/20 bg-[#FF7A59]/5 p-4">
              <p className="text-[14px]">
                <span className="font-semibold text-[#FF7A59]">分析结果</span>
                <span className="text-[#6B6B6B]"> — {result.summary}</span>
              </p>
            </div>

            {/* Pet context */}
            {result.pet_context && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#111111]">品种：{result.pet_context.breed}</span>
                <span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#111111]">年龄：{result.pet_context.age}</span>
                <span className={`rounded-full px-3 py-1 text-[14px] ${
                  result.pet_context.stomach_health === "sensitive" || result.pet_context.stomach_health === "very_sensitive"
                    ? "bg-[#ff3b30]/10 text-[#ff3b30]"
                    : "bg-[#F0EFED] text-[#111111]"
                }`}>
                  肠胃：{result.pet_context.stomach_health === "sensitive" ? "敏感" : result.pet_context.stomach_health === "very_sensitive" ? "极易敏感" : "正常"}
                </span>
              </div>
            )}

            {/* Recommendations */}
            <div className="mt-6 space-y-3">
              {result.recommendations.filter((r) => r.product?.id).map((r, i) => (
                <RecommendationCard
                  key={r.product.id}
                  recommendation={r}
                  rank={i + 1}
                  breakdown={i === 0 ? result.breakdown : null}
                />
              ))}
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-4 rounded-[12px] border border-[#ff9500]/20 bg-[#ff9500]/5 p-4">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[#ff9500]">
                  <AlertTriangle className="size-4" />风险提示
                </p>
                <div className="mt-2 space-y-1.5">
                  {result.warnings.filter((w) => w.product).map((w, i) => (
                    <div key={i} className="flex items-center justify-between text-[14px]">
                      <span className="text-[#111111]">{w.product.brand} {w.product.name}</span>
                      <span className="text-[#6B6B6B]">{w.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.trace_id && (
              <p className="mt-3 text-center text-[10px] text-[#6B6B6B]/50">
                决策溯源 ID: {result.trace_id.slice(0, 8)}...
              </p>
            )}
          </div>
        )}

        <div className="mt-10">
          <Tabs defaultValue="recommend">
            <TabsList className="mb-4">
              <TabsTrigger value="recommend">智能推荐</TabsTrigger>
              <TabsTrigger value="ingredients"><FlaskConical className="mr-1 size-3.5" />成分分析</TabsTrigger>
              <TabsTrigger value="compare"><GitCompareArrows className="mr-1 size-3.5" />产品对比</TabsTrigger>
              <TabsTrigger value="chat">自由问答</TabsTrigger>
            </TabsList>
            <TabsContent value="ingredients">
              <IngredientAnalysis />
            </TabsContent>
            <TabsContent value="compare">
              <ProductCompare />
            </TabsContent>
            <TabsContent value="chat">
              <div className="h-[500px]"><AIChat /></div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
