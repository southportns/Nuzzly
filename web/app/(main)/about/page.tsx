import { ShieldCheck, Database, Users, Heart, Eye } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "关于我们 — PetRWD",
}

const values = [
  {
    icon: Database,
    title: "数据驱动",
    description: "基于真实长期反馈，而非短期种草内容。",
  },
  {
    icon: Eye,
    title: "透明公开",
    description: "产品数据、风险记录全部公开透明。",
  },
  {
    icon: Users,
    title: "社区共建",
    description: "由真实铲屎官共同建设的消费决策数据库。",
  },
  {
    icon: Heart,
    title: "宠物优先",
    description: "一切决策以宠物健康为核心。",
  },
]

const stats = [
  { value: "50,000+", label: "真实用户" },
  { value: "1,200,000+", label: "追踪数据" },
  { value: "4.8 / 5", label: "可信评分" },
]

export default function AboutPage() {
  return (
    <div className="bg-[#F7F6F3]">
      <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-12 md:py-10">
        {/* ========== Hero ========== */}
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF7A59]">
            About PetRWD · PET REAL WORLD DATA
          </span>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-[-0.04em] text-[#111111] md:text-[40px]">
            让每一次选择&nbsp;都值得信赖
          </h1>
          <p className="mx-auto mt-2 max-w-[640px] text-[14px] leading-[1.7] text-[#6B6B6B] md:text-[15px]">
            PetRWD（Pet Real World Data）是一个基于真实长期反馈数据的猫咪消费信任平台，
            通过数据驱动、社区共建和 AI 分析帮助铲屎官做出更理性的消费决策。
          </p>
        </div>

        {/* ========== Main: Values (left) + Mission (right) ========== */}
        <div className="mt-6 grid gap-5 md:grid-cols-12 md:gap-6">
          {/* Left — Values 2x2 */}
          <div className="md:col-span-7">
            <div className="grid h-full gap-3 md:grid-cols-2 md:gap-4">
              {values.map((v) => {
                const Icon = v.icon
                return (
                  <div
                    key={v.title}
                    className="flex flex-col items-center justify-center gap-3 rounded-[20px] bg-white p-5 text-center shadow-[0_8px_40px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A59]/10">
                      <Icon className="size-5 text-[#FF7A59]" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#111111]">{v.title}</h3>
                      <p className="mt-1 text-[12.5px] leading-[1.6] text-[#6B6B6B]">
                        {v.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right — Mission + Stats + CTAs */}
          <div className="md:col-span-5">
            <div className="flex h-full flex-col rounded-[24px] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A59]/10">
                  <ShieldCheck className="size-5 text-[#FF7A59]" />
                </div>
                <h2 className="text-[18px] font-bold text-[#111111]">我们的使命</h2>
              </div>

              <p className="mt-3 text-[13px] leading-[1.7] text-[#6B6B6B]">
                建立宠物行业最可信赖的消费决策数据库，
                让每一位铲屎官都能找到真正适合自家主子的产品。
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#F0EFED] pt-4">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-[17px] font-bold leading-none text-[#111111]">
                      {s.value}
                    </div>
                    <div className="mt-1.5 text-[11px] text-[#6B6B6B]">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-5">
                <Button
                  asChild
                  className="h-[40px] rounded-full bg-[#FF7A59] px-5 text-[13px] font-semibold text-white hover:bg-[#E86A4A]"
                >
                  <Link href="/products">浏览产品库</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-[40px] rounded-full px-5 text-[13px] font-medium"
                >
                  <Link href="/ai">咨询 AI 助手</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
