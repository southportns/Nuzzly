"use client"

import { cn } from "@/lib/utils"
import { ICON_EMOJI_MAP } from "@/lib/icon-emoji-map"

interface EmojiIconProps {
  /** lucide / radix 图标名称 */
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
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center leading-none",
          className
        )}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {config.svg}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center leading-none",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.75 }}
      aria-hidden="true"
    >
      {config.type === "text" ? config.char : config.glyph}
    </span>
  )
}

/** 返回一个可复用的图标组件，用于 config 对象中的 icon 字段 */
export function emojiIcon(name: string): React.FC<{ className?: string }> {
  return function EmojiIconWrapper({ className }: { className?: string }) {
    return <EmojiIcon name={name} className={className} />
  }
}
