"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { FluentEmoji, FLUENT_EMOJI as EMOJI } from "@/components/ui/fluent-emoji"
import { useTranslations } from "next-intl"

interface AppRedirectCardProps {
/** 图标 lucide name */
icon: string
/** 图标容器背景色 e.g. "bg-[#FF7A59]/10" */
iconBg: string
/** 图标颜色 e.g. "text-[#FF7A59]" */
iconColor: string
/** 卡 title */
label: string
}

/**
* Click to after 弹 sheetNotice"please App 端View" 卡,
* use on Web 端尚not完整支持,need to 引导User去 App used Feature 口.
*/
export function AppRedirectCard({ icon, iconBg, iconColor, label }: AppRedirectCardProps) {
const [open, setOpen] = useState(false)
const t = useTranslations("AppRedirect")

return (<>
<button
type="button"
onClick={() => setOpen(true)}
className="flex flex-col items-center gap-3 rounded-[16px] bg-[#F7F6F3] p-6 transition-colors hover:bg-[#F0EFED]"
>
<div className={`flex size-12 items-center justify-center rounded-xl ${iconBg}`}>
<EmojiIcon name={icon} className={`size-6 ${iconColor}`} />
</div>
<span className="text-[13px] font-medium text-[#111111]">{label}</span>
</button>

<Dialog open={open} onOpenChange={setOpen}>
<DialogContent className="max-w-[360px] p-6">
<DialogHeader>
<div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-[#FF7A59]/10">
<FluentEmoji src={EMOJI.mobilePhone} alt="mobile phone" size={32} />
</div>
<DialogTitle className="text-center text-[17px] font-semibold text-[#111111]">
{t("viewInApp")}
</DialogTitle>
<DialogDescription className="text-center text-[13px] text-[#6B6B6B]">
{t("description")}
</DialogDescription>
</DialogHeader>
<div className="flex justify-center pt-2">
<Button
variant="outline"
size="sm"
className="rounded-full px-6"
onClick={() => setOpen(false)}
>
{t("gotIt")}
</Button>
</div>
</DialogContent>
</Dialog>
</>)
}
