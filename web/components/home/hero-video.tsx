"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export function HeroVideo({ petCount = 0 }: { petCount?: number }) {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasEnded, setHasEnded] = useState(false)
  const [videoError, setVideoError] = useState(false)
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

  const handleVideoError = useCallback(() => {
    setVideoError(true)
  }, [])

  return (
    <div className="relative aspect-[2.5/1] w-full">
      <video
        ref={videoRef}
        src="/nuzzly-town.mp4"
        poster="/hero-background.png"
        autoPlay
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        onEnded={() => setHasEnded(true)}
        onError={handleVideoError}
      />
      {/* Fallback: show poster image if video fails to load */}
      {videoError && (
        <img
          src="/hero-background.png"
          alt="Nuzzly town"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

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
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#FFB59E] flex-shrink-0 mt-0.5">
            <path d="M2 10L5 6L8 8L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[12px] text-white/80 leading-none">累计追踪</span>
          <span className="text-[14px] font-semibold text-white leading-none">{displayCount.toLocaleString()}+</span>
          <span className="text-[12px] text-white/80 leading-none">只猫咪</span>
        </div>
      </div>

      {/* Replay button - shown after video ends */}
      {hasEnded && (
        <button
          onClick={handleReplay}
          className="absolute bottom-6 right-6 z-20 flex size-12 items-center justify-center rounded-full bg-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
        >
          <Play className="size-5 fill-[#8B5E46] text-[#8B5E46] ml-0.5" />
        </button>
      )}
    </div>
  )
}
