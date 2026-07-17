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
    alert("通知设置已保存")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          通知
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">管理你的通知偏好</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          <SettingsToggle
            label="推送通知"
            checked={notif.push}
            onChange={(checked) => setNotif({ ...notif, push: checked })}
          />
          <SettingsToggle
            label="饮食提醒"
            checked={notif.diet}
            onChange={(checked) => setNotif({ ...notif, diet: checked })}
          />
          <SettingsToggle
            label="疫苗提醒"
            checked={notif.vaccine}
            onChange={(checked) => setNotif({ ...notif, vaccine: checked })}
          />
          <SettingsToggle
            label="社区互动"
            checked={notif.social}
            onChange={(checked) => setNotif({ ...notif, social: checked })}
          />
        </div>
      </SettingsCard>

      <button
        onClick={handleSave}
        className="w-full rounded-full bg-[#FF7A59] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#E86A4A]"
      >
        保存
      </button>
    </div>
  )
}
