"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  loadEmojiIndex,
  getFluentEmoji,
  getFluentEmojiByGlyph,
  getFluentEmojiByUnicode,
  type FluentEmojiItem,
} from "@/lib/emoji"

const trackedEmojis = new Set<string>()

// ─── 批量 emoji 使用统计 ─────────────────────────────────────────────────────

interface TrackPayload {
  emoji_name: string
  emoji_unicode: string
  context: string
  source: string
}

const BATCH_SIZE = 10
const FLUSH_DELAY_MS = 5000

const pendingTracks: TrackPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let listenersAttached = false

function flushTracks() {
  if (pendingTracks.length === 0) return

  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  const batch = pendingTracks.splice(0, pendingTracks.length)
  const body = JSON.stringify({ records: batch })

  // 使用 requestIdleCallback 在浏览器空闲时发送，避免阻塞关键路径
  const sendRequest = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" })
        const sent = navigator.sendBeacon("/api/emoji/track", blob)
        if (sent) return
      }

      fetch("/api/emoji/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
    } catch {
      // 统计失败不应阻塞渲染
    }
  }

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    ;(window as any).requestIdleCallback(sendRequest, { timeout: 5000 })
  } else {
    setTimeout(sendRequest, 100)
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flushTracks, FLUSH_DELAY_MS)
}

function trackEmojiUsage(item: FluentEmojiItem, context?: string) {
  const key = `${item.name}|${context ?? "unknown"}`
  if (trackedEmojis.has(key)) return
  trackedEmojis.add(key)

  pendingTracks.push({
    emoji_name: item.name,
    emoji_unicode: item.unicode,
    context: context ?? "unknown",
    source: "web",
  })

  if (pendingTracks.length >= BATCH_SIZE) {
    flushTracks()
  } else {
    scheduleFlush()
  }
}

if (typeof window !== "undefined" && !listenersAttached) {
  listenersAttached = true
  window.addEventListener("pagehide", flushTracks)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushTracks()
    }
  })
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadEmojiIndex().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  let emoji: FluentEmojiItem | undefined
  if (ready) {
    if (name) {
      emoji = getFluentEmoji(name)
    } else if (glyph) {
      emoji = getFluentEmojiByGlyph(glyph)
    } else if (unicode) {
      emoji = getFluentEmojiByUnicode(unicode)
    }
  }

  useEffect(() => {
    if (emoji) {
      trackEmojiUsage(emoji, context)
    }
  }, [emoji?.name, context])

  if (!ready || !emoji) {
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
