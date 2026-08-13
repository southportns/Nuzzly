"use client"

import { useState } from "react"
import { SettingsCard } from "@/components/settings/settings-card"
import { SettingsToggle } from "@/components/settings/settings-toggle"

export default function PrivacySettings() {
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showReviews: true,
    allowRecommend: true,
    shareData: false,
  })

  const handleSave = () => {
    localStorage.setItem("nuzzly_privacy", JSON.stringify(privacy))
    alert("Privacy settings saved")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          Privacy
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">Manage your privacy settings</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          <SettingsToggle
            label="Public Profile"
            checked={privacy.publicProfile}
            onChange={(checked) => setPrivacy({ ...privacy, publicProfile: checked })}
          />
          <SettingsToggle
            label="Show Reviews"
            checked={privacy.showReviews}
            onChange={(checked) => setPrivacy({ ...privacy, showReviews: checked })}
          />
          <SettingsToggle
            label="Allow Recommendations"
            checked={privacy.allowRecommend}
            onChange={(checked) => setPrivacy({ ...privacy, allowRecommend: checked })}
          />
          <SettingsToggle
            label="Share Usage Data"
            checked={privacy.shareData}
            onChange={(checked) => setPrivacy({ ...privacy, shareData: checked })}
          />
        </div>
      </SettingsCard>

      <button
        onClick={handleSave}
        className="w-full rounded-full bg-[#FF7A59] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#E86A4A]"
      >
        Save
      </button>
    </div>
  )
}
