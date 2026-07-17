"use client"

import { useState } from "react"
import { SettingsCard } from "@/components/settings/settings-card"
import { Check } from "lucide-react"

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
]

export default function LanguageSettings() {
  const [lang, setLang] = useState("zh-CN")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          语言
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">选择界面显示语言</p>
      </div>

      <SettingsCard>
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          {languages.map((item) => (
            <button
              key={item.value}
              onClick={() => setLang(item.value)}
              className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
            >
              <span className="text-[15px] text-[#111111]">{item.label}</span>
              {lang === item.value && (
                <Check className="size-4 text-[#FF7A59]" />
              )}
            </button>
          ))}
        </div>
      </SettingsCard>

      <p className="text-center text-[12px] text-[#6B6B6B]">语言切换将在下次启动时生效</p>
    </div>
  )
}
