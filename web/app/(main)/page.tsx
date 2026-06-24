import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HotCatFoodSection } from "@/components/home/hot-cat-food-section"

// ---------- Mock feedback data ----------

const feedbacks = [
  { quote: "吃了两个月后明显稳定很多。", user: "布偶猫家长", days: 90 },
  { quote: "软便情况减少了，毛发也更亮。", user: "三花妈妈", days: 60 },
  { quote: "已经连续复购半年，非常放心。", user: "橘座饲养员", days: 180 },
]

// ---------- Page ----------

export default function HomePage() {
  return (
    <div className="bg-[#F7F6F3]">
      {/* ========== Hero Section ========== */}
      <section className="px-6 py-8 md:px-12 md:py-10">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[32px]">
          {/* Background Image */}
          <div className="relative aspect-[2.8/1] w-full">
            <img
              src="/hero-background.png"
              alt="Premium cat and cat food hero background"
              className="absolute inset-0 h-full w-full object-cover"
            />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 z-10 flex items-center">
              <div className="w-full max-w-[600px] px-8 md:px-16">
                <span className="mb-4 block text-[12px] font-bold uppercase tracking-[0.2em] text-[#FF7A59] md:mb-6 md:text-[13px]">
                  Pet Food Trust Infrastructure
                </span>

                <h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.04em] text-[#111111] md:text-[52px] lg:text-[64px]">
                  让每一次选择
                  <br />
                  都值得信赖
                </h1>

                <p className="mt-4 max-w-[420px] text-[14px] leading-[1.8] text-[#6B6B6B] md:mt-6 md:text-[16px] lg:text-[18px]">
                  基于长期数据与真实口碑，建立透明、可信赖的猫咪消费决策基础设施。
                </p>

                {/* CTA Button */}
                <Button
                  asChild
                  className="mt-6 h-[48px] rounded-full bg-[#FF7A59] px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(255,122,89,0.25)] transition-transform hover:translate-y-[-2px] md:mt-8 md:h-[52px] md:px-8 md:text-[16px]"
                >
                  <Link href="/signup">立即加入 →</Link>
                </Button>
              </div>
            </div>

            {/* Floating Data Card */}
            <div className="absolute right-[15%] top-[30%] z-20 hidden rounded-[14px] bg-white/95 px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm md:block lg:right-[18%]">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#FF7A59]">
                  <path d="M2 10L5 6L8 8L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[12px] text-[#6B6B6B]">累计追踪</span>
                <span className="text-[14px] font-semibold text-[#111111]">128,560+</span>
                <span className="text-[12px] text-[#6B6B6B]">只猫咪</span>
              </div>
            </div>
          </div>
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
      <HotCatFoodSection />

      {/* ========== Footer ========== */}
      <footer className="bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-12 md:py-20">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="PetRWD Logo"
                className="size-8 rounded-[8px]"
              />
              <span className="text-[15px] font-semibold text-[#111111]">PetRWD</span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/products" className="text-[13px] text-[#6B6B6B] transition-colors hover:text-[#111111]">产品库</Link>
              <span className="text-[13px] text-[#6B6B6B]">隐私政策</span>
              <span className="text-[13px] text-[#6B6B6B]">服务条款</span>
            </nav>

            <p className="text-[12px] text-[#D2D1CF]">
              &copy; 2026 PetRWD · Pet Real World Data. 数据驱动，理性养宠。
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
