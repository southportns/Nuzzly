"use client"

import { cn } from "@/lib/utils"
import { ICON_EMOJI_MAP } from "@/lib/icon-emoji-map"

interface EmojiIconProps {
/** lucide / radix 图标Name */
name: string
size?: number
className?: string
}

export function EmojiIcon({ name, size = 20, className }: EmojiIconProps) {
const config = ICON_EMOJI_MAP[name]

if (!config) {
return null
}

if (config.type === "svg") {
return (<span
className={cn("inline-flex items-center justify-center leading-none",
className)}
style={{ width: size, height: size }}
aria-hidden="true"
>
{config.svg}
</span>)
}

return (<span
className={cn("inline-flex items-center justify-center leading-none",
className)}
style={{ width: size, height: size, fontSize: size * 0.75 }}
aria-hidden="true"
>
{config.type === "text"? config.char: config.glyph}
</span>)
}

/** returna can复use 图标component,use on config for object icon fields */
export function emojiIcon(name: string): React.FC<{ className?: string }> {
return function EmojiIconWrapper({ className }: { className?: string }) {
return <EmojiIcon name={name} className={className} />
}
}
