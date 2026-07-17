"use client"

import { useState } from "react"
import { SettingsCard } from "@/components/settings/settings-card"

export default function FontSizeSettings() {
  const [fontSize, setFontSize] = useState(14)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          文字大小
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">调整界面文字显示大小</p>
      </div>

      <SettingsCard className="p-6 text-center">
        <p style={{ fontSize: `${fontSize}px` }} className="text-[#111111]">
          这是预览文字效果
        </p>
        <p className="mt-2 text-[12px] text-[#6B6B6B]">较小的辅助文字</p>
      </SettingsCard>

      <SettingsCard className="p-6">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-medium text-[#6B6B6B]">A</span>
          <input
            type="range"
            min="12"
            max="20"
            step="1"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="flex-1 accent-[#FF7A59]"
          />
          <span className="text-[20px] font-medium text-[#6B6B6B]">A</span>
        </div>
        <div className="mt-4 text-center text-[13px] text-[#6B6B6B]">
          {fontSize}px
        </div>
      </SettingsCard>

      <button className="w-full rounded-full bg-[#FF7A59] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#E86A4A]">
        保存
      </button>
    </div>
  )
}
