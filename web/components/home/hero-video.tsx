"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"

export function HeroVideo({ petCount = 0 }: { petCount?: number }) {
const { user } = useAuth()
const router = useRouter()
const t = useTranslations("Hero")
const videoRef = useRef<HTMLVideoElement>(null)
const [videoLoaded, setVideoLoaded] = useState(false)
const [isMuted, setIsMuted] = useState(true)
const [displayCount, setDisplayCount] = useState(0)
const finalCount = petCount + 55029

// Loading gate: show hero content only after video is ready
const [heroReady, setHeroReady] = useState(false)

useEffect(() => {
const duration = 1500
const steps = 60
let current = 0
let step = 0

const timer = setInterval(() => {
step++
const progress = 1 - Math.pow(1 - step / steps, 3)
current = Math.round(finalCount * progress)
setDisplayCount(current)

if (step >= steps) {
setDisplayCount(finalCount)
clearInterval(timer)
}
}, duration / steps)

return () => clearInterval(timer)
}, [finalCount])

// Fallback: if video takes too long (>4s), show hero anyway
useEffect(() => {
const fallback = setTimeout(() => {
if (!videoLoaded) {
setVideoLoaded(true)
setHeroReady(true)
}
}, 4000)
return () => clearTimeout(fallback)
}, [videoLoaded])

const handleVideoCanPlay = useCallback(() => {
setVideoLoaded(true)
setHeroReady(true)
const v = videoRef.current
if (!v) return
v.volume = 0.7
// 尝试带声音播放,浏览器策略阻止 保持静音
v.muted = false
v.play().catch(() => {
v.muted = true
v.play().catch(() => {})
setIsMuted(true)
})
if (!v.muted) setIsMuted(false)
}, [])

const handleReplay = useCallback(() => {
if (videoRef.current) {
videoRef.current.currentTime = 0
videoRef.current.volume = 0.7
videoRef.current.play().catch(() => {})
}
}, [])

const toggleMute = useCallback(() => {
const v = videoRef.current
if (!v) return
v.muted =!v.muted
if (!v.muted) v.volume = 0.7
setIsMuted(v.muted)
if (!v.muted) {
v.play().catch(() => {})
}
}, [])

return (<div className="relative aspect-[2.5/1] w-full">
{/* LCP element: static image loads immediately */}
<Image
src="/hero-background.png"
alt="Nuzzly town"
fill
priority
sizes="100vw"
className="absolute inset-0 h-full w-full object-cover"
/>
{/* Video loads in background, covers image when ready */}
<video
ref={videoRef}
src="/nuzzly-town.mp4"
autoPlay
muted
playsInline
preload="auto"
onCanPlay={handleVideoCanPlay}
className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
videoLoaded? "opacity-100": "opacity-0"
}`}
/>

{/* Warm gradient overlay */}
<div className="absolute inset-0 z-[5] bg-gradient-to-r from-[#3D2817]/60 via-[#3D2817]/30 to-transparent" />

{/* Loading overlay — shown until video is ready */}
{!heroReady && (
<div className="absolute inset-0 z-[6] flex items-center justify-center bg-[#3D2817]/40 backdrop-blur-sm transition-opacity duration-500">
<div className="flex flex-col items-center gap-3">
{/* Animated loading dots */}
<div className="flex gap-1.5">
<span className="size-2 rounded-full bg-white/70 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
<span className="size-2 rounded-full bg-white/70 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: "150ms" }} />
<span className="size-2 rounded-full bg-white/70 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: "300ms" }} />
</div>
<span className="text-[12px] font-medium tracking-wide text-white/60 uppercase">{t("loading") || "Loading"}</span>
</div>
</div>
)}

{/* Content Overlay — fades in when hero is ready */}
<div className={`absolute inset-0 z-10 flex items-center transition-all duration-700 ${
heroReady? "opacity-100 translate-y-0": "opacity-0 translate-y-4"
}`}>
<div className="w-full max-w-[600px] px-8 md:px-16">
<span className="mb-4 block text-[12px] font-bold uppercase tracking-[0.2em] text-[#FFB59E] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] md:mb-6 md:text-[13px]">
{t("badge")}
</span>

<h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.04em] text-[#FFF8F0] drop-shadow-[0_2px_8px_rgba(40,20,5,0.45)] md:text-[52px] lg:text-[64px]">
{t("title")}
</h1>

<p className="mt-4 max-w-[420px] text-[14px] leading-[1.8] text-white/80 drop-shadow-[0_1px_4px_rgba(40,20,5,0.4)] md:mt-6 md:text-[16px] lg:text-[18px]">
{t("subtitle")}
</p>

<Button
type="button"
onClick={() => (user? router.push("/dashboard"): router.push("/login"))}
className="mt-6 h-[48px] rounded-full bg-[#FF7A59] px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(255,122,89,0.25)] transition-transform hover:translate-y-[-2px] md:mt-8 md:h-[52px] md:px-8 md:text-[16px] whitespace-nowrap"
>
{t("cta")}
</Button>
</div>
</div>

{/* Floating Data Card */}
<div className={`absolute right-[15%] top-[30%] z-20 hidden rounded-[14px] bg-[#3D2817]/70 backdrop-blur-xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 transition-all duration-700 md:block lg:right-[18%] ${
heroReady? "opacity-100 translate-x-0": "opacity-0 translate-x-4"
}`}>
<div className="flex items-center gap-2">
<EmojiIcon name="Check" size={14} className="flex-shrink-0 mt-0.5" />
<span className="text-[12px] text-white/80 leading-none">{t("statPets")}</span>
<span className="text-[14px] font-semibold text-white leading-none">{displayCount.toLocaleString()}+</span>
</div>
</div>

{/* Sound toggle button */}
<button
onClick={toggleMute}
className={`absolute bottom-6 right-20 z-20 flex size-11 items-center justify-center rounded-full bg-white/60 text-[#3D2817] shadow-[0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/80 ${
heroReady? "opacity-100": "opacity-0 pointer-events-none"
}`}
title={isMuted? "Unmute": "Mute"}
>
{isMuted? (<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
<line x1="23" y1="9" x2="17" y2="15" />
<line x1="17" y1="9" x2="23" y2="15" />
</svg>): (<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
</svg>)}
</button>

{/* Replay button - always visible */}
<button
onClick={handleReplay}
className={`absolute bottom-6 right-6 z-20 flex size-11 items-center justify-center rounded-full bg-white/60 text-[#FF7A59] shadow-[0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/80 ${
heroReady? "opacity-100": "opacity-0 pointer-events-none"
}`}
title="Replay"
>
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<polygon points="8 5 19 12 8 19 8 5" fill="currentColor" />
</svg>
</button>
</div>)
}
