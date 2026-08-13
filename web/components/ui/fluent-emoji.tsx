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

// ─── Common emoji asset paths for quick reference ────────────────────────────
export const FLUENT_EMOJI = {
redHeart: "/fluentui-emoji/assets/Red heart/3D/red_heart_3d.png",
alarmClock: "/fluentui-emoji/assets/Alarm clock/3D/alarm_clock_3d.png",
forkKnife: "/fluentui-emoji/assets/Fork and knife with plate/3D/fork_and_knife_with_plate_3d.png",
chartUp: "/fluentui-emoji/assets/Chart increasing/3D/chart_increasing_3d.png",
pencil: "/fluentui-emoji/assets/Pencil/3D/pencil_3d.png",
idCard: "/fluentui-emoji/assets/Identification card/3D/identification_card_3d.png",
warning: "/fluentui-emoji/assets/Warning/3D/warning_3d.png",
catFace: "/fluentui-emoji/assets/Cat face/3D/cat_face_3d.png",
dogFace: "/fluentui-emoji/assets/Dog face/3D/dog_face_3d.png",
pawPrints: "/fluentui-emoji/assets/Paw prints/3D/paw_prints_3d.png",
calendar: "/fluentui-emoji/assets/Calendar/3D/calendar_3d.png",
house: "/fluentui-emoji/assets/House/3D/house_3d.png",
sparkle: "/fluentui-emoji/assets/Sparkle/3D/sparkle_3d.png",
checkMark: "/fluentui-emoji/assets/Check mark button/3D/check_mark_button_3d.png",
trash: "/fluentui-emoji/assets/Wastebasket/3D/wastebasket_3d.png",
hourglass: "/fluentui-emoji/assets/Hourglass not done/3D/hourglass_not_done_3d.png",
stethoscope: "/fluentui-emoji/assets/Stethoscope/3D/stethoscope_3d.png",
pill: "/fluentui-emoji/assets/Pill/3D/pill_3d.png",
syringe: "/fluentui-emoji/assets/Syringe/3D/syringe_3d.png",
plus: "/fluentui-emoji/assets/Plus/3D/plus_3d.png",
x: "/fluentui-emoji/assets/Cross mark/3D/cross_mark_3d.png",
chartDown: "/fluentui-emoji/assets/Chart decreasing/3D/chart_decreasing_3d.png",
star: "/fluentui-emoji/assets/Star/3D/star_3d.png",
email: "/fluentui-emoji/assets/E-mail/3D/e-mail_3d.png",
locked: "/fluentui-emoji/assets/Locked/3D/locked_3d.png",
shield: "/fluentui-emoji/assets/Shield/3D/shield_3d.png",
mobilePhone: "/fluentui-emoji/assets/Mobile phone/3D/mobile_phone_3d.png",
orangeCircle: "/fluentui-emoji/assets/Orange circle/3D/orange_circle_3d.png",
} as const

const trackedEmojis = new Set<string>()

// ─── 批量 emoji usedStatistics ─────────────────────────────────────────────────────

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

// used requestIdleCallback 浏览器empty闲时Send,避免阻塞close 键路径
const sendRequest = () => {
try {
if (typeof navigator!== "undefined" && navigator.sendBeacon) {
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
// Statisticsfailednot should阻塞渲染
}
}

if (typeof window!== "undefined" && "requestIdleCallback" in window) {;(window as any).requestIdleCallback(sendRequest, { timeout: 5000 })
} else {
setTimeout(sendRequest, 100)
}
}

function scheduleFlush() {
if (flushTimer) return
flushTimer = setTimeout(flushTracks, FLUSH_DELAY_MS)
}

function trackEmojiUsage(item: FluentEmojiItem, context?: string) {
const key = `${item.name}|${context?? "unknown"}`
if (trackedEmojis.has(key)) return
trackedEmojis.add(key)

pendingTracks.push({
emoji_name: item.name,
emoji_unicode: item.unicode,
context: context?? "unknown",
source: "web",
})

if (pendingTracks.length >= BATCH_SIZE) {
flushTracks()
} else {
scheduleFlush()
}
}

if (typeof window!== "undefined" &&!listenersAttached) {
listenersAttached = true
window.addEventListener("pagehide", flushTracks)
document.addEventListener("visibilitychange", () => {
if (document.visibilityState === "hidden") {
flushTracks()
}
})
}

interface FluentEmojiProps {
/** Direct path to the 3D PNG asset. When provided, skips async index loading. */
src?: string
/** cldr Name,e.g. "grinning face" */
name?: string
/** emoji chars符,e.g. "😀" */
glyph?: string
/** unicode 码点,e.g. "1f600" */
unicode?: string
size?: number
alt?: string
className?: string
fallback?: React.ReactNode
/** used场景,use onStatistics,e.g. ai-chat,dashboard */
context?: string
}

export function FluentEmoji({
src,
name,
glyph,
unicode,
size = 24,
alt,
className,
fallback,
context,
}: FluentEmojiProps) {
// ── Fast path: direct src provided, no async loading needed ──
if (src) {
return (// eslint-disable-next-line @next/next/no-img-element
<img
src={src}
alt={alt?? name?? "emoji"}
width={size}
height={size}
className={cn("inline-block shrink-0 object-contain align-text-bottom drop-shadow-[0_1px_2px_rgba(255,122,89,0.3)]",
className,)}
loading="lazy"
/>)
}

// ── Original path: async index lookup ──
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

if (!ready ||!emoji) {
return fallback?? null
}

return (<img
src={emoji.url}
alt={alt?? emoji.name}
width={size}
height={size}
className={cn("inline-block shrink-0 object-contain align-text-bottom", className)}
loading="lazy"
/>)
}

interface EmojiTextProps {
children: string
size?: number
className?: string
/** used场景,use onStatistics,e.g. ai-chat,dashboard */
context?: string
}

const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/gu

/** will chars符串 emoji chars符自动替换 for 3D Fluent Emoji Images */
export function EmojiText({ children, size = 16, className, context }: EmojiTextProps) {
if (!children) return null

const parts = children.split(EMOJI_PRESENTATION_REGEX)
const emojis = children.match(EMOJI_PRESENTATION_REGEX)?? []

return (<>
{parts.map((part, i) => (<span key={`t-${i}`}>
{part}
{emojis[i] && (<FluentEmoji
key={`e-${i}`}
glyph={emojis[i]}
size={size}
context={context}
className={cn("mx-0.5 inline-block align-text-bottom", className)}
/>)}
</span>))}
</>)
}
