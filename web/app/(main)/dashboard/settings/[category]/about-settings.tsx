import { SettingsCard } from "@/components/settings/settings-card"
import { ChevronRight } from "lucide-react"

export default function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          关于我们
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">了解 Nuzzly 毛球镇</p>
      </div>

      <SettingsCard className="p-6 text-center">
        <div className="mb-2 text-[48px]">🐾</div>
        <div className="text-[18px] font-semibold text-[#111111]">毛球镇 Nuzzly</div>
        <div className="mt-1 text-[13px] text-[#6B6B6B]">版本 1.0.0</div>
      </SettingsCard>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          {["用户协议", "隐私政策", "开源许可"].map((item) => (
            <div
              key={item}
              className="flex cursor-pointer items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
            >
              <span className="text-[15px] text-[#111111]">{item}</span>
              <ChevronRight className="size-4 text-[#D2D1CF]" />
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  )
}
