import Link from "next/link"
import { cn } from "@/lib/utils"

export default function SettingsSubLayout({
children,
}: {
children: React.ReactNode
}) {
return (<div className="space-y-6">
<Link
href="/dashboard/settings"
className={cn("inline-flex items-center rounded-full border border-white/60 bg-white/55 px-3.5 py-1.5",
"text-[14px] font-medium text-[#6B6B6B] backdrop-blur-xl",
"shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.03)]",
"transition-colors hover:bg-white/80 hover:text-[#111111]",)}
>
returnSettings
</Link>
{children}
</div>)
}
