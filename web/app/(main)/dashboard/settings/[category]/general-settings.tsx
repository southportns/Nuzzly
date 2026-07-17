"use client"

import { useState } from "react"
import { SettingsCard } from "@/components/settings/settings-card"
import { SettingsToggle } from "@/components/settings/settings-toggle"

export default function GeneralSettings() {
  const [general, setGeneral] = useState({
    darkMode: false,
    autoPlay: true,
    highQuality: true,
  })

  const handleSave = () => {
    localStorage.setItem("nuzzly_general", JSON.stringify(general))
    alert("通用设置已保存")
  }

  const handleClearCache = () => {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith("nuzzly_")) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    alert("缓存已清除")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          通用
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">管理应用通用设置</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          <SettingsToggle
            label="深色模式"
            checked={general.darkMode}
            onChange={(checked) => setGeneral({ ...general, darkMode: checked })}
          />
          <SettingsToggle
            label="自动播放视频"
            checked={general.autoPlay}
            onChange={(checked) => setGeneral({ ...general, autoPlay: checked })}
          />
          <SettingsToggle
            label="图片高质量加载"
            checked={general.highQuality}
            onChange={(checked) => setGeneral({ ...general, highQuality: checked })}
          />
        </div>
      </SettingsCard>

      <button
        onClick={handleSave}
        className="w-full rounded-full bg-[#FF7A59] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#E86A4A]"
      >
        保存
      </button>

      <button
        onClick={handleClearCache}
        className="w-full rounded-full border border-[#FF3B30]/20 bg-transparent py-3 text-[15px] font-semibold text-[#FF3B30] transition-colors hover:bg-[#FF3B30]/5"
      >
        清除缓存
      </button>
    </div>
  )
}
