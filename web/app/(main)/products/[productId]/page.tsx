import { notFound } from "next/navigation"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, ShieldCheck, AlertTriangle, Clock, Edit3, Tag } from "lucide-react"
import { queryProduct, queryIngredients, queryVersions, queryReviews, queryRiskEvents, queryMetrics, getUser, queryProductTags } from "@/lib/supabase/query"
import { createClient } from "@/lib/supabase/server"
import { ProductTrends } from "@/components/products/product-trends"
import { RiskIntelPanel } from "@/components/products/risk-intel-panel"
import { BookmarkButton } from "@/components/products/bookmark-button"
import { getRiskIntelligence } from "@/lib/ai/explain"
import { ProductViewTracker } from "@/components/products/product-view-tracker"

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const { data: product } = await queryProduct(productId)
  return { title: `${product?.name ?? "产品详情"} — Nuzzly毛球镇` }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params

  const [
    { data: product },
    { data: ingredients },
    { data: versions },
    { data: reviews },
    { data: riskEvents },
    { data: metrics },
    { data: productTags },
    riskIntel,
    { data: { user } },
  ] = await Promise.all([
    queryProduct(productId),
    queryIngredients(productId),
    queryVersions(productId),
    queryReviews(productId),
    queryRiskEvents(productId),
    queryMetrics(productId),
    queryProductTags(productId),
    getRiskIntelligence(productId),
    getUser(),
  ])

  if (!product) notFound()

  // Check bookmark status
  let isBookmarked = false
  if (user) {
    const supabase = await createClient()
    const { data: bm } = await supabase
      .from("product_bookmarks")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("product_id", productId)
      .maybeSingle()
    isBookmarked = !!bm
  }

  const avgRating = metrics?.length
    ? (metrics.reduce((sum, m) => sum + (Number(m.average_rating) || 0), 0) / metrics.filter((m) => m.average_rating).length).toFixed(1)
    : null
  const latestStoolRate = metrics?.find((m) => m.stool_issue_rate != null)?.stool_issue_rate
  const latestRepurchaseRate = metrics?.find((m) => m.repurchase_rate != null)?.repurchase_rate
  const currentVersion = versions?.find((v) => v.is_current)

  return (
    <div className="bg-[#F7F6F3]">
      <div className="mx-auto max-w-[980px] px-6 py-12">
        {/* Product Header */}
        <div>
          <p className="text-[14px] text-[#6B6B6B]">{product.product_categories?.name} · {product.brand}</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-[1.1] tracking-normal text-[#111111] md:text-[40px]">
            {product.name}
          </h1>
          <p className="mt-3 text-[17px] leading-[1.47] text-[#6B6B6B]">{product.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {product.price_min && (
              <span className="text-[21px] font-semibold text-[#111111]">
                ¥{Number(product.price_min)}-{Number(product.price_max)}
              </span>
            )}
            {product.origin_country && (
              <span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#6B6B6B]">产地：{product.origin_country}</span>
            )}
            <span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#6B6B6B]">
              {product.applicable_species === "cats" ? "猫咪专用" : product.applicable_species === "dogs" ? "狗狗专用" : "猫狗通用"}
            </span>
            <span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#6B6B6B]">
              {product.applicable_age === "kitten" ? "幼年" : product.applicable_age === "senior" ? "老年" : "全年龄段"}
            </span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Link
              href={`/products/${productId}/review`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-5 py-2 text-[17px] font-normal text-white transition-colors hover:bg-[#E86A4A] active:scale-[0.98]"
            >
              <Edit3 className="size-4" />
              提交使用反馈
            </Link>
            <BookmarkButton productId={productId} userId={user?.id} initialBookmarked={isBookmarked} />
          </div>
        </div>

        {/* Product View Tracker */}
        {user && <ProductViewTracker productId={productId} userId={user.id} />}

        {/* Product Tags */}
        {productTags && productTags.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              {productTags.map((tag) => {
                const tagColors: Record<string, string> = {
                  ingredient: "#34C759",
                  suitable_for: "#FF9500",
                  risk: "#FF3B30",
                  certification: "#5856D6",
                  feature: "#FF7A59",
                }
                const tagLabels: Record<string, string> = {
                  ingredient: "成分",
                  suitable_for: "适用",
                  risk: "风险",
                  certification: "认证",
                  feature: "特点",
                }
                const color = tagColors[tag.tag_type] ?? "#6B6B6B"
                return (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px]"
                    style={{ backgroundColor: `${color}12`, color }}
                  >
                    <Tag className="size-3" />
                    <span className="opacity-70">{tagLabels[tag.tag_type] ?? tag.tag_type}</span>
                    <span className="font-medium">{tag.tag_value}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
            <p className="text-[14px] text-[#6B6B6B]">综合评分</p>
            <div className="mt-2 flex items-baseline gap-1">
              <Star className="size-4 fill-[#ff9500] text-[#ff9500]" />
              <span className="text-[28px] font-semibold text-[#111111]">{avgRating ?? "--"}</span>
              <span className="text-[14px] text-[#6B6B6B]">/5</span>
            </div>
          </div>
          <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
            <p className="text-[14px] text-[#6B6B6B]">软便反馈率</p>
            <p className="mt-2 text-[28px] font-semibold text-[#111111]">
              {latestStoolRate != null ? `${(Number(latestStoolRate) * 100).toFixed(1)}%` : "--"}
            </p>
            <Progress value={Number(latestStoolRate ?? 0) * 100} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
            <p className="text-[14px] text-[#6B6B6B]">复购率</p>
            <p className="mt-2 text-[28px] font-semibold text-[#111111]">
              {latestRepurchaseRate != null ? `${(Number(latestRepurchaseRate) * 100).toFixed(0)}%` : "--"}
            </p>
            <Progress value={Number(latestRepurchaseRate ?? 0) * 100} className="mt-2 h-1.5 [&>div]:bg-[#34c759]" />
          </div>
          <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
            <p className="text-[14px] text-[#6B6B6B]">透明度评分</p>
            <div className="mt-2 flex items-baseline gap-1">
              <ShieldCheck className="size-4 text-[#FF7A59]" />
              <span className="text-[28px] font-semibold text-[#111111]">
                {product.transparency_score != null ? String(product.transparency_score) : "--"}
              </span>
              <span className="text-[14px] text-[#6B6B6B]">/100</span>
            </div>
          </div>
        </div>

        {/* SSS/SS Monitoring Tags */}
        {metrics && metrics.length > 0 && (() => {
          const latest = metrics[0] as any
          const tags = [
            { label: "软便", value: latest?.stool_issue_rate, priority: "SSS", color: "text-[#E85D4A]" },
            { label: "黑下巴", value: latest?.black_chin_rate, priority: "SSS", color: "text-[#E85D4A]" },
            { label: "呕吐", value: latest?.vomit_rate, priority: "SSS", color: "text-[#E85D4A]" },
            { label: "泪痕", value: latest?.tear_stain_rate, priority: "SS", color: "text-[#E8A87C]" },
            { label: "适口性", value: latest?.average_rating ? 1 - Number(latest.average_rating) / 5 : null, priority: "SS", color: "text-[#E8A87C]" },
            { label: "长期稳定", value: latest?.long_term_stability_score ? 1 - Number(latest.long_term_stability_score) / 100 : null, priority: "SS", color: "text-[#E8A87C]" },
            { label: "翻车", value: latest?.dispute_rate, priority: "SS", color: "text-[#E8A87C]" },
            { label: "掉毛", value: latest?.shedding_rate, priority: "S", color: "text-[#6B6B6B]" },
            { label: "毛发改善", value: latest?.coat_improve_rate ? 1 - Number(latest.coat_improve_rate) : null, priority: "S", color: "text-[#6B6B6B]" },
            { label: "复购", value: latest?.repurchase_rate ? 1 - Number(latest.repurchase_rate) : null, priority: "S", color: "text-[#6B6B6B]" },
          ].filter((t) => t.value != null)

          if (tags.length === 0) return null

          return (
            <div className="mt-8">
              <h3 className="text-[18px] font-semibold text-[#111111]">长期监控指标</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const rate = Number(tag.value)
                  const pct = (rate * 100).toFixed(1)
                  return (
                    <div key={tag.label} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <span className={`text-[11px] font-bold ${tag.color}`}>{tag.priority}</span>
                      <span className="text-[13px] font-medium text-[#111111]">{tag.label}</span>
                      <span className="text-[13px] text-[#6B6B6B]">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Risk Intelligence */}
        <div className="mt-8">
          <RiskIntelPanel riskIntel={riskIntel} />
        </div>

        {/* Trend Charts */}
        {metrics && metrics.length > 0 && (
          <div className="mt-8">
            <ProductTrends metrics={metrics} />
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="reviews">
            <TabsList>
              <TabsTrigger value="reviews">长期反馈</TabsTrigger>
              <TabsTrigger value="ingredients">成分分析</TabsTrigger>
              <TabsTrigger value="timeline">时间轴</TabsTrigger>
              {riskEvents && riskEvents.length > 0 && (
                <TabsTrigger value="risks"><AlertTriangle className="mr-1 size-3.5" />风险记录</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="ingredients" className="mt-4">
              <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
                <p className="text-[17px] font-semibold text-[#111111]">成分分析</p>
                {ingredients && ingredients.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {ingredients.map((ing) => (
                      <div key={ing.id} className="flex items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.06)] p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-[#111111]">{ing.ingredient_name}</span>
                          {ing.allergen_risk && (ing.allergen_risk as unknown as string[]).length > 0 && (
                            <span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[12px] text-[#ff3b30]">过敏风险</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[14px] text-[#6B6B6B]">
                          {ing.percentage && <span>{ing.percentage}%</span>}
                          <span className="rounded-full bg-[#F0EFED] px-2 py-0.5 text-[12px]">{ing.ingredient_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[14px] text-[#6B6B6B]">暂无成分数据</p>
                )}
              </div>
              {currentVersion?.nutrition_snapshot && (
                <div className="mt-4 rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
                  <p className="text-[17px] font-semibold text-[#111111]">营养保证值</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(currentVersion.nutrition_snapshot as Record<string, number>).map(([key, value]) => (
                      <div key={key} className="rounded-[12px] border border-[rgba(0,0,0,0.06)] p-3 text-center">
                        <p className="text-[24px] font-semibold text-[#111111]">{value}%</p>
                        <p className="mt-1 text-[12px] capitalize text-[#6B6B6B]">{key}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
                <p className="text-[17px] font-semibold text-[#111111]">产品版本历史</p>
                {versions && versions.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {versions.map((v, i) => (
                      <div key={v.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`size-3 rounded-full ${v.is_current ? "bg-[#34c759]" : "bg-[#e0e0e0]"}`} />
                          {i < versions.length - 1 && <div className="w-px flex-1 bg-[#e0e0e0]" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-[14px] font-semibold text-[#111111]">
                            {v.version_name}
                            {v.is_current && <span className="ml-2 rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[12px] text-[#34c759]">当前</span>}
                          </p>
                          {v.effective_date && (
                            <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
                              {new Date(v.effective_date).toLocaleDateString("zh-CN")}
                              {v.end_date && ` — ${new Date(v.end_date).toLocaleDateString("zh-CN")}`}
                            </p>
                          )}
                          {v.formula_changes && <p className="mt-1 text-[14px] text-[#6B6B6B]">{v.formula_changes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[14px] text-[#6B6B6B]">暂无版本记录</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="risks" className="mt-4">
              <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
                <p className="flex items-center gap-2 text-[17px] font-semibold text-[#111111]">
                  <AlertTriangle className="size-5 text-[#ff9500]" />风险记录
                </p>
                {riskEvents && riskEvents.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {riskEvents.map((event) => (
                      <div key={event.id} className="rounded-[12px] border border-[rgba(0,0,0,0.06)] p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[14px] font-semibold text-[#111111]">{event.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[12px] ${
                            event.severity === "critical" || event.severity === "high"
                              ? "bg-[#ff3b30]/10 text-[#ff3b30]"
                              : event.severity === "medium"
                              ? "bg-[#ff9500]/10 text-[#ff9500]"
                              : "bg-[#F0EFED] text-[#6B6B6B]"
                          }`}>
                            {event.severity === "critical" ? "严重" : event.severity === "high" ? "高风险" : event.severity === "medium" ? "中风险" : "低风险"}
                          </span>
                        </div>
                        <p className="mt-1 text-[14px] text-[#6B6B6B]">{event.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-[12px] text-[#6B6B6B]">
                          <span>{new Date(event.event_date).toLocaleDateString("zh-CN")}</span>
                          <span>·</span>
                          <span>{event.report_count} 条报告</span>
                          {event.resolved && <span className="rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[#34c759]">已解决</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[14px] text-[#6B6B6B]">暂无风险记录</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <div className="space-y-4">
                {reviews && reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-semibold text-[#111111]">{review.profiles?.display_name ?? "匿名用户"}</p>
                          <p className="mt-0.5 text-[12px] text-[#6B6B6B]">
                            {review.pets?.name} · {review.pets?.breed} · {review.pets?.stomach_health === "sensitive" ? "肠胃敏感" : "肠胃正常"}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#F0EFED] px-2.5 py-1 text-[12px] text-[#6B6B6B]">
                          <Clock className="mr-1 inline size-3" />{review.usage_duration}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`size-3.5 ${i < (review.overall_rating ?? 3) ? "fill-[#ff9500] text-[#ff9500]" : "text-[#e0e0e0]"}`} />
                        ))}
                      </div>
                      {review.review_text && <p className="mt-2 text-[14px] leading-[1.47] text-[#111111]">{review.review_text}</p>}
                      {review.pros && <p className="mt-2 text-[14px] text-[#34c759]">👍 {review.pros}</p>}
                      {review.cons && <p className="mt-1 text-[14px] text-[#6B6B6B]">👎 {review.cons}</p>}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] py-12 text-center text-[14px] text-[#6B6B6B]">
                    暂无评价。成为第一个评价此产品的人！
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
