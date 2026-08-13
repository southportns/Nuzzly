import Image from "next/image"
import { HotCatFoodSection } from "@/components/home/hot-cat-food-section"
import { HeroVideo } from "@/components/home/hero-video"
import { queryTotalPetCount } from "@/lib/supabase/queries/profile-queries"
import { queryTopCatFood } from "@/lib/supabase/queries/product-queries"
import { getTranslations } from "next-intl/server"

export const revalidate = 300 // ISR: revalidate every 5 minutes

// ---------- Page ----------

export default async function HomePage() {
const t = await getTranslations()
const [petCountResult, productsResult] = await Promise.all([
queryTotalPetCount(),
queryTopCatFood(10),
])
const { count: petCount } = petCountResult

const feedbacks = [
{ quote: t("Features.feedback1Quote"), user: t("Features.feedback1User"), days: 90 },
{ quote: t("Features.feedback2Quote"), user: t("Features.feedback2User"), days: 60 },
{ quote: t("Features.feedback3Quote"), user: t("Features.feedback3User"), days: 180 },
]

return (<div className="bg-[#F7F6F3] overflow-x-hidden">
{/* ========== Hero Section ========== */}
<section className="px-6 pt-[29px] pb-8 md:px-12 md:pb-10">
<div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[32px]">
{/* returnground Video */}
<HeroVideo petCount={petCount} />
</div>
</section>

{/* ========== Feature Cards — Three Columns ========== */}
<section className="mx-auto max-w-[1440px] px-6 pb-24 md:px-12">
<div className="grid gap-6 md:grid-cols-3">
{/* Card 1 — Long-term Tracking */}
<div className="rounded-[32px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
<span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#A8C5A0]">
{t("Features.longTermTracking.label")}
</span>
<h3 className="mt-4 text-[24px] font-bold leading-tight text-[#111111]">
{t("Features.longTermTracking.title")}
</h3>
<p className="mt-3 text-[15px] leading-[1.8] text-[#6B6B6B]">
{t("Features.longTermTracking.description")}
</p>

{/* Mini chart — Apple Health style */}
<div className="mt-6 flex items-end gap-3">
{[30, 50, 65, 45, 72, 58, 80].map((v, i) => (<div key={i} className="flex flex-1 flex-col items-center gap-1.5">
<div
className="w-full rounded-full bg-[#A8C5A0]/60 transition-all"
style={{ height: `${v * 1.2}px` }}
/>
</div>))}
</div>
<div className="mt-2 flex justify-between text-[11px] text-[#6B6B6B]">
<span>30d</span>
<span>90d</span>
<span>180d</span>
</div>
</div>

{/* Card 2 — Community Voice */}
<div className="rounded-[32px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
<span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#E8A87C]">
{t("Features.communityVoice.label")}
</span>
<h3 className="mt-4 text-[24px] font-bold leading-tight text-[#111111]">
{t("Features.communityVoice.title")}
</h3>

<div className="mt-6 flex flex-col gap-5">
{feedbacks.map((f) => (<div key={f.user} className="flex flex-col gap-1.5">
<p className="text-[15px] leading-[1.6] text-[#111111]">
&ldquo;{f.quote}&rdquo;
</p>
<div className="flex items-center gap-2">
<div className="size-5 rounded-full bg-[#F0EFED]" />
<span className="text-[12px] text-[#6B6B6B]">{f.user}</span>
<span className="text-[12px] text-[#D2D1CF]"> · </span>
<span className="text-[12px] text-[#6B6B6B]">{t("Features.daysTracked", { days: f.days })}</span>
</div>
</div>))}
</div>
</div>

{/* Card 3 — Transparent Data */}
<div className="rounded-[32px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
<span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#7BA7BC]">
{t("Features.transparentData.label")}
</span>
<h3 className="mt-4 text-[24px] font-bold leading-tight text-[#111111]">
{t("Features.transparentData.title")}
</h3>
<p className="mt-3 text-[15px] leading-[1.8] text-[#6B6B6B]">
{t("Features.transparentData.description")}
</p>

<div className="mt-6 flex flex-col gap-4">
<div className="flex items-baseline justify-between">
<span className="text-[14px] text-[#6B6B6B]">{t("Features.palatability")}</span>
<span className="text-[36px] font-bold leading-none tracking-tight text-[#111111]">
92<span className="text-[20px] font-semibold">%</span>
</span>
</div>
<div className="h-px bg-[rgba(0,0,0,0.06)]" />
<div className="flex items-baseline justify-between">
<span className="text-[14px] text-[#6B6B6B]">{t("Features.softStoolRate")}</span>
<span className="text-[36px] font-bold leading-none tracking-tight text-[#111111]">
8<span className="text-[20px] font-semibold">%</span>
</span>
</div>
<div className="h-px bg-[rgba(0,0,0,0.06)]" />
<div className="flex items-baseline justify-between">
<span className="text-[14px] text-[#6B6B6B]">{t("Features.repurchaseRate")}</span>
<span className="text-[36px] font-bold leading-none tracking-tight text-[#111111]">
81<span className="text-[20px] font-semibold">%</span>
</span>
</div>
</div>
</div>
</div>
</section>

{/* ========== Product Carousel — Hot Cat Food ========== */}
<div>
<HotCatFoodSection initialProducts={productsResult} />
</div>

{/* ========== Footer ========== */}
<footer className="bg-white">
<div className="mx-auto max-w-[1440px] px-6 py-16 md:px-12 md:py-20">
<div className="flex flex-col items-center gap-6">
<div className="flex items-center gap-2.5">
<Image
src="/logo.png"
alt="Nuzzly Town Logo"
width={32}
height={32}
className="size-8 rounded-[8px]"
/>
<span className="text-[15px] font-semibold text-[#111111]">Nuzzly Town</span>
</div>

<nav className="flex flex-wrap items-center justify-center gap-6">
<span className="text-[13px] text-[#6B6B6B]">{t("Footer.privacyPolicy")}</span>
<span className="text-[13px] text-[#6B6B6B]">{t("Footer.termsOfService")}</span>
</nav>

<p className="text-[12px] text-[#D2D1CF]">
&copy; 2026 Nuzzly Town · {t("Footer.tagline")}
</p>
</div>
</div>
</footer>
</div>)
}
