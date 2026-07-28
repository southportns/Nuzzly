"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface NuzzlyLogoProps {
  className?: string
  mobile?: boolean
}

export function NuzzlyLogo({ className = "", mobile = false }: NuzzlyLogoProps) {
  return (
    <div className={cn("nuzzly-logo-root inline-flex items-center", className)}>
      {/* 左侧：圆+动物（hover时旋转） */}
      <div className="nuzzly-circle-wrap flex-shrink-0">
        <Image
          src="/Vector.svg"
          alt="Nuzzly毛球镇"
          width={128}
          height={127}
          className={cn("h-auto", mobile ? "w-12" : "w-20")}
          style={{ transformOrigin: "49.8% 50%" }}
          priority
        />
      </div>
      {/* 右侧：文字（静态） */}
      <Image
        src="/Vector2.svg"
        alt="Nuzzly毛球镇"
        width={172}
        height={85}
        className={cn("h-auto scale-[0.92]", mobile ? "w-auto h-8" : "w-auto h-14")}
        priority
      />
      <style>{`
        .nuzzly-logo-root:hover .nuzzly-circle-wrap {
          animation: nuzzly-spin 0.7s ease-in-out;
        }
        @keyframes nuzzly-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
