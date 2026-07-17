"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface Mascot3DProps {
  size?: "small" | "medium" | "large"
  mood?: "idle" | "happy" | "thinking" | "welcome"
  className?: string
}

export function Mascot3D({ size = "large", mood = "welcome", className }: Mascot3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (customElements.get("model-viewer")) {
      setScriptReady(true)
      return
    }
    const existing = document.querySelector('script[src*="model-viewer"]')
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true))
      return
    }
    const script = document.createElement("script")
    script.type = "module"
    script.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
    script.onload = () => setScriptReady(true)
    document.head.appendChild(script)
  }, [])

  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-32 h-32",
    large: "w-64 h-64 md:w-80 md:h-80",
  }

  const orbitMap: Record<string, string> = {
    idle: "0deg 75deg 1.5m",
    happy: "0deg 65deg 1.4m",
    thinking: "15deg 70deg 1.5m",
    welcome: "0deg 70deg 1.5m",
  }

  // Create model-viewer element after script is ready
  useEffect(() => {
    if (!scriptReady || !containerRef.current || modelRef.current) return

    const mv = document.createElement("model-viewer") as any
    mv.setAttribute("src", "/qiuqiu.glb")
    mv.setAttribute("alt", "毛球镇镇长球球")
    mv.setAttribute("interaction-prompt", "none")
    mv.setAttribute("camera-orbit", orbitMap[mood])
    mv.setAttribute("field-of-view", "35deg")
    mv.setAttribute("shadow-intensity", "0.3")
    mv.setAttribute("shadow-softness", "1")
    mv.setAttribute("exposure", "1.1")
    mv.setAttribute("disable-zoom", "")
    mv.setAttribute("loading", "eager")
    mv.setAttribute("reveal", "auto")
    mv.style.touchAction = "pan-y"
    mv.style.width = "100%"
    mv.style.height = "100%"
    mv.style.opacity = "0"
    mv.style.transition = "opacity 700ms"

    mv.addEventListener("load", () => {
      setTimeout(() => {
        mv.style.opacity = "1"
        setLoaded(true)
      }, 100)
    })

    containerRef.current.appendChild(mv)
    modelRef.current = mv
  }, [scriptReady, size, mood])

  // Update attributes when props change
  useEffect(() => {
    const mv = modelRef.current as any
    if (!mv) return
    mv.setAttribute("camera-orbit", orbitMap[mood])
  }, [mood])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelRef.current && modelRef.current.parentNode) {
        modelRef.current.parentNode.removeChild(modelRef.current)
        modelRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      {/* Soft glow behind mascot */}
      <div
        className={cn(
          "absolute rounded-full bg-gradient-to-br from-[#FFB89A]/30 via-[#FFD4C4]/20 to-transparent blur-2xl",
          size === "large" ? "w-56 h-56 md:w-72 md:h-72" : size === "medium" ? "w-28 h-28" : "w-14 h-14"
        )}
        style={{ animation: "mascot-pulse 3s ease-in-out infinite" }}
      />

      {/* Shadow on ground */}
      <div
        className={cn(
          "absolute bottom-0 rounded-full bg-[#8B5E46]/10 blur-md",
          size === "large" ? "w-32 h-6 md:w-40 md:h-8" : size === "medium" ? "w-16 h-3" : "w-8 h-2"
        )}
        style={{ animation: "mascot-shadow 3s ease-in-out infinite" }}
      />

      {/* 3D model is mounted dynamically via useEffect into containerRef */}

      {/* Loading placeholder */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#FFB89A]/30 animate-pulse" />
        </div>
      )}

      <style>{`
        @keyframes mascot-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes mascot-shadow {
          0%, 100% { transform: scaleX(1); opacity: 0.6; }
          50% { transform: scaleX(0.9); opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
