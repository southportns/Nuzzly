"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export function HeroVideo({ petCount = 0 }: { petCount?: number }) {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasEnded, setHasEnded] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [displayCount, setDisplayCount] = useState(0)
  const finalCount = petCount + 55029

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

  const handleReplay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
      setHasEnded(false)
    }
  }, [])

  const handleVideoCanPlay = useCallback(() => {
    setVideoLoaded(true)
  }, [])

  return (
    <div className="relative aspect-[2.5/1] w-full">
      {/* LCP element: static image loads immediately */}
      <img
        src="/hero-background.png"
        alt="Nuzzly town"
        fetchPriority="high"
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
        onEnded={() => setHasEnded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          videoLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Warm gradient overlay */}
      <div className="absolute inset-0 z-[5] bg-gradient-to-r from-[#3D2817]/60 via-[#3D2817]/30 to-transparent" />

      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="w-full max-w-[600px] px-8 md:px-16">
          <span className="mb-4 block text-[12px] font-bold uppercase tracking-[0.2em] text-[#FFB59E] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] md:mb-6 md:text-[13px]">
            Pet Food Trust Infrastructure
          </span>

          <h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.04em] text-[#FFF8F0] drop-shadow-[0_2px_8px_rgba(40,20,5,0.45)] md:text-[52px] lg:text-[64px]">
            让每一次选择
            <br />
            都值得信赖
          </h1>

          <p className="mt-4 max-w-[420px] text-[14px] leading-[1.8] text-white/80 drop-shadow-[0_1px_4px_rgba(40,20,5,0.4)] md:mt-6 md:text-[16px] lg:text-[18px]">
            基于长期数据与真实口碑，建立透明、可信赖的猫咪消费决策基础设施。
          </p>

          <Button
            asChild
            className="mt-6 h-[48px] rounded-full bg-[#FF7A59] px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(255,122,89,0.25)] transition-transform hover:translate-y-[-2px] md:mt-8 md:h-[52px] md:px-8 md:text-[16px]"
          >
            <Link href={user ? "/dashboard" : "/signup"}>立即加入</Link>
          </Button>
        </div>
      </div>

      {/* Floating Data Card */}
      <div className="absolute right-[15%] top-[30%] z-20 hidden rounded-[14px] bg-[#3D2817]/70 backdrop-blur-xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 md:block lg:right-[18%]">
        <div className="flex items-center gap-2">
          <EmojiIcon name="Check" size={14} className="flex-shrink-0 mt-0.5" />
          <span className="text-[12px] text-white/80 leading-none">累计追踪</span>
          <span className="text-[14px] font-semibold text-white leading-none">{displayCount.toLocaleString()}+</span>
          <span className="text-[12px] text-white/80 leading-none">只猫咪</span>
        </div>
      </div>

      {/* Replay button - shown after video ends */}
      {hasEnded && (
        <button
          onClick={handleReplay}
          className="absolute bottom-6 right-6 z-20 flex size-12 items-center justify-center rounded-full bg-white/60 text-[#FF7A59] shadow-[0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/80"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 18 18" className="ml-0.5">
            <path d="M12.031,10.08c.388-.227,.62-.63,.62-1.08s-.232-.853-.62-1.08c0,0,0,0,0,0l-3.651-2.129c-.387-.226-.866-.226-1.252-.004-.387,.223-.627,.638-.627,1.084v4.259c0,.446,.24,.861,.627,1.084,.192,.11,.407,.166,.623,.166,.218,0,.436-.057,.63-.169l3.651-2.13Z" fill="currentColor" />
            <path d="M9,1c-.414,0-.75,.336-.75,.75s.336,.75,.75,.75c3.584,0,6.5,2.916,6.5,6.5s-2.916,6.5-6.5,6.5c-.414,0-.75,.336-.75,.75s.336,.75,.75,.75c4.411,0,8-3.589,8-8S13.411,1,9,1Z" fill="currentColor" />
            <path d="M3.343,13.596c-.293,.293-.293,.768,0,1.061,.293,.293,.768,.293,1.061,0,.293-.293,.293-.768,0-1.061s-.768-.293-1.061,0Z" fill="currentColor" />
            <circle cx="1.75" cy="9" r=".75" fill="currentColor" />
            <path d="M3.343,3.343c-.293,.293-.293,.768,0,1.061s.768,.293,1.061,0,.293-.768,0-1.061c-.293-.293-.768-.293-1.061,0Z" fill="currentColor" />
            <path d="M6.513,15.005c-.383-.158-.821,.023-.98,.406-.159,.383,.023,.821,.406,.98,.383,.158,.821-.023,.98-.406s-.023-.822-.406-.98Z" fill="currentColor" />
            <path d="M2.015,11.082c-.383,.158-.564,.597-.406,.98,.159,.383,.597,.564,.98,.406,.383-.158,.564-.597,.406-.98-.159-.383-.597-.564-.98-.406Z" fill="currentColor" />
            <path d="M2.589,5.533c-.383-.159-.821,.023-.98,.406-.159,.383,.023,.822,.406,.98,.383,.158,.821-.023,.98-.406,.159-.383-.023-.821-.406-.98Z" fill="currentColor" />
            <path d="M6.513,2.995c.383-.158,.564-.597,.406-.98-.159-.383-.597-.564-.98-.406-.383,.159-.564,.597-.406,.98s.597,.564,.98,.406Z" fill="currentColor" />
          </svg>
        </button>
      )}
    </div>
  )
}
