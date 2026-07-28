"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useRef } from "react"
import { AISidebar, type AIMode } from "@/components/ai/ai-sidebar"
import { AIChatNew, type AIChatNewRef } from "@/components/ai/ai-chat-new"
import { RecommendationInput } from "@/components/ai/recommendation-input"
import { RecommendationCard } from "@/components/ai/recommendation-card"
import { IngredientAnalysis } from "@/components/ai/ingredient-analysis"
import { ProductCompare } from "@/components/ai/product-compare"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RecommendResponse {
  recommendations: Array<{
    product: { id: string; name: string; brand: string; price_min: number | null; price_max: number | null; image_url: string | null }
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

const modeTitles: Record<AIMode, { title: string; subtitle: string }> = {
  chat: { title: "自由对话", subtitle: "和球球聊聊你的宠物问题" },
  recommend: { title: "智能推荐", subtitle: "基于社区数据为你的宠物精准匹配" },
  ingredients: { title: "成分分析", subtitle: "AI 解读猫粮成分表" },
  compare: { title: "产品对比", subtitle: "多维度对比分析猫粮产品" },
}

export default function AIPage() {
  const [activeMode, setActiveMode] = useState<AIMode>("chat")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const chatRef = useRef<AIChatNewRef>(null)

  // Recommend state
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

  function handleModeChange(mode: AIMode) {
    setActiveMode(mode)
    setMobileSidebarOpen(false)
  }

  return (
    <div
      className="fixed left-1/2 bottom-0 flex w-[90%] max-w-[1700px] -translate-x-1/2 overflow-hidden rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.04)]"
      style={{ top: "calc(95px + var(--safe-top))" }}
    >
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "absolute z-50 left-0 top-0 bottom-0 w-64 shrink-0 transition-transform duration-300 md:relative md:z-auto md:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <AISidebar activeMode={activeMode} onModeChange={handleModeChange} />
      </div>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F6F3]">
        {/* Top bar for mode info */}
        <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.04)] bg-white/40 backdrop-blur-sm px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden size-9 rounded-xl"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              {mobileSidebarOpen ? <EmojiIcon name="X" className="size-5" /> : <EmojiIcon name="Menu" className="size-5" />}
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-[#111111] tracking-tight">
                  {modeTitles[activeMode].title}
                </h2>
                {activeMode === "chat" && (
                  <div className="flex items-center gap-1 rounded-full bg-[#A8C5A0]/15 px-2 py-0.5">
                    <span className="size-1.5 rounded-full bg-[#A8C5A0]" />
                    <span className="text-[10px] font-medium text-[#5A8A52]">在线</span>
                  </div>
                )}
              </div>
              <p className="text-[11.5px] text-[#6B6B6B] hidden sm:block">{modeTitles[activeMode].subtitle}</p>
            </div>
          </div>

          {/* Chat toolbar: history + new chat */}
          {activeMode === "chat" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => chatRef.current?.openHistory()}
                className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white/80 backdrop-blur-sm px-3 py-2 text-[12px] font-medium text-[#6B6B6B] transition-all hover:border-[#FFB89A]/40 hover:bg-white hover:text-[#FF7A59]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-current">
                  <path d="M9,1c-2.488,0-4.774,1.157-6.268,3.048l-.117-.846c-.058-.41-.442-.696-.846-.64-.411,.057-.697,.436-.641,.846l.408,2.945c.053,.375,.374,.647,.742,.647,.034,0,.069-.002,.104-.007l2.944-.407c.41-.057,.697-.436,.641-.846-.057-.411-.443-.694-.846-.641l-1.448,.2c1.199-1.727,3.168-2.8,5.326-2.8,3.397,0,6.245,2.651,6.483,6.037,.027,.395,.357,.697,.747,.697,.018,0,.036,0,.054-.002,.413-.029,.725-.388,.695-.801-.293-4.167-3.798-7.431-7.979-7.431Z" fill="currentColor" />
                  <circle cx="14.127" cy="14.126" r=".75" fill="currentColor" />
                  <circle cx="9" cy="16.25" r=".75" fill="currentColor" />
                  <circle cx="3.873" cy="14.126" r=".75" fill="currentColor" />
                  <circle cx="1.75" cy="9" r=".75" fill="currentColor" />
                  <path d="M15.985,11.082c-.383-.159-.821,.023-.98,.406-.159,.383,.023,.821,.406,.98s.821-.023,.98-.406-.023-.821-.406-.98Z" fill="currentColor" />
                  <path d="M11.487,15.005c-.383,.158-.564,.597-.406,.98,.159,.382,.597,.564,.98,.406s.564-.597,.406-.98-.597-.564-.98-.406Z" fill="currentColor" />
                  <path d="M6.513,15.005c-.383-.159-.821,.023-.98,.406s.023,.821,.406,.98,.821-.023,.98-.406c.159-.383-.023-.822-.406-.98Z" fill="currentColor" />
                  <path d="M2.015,11.082c-.383,.159-.564,.597-.406,.98s.597,.564,.98,.406,.564-.597,.406-.98c-.159-.383-.597-.564-.98-.406Z" fill="currentColor" />
                </svg>
                历史记录
              </button>
              <button
                onClick={() => chatRef.current?.newChat()}
                className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white/80 backdrop-blur-sm px-3 py-2 text-[12px] font-medium text-[#6B6B6B] transition-all hover:border-[#A8C5A0]/40 hover:bg-white hover:text-[#5A8A52]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" className="text-current">
                  <path d="m10.75,6.75H1.25c-.414,0-.75-.336-.75-.75s.336-.75.75-.75h9.5c.414,0,.75.336.75.75s-.336.75-.75.75Z" fill="currentColor" />
                  <path d="m6,11.5c-.414,0-.75-.336-.75-.75V1.25c0-.414.336-.75.75-.75s.75.336.75.75v9.5c0,.414-.336.75-.75.75Z" fill="currentColor" />
                </svg>
                新会话
              </button>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {activeMode === "chat" && <AIChatNew ref={chatRef} />}

          {activeMode === "recommend" && (
            <div className="h-full overflow-y-auto px-4 py-6 md:px-8">
              <div className="mx-auto max-w-2xl">
                <RecommendationInput onRecommend={handleRecommend} loading={loading} />

                {error && (
                  <div className="mt-4 rounded-2xl border border-[#ff3b30]/20 bg-[#ff3b30]/5 p-4">
                    <p className="text-[14px] text-[#ff3b30]">
                      <EmojiIcon name="AlertTriangle" className="mr-2 inline size-4" />{error}
                    </p>
                  </div>
                )}

                {result && (
                  <div className="mt-6 space-y-4 pb-8">
                    {/* Summary */}
                    <div className="rounded-2xl border border-[#FF7A59]/20 bg-gradient-to-br from-[#FF7A59]/8 to-transparent p-4">
                      <p className="text-[14px]">
                        <span className="font-semibold text-[#FF7A59]">分析结果</span>
                        <span className="text-[#6B6B6B]"> — {result.summary}</span>
                      </p>
                    </div>

                    {/* Pet context */}
                    {result.pet_context && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[13px] text-[#111111]">品种：{result.pet_context.breed}</span>
                        <span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[13px] text-[#111111]">年龄：{result.pet_context.age}</span>
                        <span className={`rounded-full px-3 py-1 text-[13px] ${
                          result.pet_context.stomach_health === "sensitive" || result.pet_context.stomach_health === "very_sensitive"
                            ? "bg-[#ff3b30]/10 text-[#ff3b30]"
                            : "bg-[#F0EFED] text-[#111111]"
                        }`}>
                          肠胃：{result.pet_context.stomach_health === "sensitive" ? "敏感" : result.pet_context.stomach_health === "very_sensitive" ? "极易敏感" : "正常"}
                        </span>
                      </div>
                    )}

                    {/* Recommendations */}
                    <div className="space-y-3">
                      {result.recommendations.filter((r) => r.product?.id).map((r, i) => (
                        <RecommendationCard
                          key={r.product.id}
                          recommendation={r}
                          rank={i + 1}
                          breakdown={i === 0 ? result.breakdown : null}
                        />
                      ))}
                    </div>

                    {(result.warnings?.length ?? 0) > 0 && (
                      <div className="rounded-2xl border border-[#ff9500]/20 bg-[#ff9500]/5 p-4">
                        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#ff9500]">
                          <EmojiIcon name="AlertTriangle" className="size-4" />风险提示
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
              </div>
            </div>
          )}

          {activeMode === "ingredients" && (
            <div className="h-full overflow-y-auto px-4 py-6 md:px-8">
              <div className="mx-auto max-w-2xl pb-8">
                <IngredientAnalysis />
              </div>
            </div>
          )}

          {activeMode === "compare" && (
            <div className="h-full overflow-y-auto px-4 py-6 md:px-8">
              <div className="mx-auto max-w-2xl pb-8">
                <ProductCompare />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
