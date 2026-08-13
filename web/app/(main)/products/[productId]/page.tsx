import { EmojiIcon } from "@/components/ui/emoji-icon"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { queryProduct, queryIngredients, queryVersions, queryReviews, queryRiskEvents, queryMetrics, getUser, queryProductTags } from "@/lib/supabase/query"
import type { ProductMetricsDaily } from "@/lib/supabase/types"
import { createClient } from "@/lib/supabase/server"
import { ProductTrends } from "@/components/products/product-trends"
import { RiskIntelPanel } from "@/components/products/risk-intel-panel"
import { BookmarkButton } from "@/components/products/bookmark-button"
import { getRiskIntelligence } from "@/lib/ai/explain"
import { ProductViewTracker } from "@/components/products/product-view-tracker"

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
const { productId } = await params
const { data: product } = await queryProduct(productId)
return { title: `${product?.name?? "Product Details"} — Nuzzly Town` }
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
const { data: bm } = await supabase.from("product_bookmarks").select("profile_id").eq("profile_id", user.id).eq("product_id", productId).maybeSingle()
isBookmarked =!!bm
}

const avgRating = metrics?.length? (metrics.reduce((sum, m) => sum + (Number(m.average_rating) || 0), 0) / metrics.filter((m) => m.average_rating).length).toFixed(1): null
const latestStoolRate = metrics?.find((m) => m.stool_issue_rate!= null)?.stool_issue_rate
const latestRepurchaseRate = metrics?.find((m) => m.repurchase_rate!= null)?.repurchase_rate
const currentVersion = versions?.find((v) => v.is_current)

return (<div className="bg-[#F7F6F3]">
<div className="mx-auto max-w-[980px] px-6 py-12">
{/* Product Header */}
<div>
<p className="text-[14px] text-[#6B6B6B]">{product.product_categories?.name} · {product.brand}</p>
<h1 className="mt-1 text-[32px] font-semibold leading-[1.1] tracking-normal text-[#111111] md:text-[40px]">
{product.name}
</h1>
<p className="mt-3 text-[17px] leading-[1.47] text-[#6B6B6B]">{product.description}</p>

<div className="mt-4 flex flex-wrap items-center gap-3">
{product.price_min && (<span className="text-[21px] font-semibold text-[#111111]">
${Number(product.price_min)}-{Number(product.price_max)}
</span>)}
{product.origin_country && (<span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#6B6B6B]">Origin: {product.origin_country}</span>)}
<span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#6B6B6B]">
{product.applicable_species === "cats"? "Cats Only": product.applicable_species === "dogs"? "Dogs Only": "Cats & Dogs"}
</span>
<span className="rounded-full bg-[#F0EFED] px-3 py-1 text-[14px] text-[#6B6B6B]">
{product.applicable_age === "kitten"? "Kitten": product.applicable_age === "senior"? "Senior": "All Ages"}
</span>
</div>

<div className="mt-6 flex items-center gap-3">
<Link
href={`/products/${productId}/review`}
className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-5 py-2 text-[17px] font-normal text-white transition-colors hover:bg-[#E86A4A] active:scale-[0.98]"
>
<EmojiIcon name="Edit3" className="size-4" />
Submit Feedback
</Link>
<BookmarkButton productId={productId} userId={user?.id} initialBookmarked={isBookmarked} />
</div>
</div>

{/* Product View Tracker */}
{user && <ProductViewTracker productId={productId} userId={user.id} />}

{/* Product Tags */}
{productTags && productTags.length > 0 && (<div className="mt-6">
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
ingredient: "Ingredients",
suitable_for: "Suitable For",
risk: "Risk",
certification: "Certification",
feature: "Feature",
}
const color = tagColors[tag.tag_type]?? "#6B6B6B"
return (<span
key={tag.id}
className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px]"
style={{ backgroundColor: `${color}12`, color }}
>
<EmojiIcon name="Tag" className="size-3" />
<span className="opacity-70">{tagLabels[tag.tag_type]?? tag.tag_type}</span>
<span className="font-medium">{tag.tag_value}</span>
</span>)
})}
</div>
</div>)}

{/* Stats Grid */}
<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
<p className="text-[14px] text-[#6B6B6B]">Overall Rating</p>
<div className="mt-2 flex items-baseline gap-1">
<EmojiIcon name="Star" className="size-4 fill-[#ff9500] text-[#ff9500]" />
<span className="text-[28px] font-semibold text-[#111111]">{avgRating?? "--"}</span>
<span className="text-[14px] text-[#6B6B6B]">/5</span>
</div>
</div>
<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
<p className="text-[14px] text-[#6B6B6B]">Soft Stool Rate</p>
<p className="mt-2 text-[28px] font-semibold text-[#111111]">
{latestStoolRate!= null? `${(Number(latestStoolRate) * 100).toFixed(1)}%`: "--"}
</p>
<Progress value={Number(latestStoolRate?? 0) * 100} className="mt-2 h-1.5" />
</div>
<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
<p className="text-[14px] text-[#6B6B6B]">Repurchase Rate</p>
<p className="mt-2 text-[28px] font-semibold text-[#111111]">
{latestRepurchaseRate!= null? `${(Number(latestRepurchaseRate) * 100).toFixed(0)}%`: "--"}
</p>
<Progress value={Number(latestRepurchaseRate?? 0) * 100} className="mt-2 h-1.5 [&>div]:bg-[#34c759]" />
</div>
<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-5">
<p className="text-[14px] text-[#6B6B6B]">Transparency Score</p>
<div className="mt-2 flex items-baseline gap-1">
<EmojiIcon name="ShieldCheck" className="size-4 text-[#FF7A59]" />
<span className="text-[28px] font-semibold text-[#111111]">
{product.transparency_score!= null? String(product.transparency_score): "--"}
</span>
<span className="text-[14px] text-[#6B6B6B]">/100</span>
</div>
</div>
</div>

{/* SSS/SS Monitoring Tags */}
{metrics && metrics.length > 0 && (() => {
const latest = metrics[0] as ProductMetricsDaily
const tags = [
{ label: "Soft Stool", value: latest?.stool_issue_rate, priority: "SSS", color: "text-[#E85D4A]" },
{ label: "Palatability", value: latest?.average_rating? 1 - Number(latest.average_rating) / 5: null, priority: "SS", color: "text-[#E8A87C]" },
{ label: "Long-term Stability", value: latest?.long_term_stability_score? 1 - Number(latest.long_term_stability_score) / 100: null, priority: "SS", color: "text-[#E8A87C]" },
{ label: "Dispute", value: latest?.dispute_rate, priority: "SS", color: "text-[#E8A87C]" },
{ label: "Coat Improvement", value: latest?.coat_improve_rate? 1 - Number(latest.coat_improve_rate): null, priority: "S", color: "text-[#6B6B6B]" },
{ label: "Repurchase", value: latest?.repurchase_rate? 1 - Number(latest.repurchase_rate): null, priority: "S", color: "text-[#6B6B6B]" },
].filter((t) => t.value!= null)

if (tags.length === 0) return null

return (<div className="mt-8">
<h3 className="text-[18px] font-semibold text-[#111111]">Long-term Monitoring</h3>
<div className="mt-4 flex flex-wrap gap-2">
{tags.map((tag) => {
const rate = Number(tag.value)
const pct = (rate * 100).toFixed(1)
return (<div key={tag.label} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
<span className={`text-[11px] font-bold ${tag.color}`}>{tag.priority}</span>
<span className="text-[13px] font-medium text-[#111111]">{tag.label}</span>
<span className="text-[13px] text-[#6B6B6B]">{pct}%</span>
</div>)
})}
</div>
</div>)
})()}

{/* Risk Intelligence */}
<div className="mt-8">
<RiskIntelPanel riskIntel={riskIntel} />
</div>

{/* Trend Charts */}
{metrics && metrics.length > 0 && (<div className="mt-8">
<ProductTrends metrics={metrics} />
</div>)}

{/* Tabs */}
<div className="mt-8">
<Tabs defaultValue="reviews">
<TabsList>
<TabsTrigger value="reviews">Long-term Feedback</TabsTrigger>
<TabsTrigger value="ingredients">Ingredient Analysis</TabsTrigger>
<TabsTrigger value="timeline">Timeline</TabsTrigger>
{riskEvents && riskEvents.length > 0 && (<TabsTrigger value="risks"><EmojiIcon name="AlertTriangle" className="mr-1 size-3.5" />Risk Records</TabsTrigger>)}
</TabsList>

<TabsContent value="ingredients" className="mt-4">
<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
<p className="text-[17px] font-semibold text-[#111111]">Ingredient Analysis</p>
{ingredients && ingredients.length > 0? (<div className="mt-4 space-y-2">
{ingredients.map((ing) => (<div key={ing.id} className="flex items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.06)] p-3">
<div className="flex items-center gap-2">
<span className="text-[14px] font-semibold text-[#111111]">{ing.ingredient_name}</span>
{ing.allergen_risk && (ing.allergen_risk as unknown as string[]).length > 0 && (<span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[12px] text-[#ff3b30]">Allergy Risk</span>)}
</div>
<div className="flex items-center gap-3 text-[14px] text-[#6B6B6B]">
{ing.percentage && <span>{ing.percentage}%</span>}
<span className="rounded-full bg-[#F0EFED] px-2 py-0.5 text-[12px]">{ing.ingredient_type}</span>
</div>
</div>))}
</div>): (<p className="mt-4 text-[14px] text-[#6B6B6B]">No ingredient data available</p>)}
</div>
{currentVersion?.nutrition_snapshot && (<div className="mt-4 rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
<p className="text-[17px] font-semibold text-[#111111]">Guaranteed Nutrition</p>
<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
{Object.entries(currentVersion.nutrition_snapshot as Record<string, number>).map(([key, value]) => (<div key={key} className="rounded-[12px] border border-[rgba(0,0,0,0.06)] p-3 text-center">
<p className="text-[24px] font-semibold text-[#111111]">{value}%</p>
<p className="mt-1 text-[12px] capitalize text-[#6B6B6B]">{key}</p>
</div>))}
</div>
</div>)}
</TabsContent>

<TabsContent value="timeline" className="mt-4">
<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
<p className="text-[17px] font-semibold text-[#111111]">Product Version History</p>
{versions && versions.length > 0? (<div className="mt-4 space-y-4">
{versions.map((v, i) => (<div key={v.id} className="flex gap-4">
<div className="flex flex-col items-center">
<div className={`size-3 rounded-full ${v.is_current? "bg-[#34c759]": "bg-[#e0e0e0]"}`} />
{i < versions.length - 1 && <div className="w-px flex-1 bg-[#e0e0e0]" />}
</div>
<div className="pb-4">
<p className="text-[14px] font-semibold text-[#111111]">
{v.version_name}
{v.is_current && <span className="ml-2 rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[12px] text-[#34c759]">Current</span>}
</p>
{v.effective_date && (<p className="mt-0.5 text-[12px] text-[#6B6B6B]">
{new Date(v.effective_date).toLocaleDateString("en-US")}
{v.end_date && ` — ${new Date(v.end_date).toLocaleDateString("en-US")}`}
</p>)}
{v.formula_changes && <p className="mt-1 text-[14px] text-[#6B6B6B]">{v.formula_changes}</p>}
</div>
</div>))}
</div>): (<p className="mt-4 text-[14px] text-[#6B6B6B]">No version records</p>)}
</div>
</TabsContent>

<TabsContent value="risks" className="mt-4">
<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
<p className="flex items-center gap-2 text-[17px] font-semibold text-[#111111]">
<EmojiIcon name="AlertTriangle" className="size-5 text-[#ff9500]" />Risk Records
</p>
{riskEvents && riskEvents.length > 0? (<div className="mt-4 space-y-3">
{riskEvents.map((event) => (<div key={event.id} className="rounded-[12px] border border-[rgba(0,0,0,0.06)] p-4">
<div className="flex items-center justify-between">
<p className="text-[14px] font-semibold text-[#111111]">{event.title}</p>
<span className={`rounded-full px-2 py-0.5 text-[12px] ${
event.severity === "critical" || event.severity === "high"? "bg-[#ff3b30]/10 text-[#ff3b30]": event.severity === "medium"? "bg-[#ff9500]/10 text-[#ff9500]": "bg-[#F0EFED] text-[#6B6B6B]"
}`}>
{event.severity === "critical"? "Critical": event.severity === "high"? "High Risk": event.severity === "medium"? "Medium Risk": "Low Risk"}
</span>
</div>
<p className="mt-1 text-[14px] text-[#6B6B6B]">{event.description}</p>
<div className="mt-2 flex items-center gap-3 text-[12px] text-[#6B6B6B]">
<span>{new Date(event.event_date).toLocaleDateString("en-US")}</span>
<span> · </span>
<span>{event.report_count} reports</span>
{event.resolved && <span className="rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[12px] text-[#34c759]">Resolved</span>}
</div>
</div>))}
</div>): (<p className="mt-4 text-[14px] text-[#6B6B6B]">No risk records</p>)}
</div>
</TabsContent>

<TabsContent value="reviews" className="mt-4">
<div className="space-y-4">
{reviews && reviews.length > 0? (reviews.map((review) => (<div key={review.id} className="rounded-[18px] border border-[rgba(0,0,0,0.06)] p-6">
<div className="flex items-center justify-between">
<div>
<p className="text-[14px] font-semibold text-[#111111]">{review.profiles?.display_name?? "Anonymous"}</p>
<p className="mt-0.5 text-[12px] text-[#6B6B6B]">
{review.pets?.name} · {review.pets?.breed} · {review.pets?.stomach_health === "sensitive"? "Sensitive Stomach": "Normal Stomach"}
</p>
</div>
<span className="rounded-full bg-[#F0EFED] px-2.5 py-1 text-[12px] text-[#6B6B6B]">
<EmojiIcon name="Clock" className="mr-1 inline size-3" />{review.usage_duration}
</span>
</div>
<div className="mt-3 flex items-center gap-0.5">
{Array.from({ length: 5 }).map((_, i) => (<EmojiIcon name="Star" key={i} className={`size-3.5 ${i < (review.overall_rating?? 3)? "fill-[#ff9500] text-[#ff9500]": "text-[#e0e0e0]"}`} />))}
</div>
{review.review_text && <p className="mt-2 text-[14px] leading-[1.47] text-[#111111]">{review.review_text}</p>}
{review.pros && <p className="mt-2 text-[14px] text-[#34c759]">👍 {review.pros}</p>}
{review.cons && <p className="mt-1 text-[14px] text-[#6B6B6B]">👎 {review.cons}</p>}
</div>))): (<div className="rounded-[18px] border border-[rgba(0,0,0,0.06)] py-12 text-center text-[14px] text-[#6B6B6B]">
No reviews yet. Be the first to review this product!
</div>)}
</div>
</TabsContent>
</Tabs>
</div>
</div>
</div>)
}
