import { ShieldCheck, AlertTriangle, Clock, FileCheck, Bell, Users, BarChart3, Ban, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "保护计划 — Nuzzly毛球镇",
}

const features = [
  {
    icon: AlertTriangle,
    title: "风险预警系统",
    description: "实时监控产品异常反馈，自动发出风险预警。",
    status: "已上线",
  },
  {
    icon: Clock,
    title: "长期追踪机制",
    description: "7/30/90/180 天定期提醒，确保数据时间价值。",
    status: "已上线",
  },
  {
    icon: FileCheck,
    title: "凭证验证体系",
    description: "AI 验证购买凭证真实性，提升评价可信度。",
    status: "开发中",
  },
  {
    icon: Users,
    title: "可信用户等级",
    description: "基于活跃度与凭证评估用户可信度。",
    status: "已上线",
  },
  {
    icon: Bell,
    title: "配方变更追踪",
    description: "追踪产品配方变更历史，保护知情权。",
    status: "开发中",
  },
  {
    icon: ShieldCheck,
    title: "产品透明度指数",
    description: "从成分、工厂、检测等维度评估透明度。",
    status: "规划中",
  },
]

const principles = [
  {
    icon: BarChart3,
    title: "不做官方定性",
    description: "展示数据与统计，让用户基于数据自行决策。",
  },
  {
    icon: Ban,
    title: "严格打击水军",
    description: "凭证 + 信任分 + 行为分三重反作弊机制。",
  },
  {
    icon: Lock,
    title: "保护用户隐私",
    description: "评价匿名化处理，用户数据严格保密。",
  },
]

export default function ProtectionPage() {
  return (
    <div className="bg-[#F7F6F3]">
      <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-12 md:py-10">
        {/* ========== Hero ========== */}
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF7A59]">
            Protection Plan
          </span>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-[-0.04em] text-[#111111] md:text-[40px]">
            消费者保护计划
          </h1>
          <p className="mx-auto mt-2 max-w-[640px] text-[14px] leading-[1.7] text-[#6B6B6B] md:text-[15px]">
            通过多重机制保护消费者权益，
            确保每一位铲屎官获得真实、可信的产品信息。
          </p>
        </div>

        {/* ========== Main: Features (left) + Principles (right) ========== */}
        <div className="mt-6 grid gap-5 md:grid-cols-12 md:gap-6">
          {/* Left — Features 2-col x 3-row */}
          <div className="md:col-span-8">
            <div className="grid h-full gap-3 md:grid-cols-2 md:gap-4">
              {features.map((f) => {
                const Icon = f.icon
                return (
                  <div
                    key={f.title}
                    className="rounded-[20px] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-[#FF7A59]/10">
                        <Icon className="size-5 text-[#FF7A59]" />
                      </div>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-medium " +
                          (f.status === "已上线"
                            ? "bg-[#A8C5A0]/20 text-[#5A8A50]"
                            : f.status === "开发中"
                            ? "bg-[#E8A87C]/20 text-[#C47A3C]"
                            : "bg-[#F0EFED] text-[#6B6B6B]")
                        }
                      >
                        {f.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-bold text-[#111111]">{f.title}</h3>
                    <p className="mt-0.5 text-[12.5px] leading-[1.6] text-[#6B6B6B]">
                      {f.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right — Principles + CTA */}
          <div className="md:col-span-4">
            <div className="flex h-full flex-col rounded-[24px] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
              {/* Centered title block */}
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF7A59]">
                  Principles
                </span>
                <h2 className="mt-1 text-[15px] font-bold tracking-[-0.01em] text-[#111111]">
                  我们的原则
                </h2>
              </div>

              {/* 3 principles evenly distributed in flex-1 space */}
              <div className="mt-5 flex flex-1 flex-col justify-between gap-3.5">
                {principles.map((p) => {
                  const Icon = p.icon
                  return (
                    <div
                      key={p.title}
                      className="group flex items-center gap-3 rounded-[14px] bg-gradient-to-br from-[#FF7A59]/[0.07] to-[#FF7A59]/[0.01] p-3 ring-1 ring-[#FF7A59]/[0.08] transition-all hover:ring-[#FF7A59]/20"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A59]/15 to-[#FF7A59]/4 ring-1 ring-[#FF7A59]/10 transition-transform group-hover:scale-105">
                        <Icon className="size-[18px] text-[#FF7A59]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[12.5px] font-bold leading-[1.3] text-[#111111]">
                          {p.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-[1.5] text-[#6B6B6B]">
                          {p.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* CTA */}
              <div className="pt-3">
                <Button
                  asChild
                  className="h-[40px] w-full rounded-full bg-[#FF7A59] text-[13px] font-semibold text-white hover:bg-[#E86A4A]"
                >
                  <Link href="/signup">加入保护计划</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
