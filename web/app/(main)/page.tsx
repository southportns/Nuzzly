import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HotCatFoodSection } from "@/components/home/hot-cat-food-section"
import { HeroVideo } from "@/components/home/hero-video"
import { queryTotalPetCount } from "@/lib/supabase/queries/profile-queries"

// ---------- Mock feedback data ----------

const feedbacks = [
  { quote: "吃了两个月后明显稳定很多。", user: "布偶猫家长", days: 90 },
  { quote: "软便情况减少了，毛发也更亮。", user: "三花妈妈", days: 60 },
  { quote: "已经连续复购半年，非常放心。", user: "橘座饲养员", days: 180 },
]

// ---------- Page ----------

export default async function HomePage() {
  const { count: petCount } = await queryTotalPetCount()
  return (
    <div className="bg-[#F7F6F3] overflow-x-hidden">
      {/* ========== Hero Section ========== */}
      <section className="px-6 pt-[29px] pb-8 md:px-12 md:pb-10">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[32px]">
          {/* Background Video */}
          <HeroVideo petCount={petCount} />
        </div>
      </section>

      {/* ========== Feature Cards — Three Columns ========== */}
      <section className="mx-auto max-w-[1440px] px-6 pb-24 md:px-12">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1 — 长期追踪 */}
          <div className="rounded-[32px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#A8C5A0]">
              Long-term Tracking
            </span>
            <h3 className="mt-4 text-[24px] font-bold leading-tight text-[#111111]">
              长期追踪数据
            </h3>
            <p className="mt-3 text-[15px] leading-[1.8] text-[#6B6B6B]">
              30天 · 90天 · 180天持续追踪，用时间验证每一条反馈。
            </p>

            {/* Mini chart — Apple Health style */}
            <div className="mt-6 flex items-end gap-3">
              {[30, 50, 65, 45, 72, 58, 80].map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  { }
                  <div
                    className="w-full rounded-full bg-[#A8C5A0]/60 transition-all"
                    style={{ height: `${v * 1.2}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-[#6B6B6B]">
              <span>30天</span>
              <span>90天</span>
              <span>180天</span>
            </div>
          </div>

          {/* Card 2 — 社区真实口碑 */}
          <div className="rounded-[32px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#E8A87C]">
              Community Voice
            </span>
            <h3 className="mt-4 text-[24px] font-bold leading-tight text-[#111111]">
              社区真实口碑
            </h3>

            <div className="mt-6 flex flex-col gap-5">
              {feedbacks.map((f) => (
                <div key={f.user} className="flex flex-col gap-1.5">
                  <p className="text-[15px] leading-[1.6] text-[#111111]">
                    &ldquo;{f.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-full bg-[#F0EFED]" />
                    <span className="text-[12px] text-[#6B6B6B]">{f.user}</span>
                    <span className="text-[12px] text-[#D2D1CF]">·</span>
                    <span className="text-[12px] text-[#6B6B6B]">{f.days}天追踪</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — 透明产品数据 */}
          <div className="rounded-[32px] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#7BA7BC]">
              Transparent Data
            </span>
            <h3 className="mt-4 text-[24px] font-bold leading-tight text-[#111111]">
              透明产品数据
            </h3>
            <p className="mt-3 text-[15px] leading-[1.8] text-[#6B6B6B]">
              每款产品均公开核心指标，拒绝信息不对称。
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-[#6B6B6B]">适口性</span>
                <span className="text-[36px] font-bold leading-none tracking-tight text-[#111111]">
                  92<span className="text-[20px] font-semibold">%</span>
                </span>
              </div>
              <div className="h-px bg-[rgba(0,0,0,0.06)]" />
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-[#6B6B6B]">软便率</span>
                <span className="text-[36px] font-bold leading-none tracking-tight text-[#111111]">
                  8<span className="text-[20px] font-semibold">%</span>
                </span>
              </div>
              <div className="h-px bg-[rgba(0,0,0,0.06)]" />
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-[#6B6B6B]">复购率</span>
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
        <HotCatFoodSection />
      </div>

      {/* ========== Footer ========== */}
      <footer className="bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-12 md:py-20">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Nuzzly毛球镇 Logo"
                className="size-8 rounded-[8px]"
              />
              <span className="text-[15px] font-semibold text-[#111111]">Nuzzly毛球镇</span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-6">
              <span className="text-[13px] text-[#6B6B6B]">隐私政策</span>
              <span className="text-[13px] text-[#6B6B6B]">服务条款</span>
            </nav>

            <p className="text-[12px] text-[#D2D1CF]">
              &copy; 2026 Nuzzly毛球镇 · 数据驱动，理性养宠。
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
