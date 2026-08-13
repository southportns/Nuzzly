"use client"

import { useState } from "react"
import { SettingsCard } from "@/components/settings/settings-card"
import { SettingsToggle } from "@/components/settings/settings-toggle"

export default function NotificationSettings() {
  const [notif, setNotif] = useState({
    push: true,
    diet: true,
    vaccine: true,
    social: false,
  })

  const handleSave = () => {
    localStorage.setItem("nuzzly_notif", JSON.stringify(notif))
    alert("Notification settings saved")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          Notifications
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">Manage your notification preferences</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          <SettingsToggle
            label="Push Notifications"
            checked={notif.push}
            onChange={(checked) => setNotif({ ...notif, push: checked })}
          />
          <SettingsToggle
            label="Diet Reminders"
            checked={notif.diet}
            onChange={(checked) => setNotif({ ...notif, diet: checked })}
          />
          <SettingsToggle
            label="Vaccine Reminders"
            checked={notif.vaccine}
            onChange={(checked) => setNotif({ ...notif, vaccine: checked })}
          />
          <SettingsToggle
            label="Community Activity"
            checked={notif.social}
            onChange={(checked) => setNotif({ ...notif, social: checked })}
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
