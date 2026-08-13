"use client"

import { useState } from "react"
import { SettingsCard } from "@/components/settings/settings-card"
import { SettingsToggle } from "@/components/settings/settings-toggle"

export default function InteractionSettings() {
  const [interaction, setInteraction] = useState({
    allowComment: true,
    allowFollow: true,
    likeNotify: true,
    commentNotify: true,
  })

  const handleSave = () => {
    localStorage.setItem("nuzzly_interaction", JSON.stringify(interaction))
    alert("Interaction settings saved")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          Interaction Settings
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">Manage your community interaction preferences</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          <SettingsToggle
            label="Allow Comments"
            checked={interaction.allowComment}
            onChange={(checked) => setInteraction({ ...interaction, allowComment: checked })}
          />
          <SettingsToggle
            label="Allow Follows"
            checked={interaction.allowFollow}
            onChange={(checked) => setInteraction({ ...interaction, allowFollow: checked })}
          />
          <SettingsToggle
            label="Like Notifications"
            checked={interaction.likeNotify}
            onChange={(checked) => setInteraction({ ...interaction, likeNotify: checked })}
          />
          <SettingsToggle
            label="Comment Notifications"
            checked={interaction.commentNotify}
            onChange={(checked) => setInteraction({ ...interaction, commentNotify: checked })}
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
