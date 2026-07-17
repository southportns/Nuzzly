import { SettingsCard } from "@/components/settings/settings-card"
import { Star } from "lucide-react"

export default function MembershipSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          会员
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">查看你的会员权益</p>
      </div>

      <div className="rounded-[20px] bg-gradient-to-br from-[#FF7A59] to-[#FFB89A] p-7 text-center">
        <div className="mb-2 text-[40px]">🌟</div>
        <div className="text-[20px] font-bold text-white">基础会员</div>
        <div className="mt-1 text-[13px] text-white/70">享受所有核心功能</div>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          {[
            { label: "专属推荐", value: "已解锁" },
            { label: "AI 问答", value: "已解锁" },
            { label: "长期追踪", value: "已解锁" },
            { label: "社区互动", value: "已解锁" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[15px] text-[#111111]">{item.label}</span>
              <span className="text-[13px] font-medium text-[#10B981]">{item.value}</span>
            </div>
          ))}
        </div>
      </SettingsCard>

      <p className="text-center text-[12px] text-[#6B6B6B]">更多高级功能即将推出,敬请期待</p>
    </div>
  )
}
