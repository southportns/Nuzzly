import { SettingsCard } from "@/components/settings/settings-card"

export default function MembershipSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          Membership
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">View your membership benefits</p>
      </div>

      <div className="rounded-[20px] bg-gradient-to-br from-[#FF7A59] to-[#FFB89A] p-7 text-center">
        <div className="mb-2 text-[40px]">🌟</div>
        <div className="text-[20px] font-bold text-white">Basic Member</div>
        <div className="mt-1 text-[13px] text-white/70">Enjoy all core features</div>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          {[
            { label: "Exclusive Recommendations", value: "Unlocked" },
            { label: "AI Q&A", value: "Unlocked" },
            { label: "Long-term Tracking", value: "Unlocked" },
            { label: "Community Interaction", value: "Unlocked" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[15px] text-[#111111]">{item.label}</span>
              <span className="text-[13px] font-medium text-[#10B981]">{item.value}</span>
            </div>
          ))}
        </div>
      </SettingsCard>

      <p className="text-center text-[12px] text-[#6B6B6B]">More advanced features coming soon</p>
    </div>
  )
}
