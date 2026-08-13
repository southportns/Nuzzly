"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { SettingsCard } from "@/components/settings/settings-card"

const languages = [
{ value: "en", label: "English" },
{ value: "zh", label: "Simplified Chinese" },
]

export default function LanguageSettings() {
const [lang, setLang] = useState("en")

return (<div className="space-y-6">
<div>
<h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
Language
</h1>
<p className="mt-2 text-[14px] text-[#6B6B6B]">Select the interface language</p>
</div>

<SettingsCard>
<div className="divide-y divide-[rgba(0,0,0,0.04)]">
{languages.map((item) => (<button
key={item.value}
onClick={() => setLang(item.value)}
className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-[#F7F6F3]"
>
<span className="text-[15px] text-[#111111]">{item.label}</span>
{lang === item.value && (<EmojiIcon name="Check" className="size-4 text-[#FF7A59]" />)}
</button>))}
</div>
</SettingsCard>

<p className="text-center text-[12px] text-[#6B6B6B]">Language changes will take effect on next launch</p>
</div>)
}
