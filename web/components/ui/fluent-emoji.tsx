"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  getFluentEmoji,
  getFluentEmojiByGlyph,
  getFluentEmojiByUnicode,
  type FluentEmojiItem,
} from "@/lib/emoji"

const trackedEmojis = new Set<string>()

function trackEmojiUsage(item: FluentEmojiItem, context?: string) {
  const key = `${item.name}|${context ?? "unknown"}`
  if (trackedEmojis.has(key)) return
  trackedEmojis.add(key)

  try {
    fetch("/api/emoji/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emoji_name: item.name,
        emoji_unicode: item.unicode,
        context: context ?? "unknown",
        source: "web",
      }),
    })
  } catch {
    // 统计失败不应阻塞渲染
  }
}

interface FluentEmojiProps {
  /** cldr 名称，例如 "grinning face" */
  name?: string
  /** emoji 字符，例如 "😀" */
  glyph?: string
  /** unicode 码点，例如 "1f600" */
  unicode?: string
  size?: number
  alt?: string
  className?: string
  fallback?: React.ReactNode
  /** 使用场景，用于统计，例如 ai-chat、dashboard */
  context?: string
}

export function FluentEmoji({
  name,
  glyph,
  unicode,
  size = 24,
  alt,
  className,
  fallback,
  context,
}: FluentEmojiProps) {
  let emoji: FluentEmojiItem | undefined

  if (name) {
    emoji = getFluentEmoji(name)
  } else if (glyph) {
    emoji = getFluentEmojiByGlyph(glyph)
  } else if (unicode) {
    emoji = getFluentEmojiByUnicode(unicode)
  }

  useEffect(() => {
    if (emoji) {
      trackEmojiUsage(emoji, context)
    }
  }, [emoji?.name, context])

  if (!emoji) {
    return fallback ?? null
  }

  return (
    <img
      src={emoji.url}
      alt={alt ?? emoji.name}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 object-contain align-text-bottom", className)}
      loading="lazy"
    />
  )
}

interface EmojiTextProps {
  children: string
  size?: number
  className?: string
  /** 使用场景，用于统计，例如 ai-chat、dashboard */
  context?: string
}

const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/gu

/** 将字符串中的 emoji 字符自动替换为 3D Fluent Emoji 图片 */
export function EmojiText({ children, size = 16, className, context }: EmojiTextProps) {
  if (!children) return null

  const parts = children.split(EMOJI_PRESENTATION_REGEX)
  const emojis = children.match(EMOJI_PRESENTATION_REGEX) ?? []

  return (
    <>
      {parts.map((part, i) => (
        <span key={`t-${i}`}>
          {part}
          {emojis[i] && (
            <FluentEmoji
              key={`e-${i}`}
              glyph={emojis[i]}
              size={size}
              context={context}
              className={cn("mx-0.5 inline-block align-text-bottom", className)}
            />
          )}
        </span>
      ))}
    </>
  )
}
