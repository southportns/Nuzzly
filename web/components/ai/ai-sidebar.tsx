"use client"

import { cn } from "@/lib/utils"
import { MessageSquare, Sparkles, FlaskConical, GitCompareArrows } from "lucide-react"

export type AIMode = "chat" | "recommend" | "ingredients" | "compare"

interface AISidebarProps {
  activeMode: AIMode
  onModeChange: (mode: AIMode) => void
}

const navItems: { id: AIMode; label: string; icon: typeof MessageSquare; description: string }[] = [
  { id: "chat", label: "自由对话", icon: MessageSquare, description: "和球球聊天" },
  { id: "recommend", label: "智能推荐", icon: Sparkles, description: "精准匹配产品" },
  { id: "ingredients", label: "成分分析", icon: FlaskConical, description: "解读成分表" },
  { id: "compare", label: "产品对比", icon: GitCompareArrows, description: "多维度对比" },
]

export function AISidebar({ activeMode, onModeChange }: AISidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col h-full border-r border-[rgba(0,0,0,0.05)] bg-white/60 backdrop-blur-xl rounded-l-3xl overflow-hidden">
      {/* Brand Header */}
      <div className="flex flex-col items-center px-5 pt-6 pb-4">
        <h1 className="text-[17px] font-bold tracking-tight text-[#111111]">
          毛球镇镇长
        </h1>
        <p className="text-[11px] text-[#6B6B6B] tracking-wide">球球 · 智能宠物顾问</p>

        {/* Status indicator */}
        <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#A8C5A0]/15 px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A8C5A0] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#A8C5A0]" />
          </span>
          <span className="text-[10px] font-medium text-[#5A8A52]">在线 · 随时为你服务</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[rgba(0,0,0,0.06)] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col px-0 py-3 overflow-y-auto">
        <p className="px-5 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A0A09E]">
          AI 功能
        </p>
        <div className="flex-1 flex flex-col justify-evenly px-3">
          {navItems.map((item) => {
            const isActive = activeMode === item.id
            return (
              <button
                key={item.id}
                onClick={() => onModeChange(item.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-[#FFB89A]/18 to-[#FF7A59]/10 text-[#111111] shadow-[inset_0_0_0_1px_rgba(255,122,89,0.15)]"
                    : "text-[#555555] hover:bg-[#F7F6F3] hover:text-[#111111]"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-[#FFB89A] to-[#FF7A59]" />
                )}
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-gradient-to-br from-[#FFB89A] to-[#FF7A59] text-white shadow-[0_2px_8px_rgba(255,122,89,0.25)]"
                      : "bg-[#F0EFED] text-[#6B6B6B] group-hover:bg-[#E5E4E2]"
                  )}
                >
                  <item.icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold leading-tight">{item.label}</div>
                  <div className={cn(
                    "text-[10.5px] leading-tight mt-0.5 transition-colors",
                    isActive ? "text-[#8B5E46]" : "text-[#A0A09E] group-hover:text-[#6B6B6B]"
                  )}>
                    {item.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer card - pushed to bottom */}
      <div className="mt-auto p-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#FFF3F0] to-[#FFE4D9] pt-2 pr-3.5 pb-2.5 pl-5">
          <div className="flex items-center gap-2">
            <div className="relative size-5 shrink-0">
              {/* Shadow */}
              <div className="absolute inset-0 translate-y-[2px] scale-90 rounded-full bg-[#FF7A59]/20 blur-[3px]" />
              {/* Sphere */}
              <svg viewBox="0 0 28 28" className="relative size-5 drop-shadow-[0_1px_3px_rgba(255,122,89,0.35)]">
                <defs>
                  <radialGradient id="orb-gradient" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#FFB89A" />
                    <stop offset="45%" stopColor="#FF7A59" />
                    <stop offset="100%" stopColor="#E85D4A" />
                  </radialGradient>
                  <radialGradient id="orb-highlight" cx="30%" cy="25%" r="40%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="orb-border" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#E85D4A" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                {/* Border ring */}
                <circle cx="14" cy="14" r="13" fill="url(#orb-border)" />
                {/* Main sphere */}
                <circle cx="14" cy="14" r="12" fill="url(#orb-gradient)" />
                {/* Highlight reflection */}
                <circle cx="14" cy="14" r="12" fill="url(#orb-highlight)" />
                {/* Subtle rim light */}
                <circle cx="14" cy="14" r="11.5" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8B5E46]">球球小贴士</p>
              <p className="text-[10px] text-[#A67D65] leading-tight mt-0.5">
                推荐基于社区真实反馈数据
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
