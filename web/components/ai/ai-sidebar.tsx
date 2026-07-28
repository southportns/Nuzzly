"use client"

import { emojiIcon } from "@/components/ui/emoji-icon"
import { FluentEmoji } from "@/components/ui/fluent-emoji"
import { cn } from "@/lib/utils"

export type AIMode = "chat" | "recommend" | "ingredients" | "compare"

interface AISidebarProps {
  activeMode: AIMode
  onModeChange: (mode: AIMode) => void
}

const navItems: { id: AIMode; label: string; icon: ReturnType<typeof emojiIcon>; description: string }[] = [
  { id: "chat", label: "自由对话", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path d="M9,1.75C4.996,1.75,1.75,4.996,1.75,9c0,1.319,.358,2.552,.973,3.617,.43,.806-.053,2.712-.973,3.633,1.25,.068,2.897-.497,3.633-.973,.489,.282,1.264,.656,2.279,.848,.433,.082,.881,.125,1.338,.125,4.004,0,7.25-3.246,7.25-7.25S13.004,1.75,9,1.75Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M9,10c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z" fill="currentColor" opacity=".75" data-color="color-2" />
      <path d="M5.5,10c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z" fill="currentColor" data-color="color-2" />
      <path d="M12.5,10c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z" fill="currentColor" opacity=".5" data-color="color-2" />
    </svg>
  ), description: "和球球聊天" },
  { id: "recommend", label: "智能推荐", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="1.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="m10.5025,16.0509c-.4686.2906-.9744.4491-1.5025.4491-2.428,0-4.397-3.358-4.397-7.5S6.572,1.5,9,1.5s4.397,3.358,4.397,7.5c0,1.384-.22,2.681-.603,3.793" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="m8.5735,4.6109c.1413-.0046.2836-.0069.4265-.0069,4.142,0,7.5,1.968,7.5,4.397s-3.358,4.397-7.5,4.397-7.5-1.97-7.5-4.398c0-1.617,1.489-3.03,3.707-3.794" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  ), description: "精准匹配产品" },
  { id: "ingredients", label: "成分分析", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)">
        <path d="M8.5 12.75L10.75 15L8.5 17.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M4.655 4.505C3.4774 5.6413 2.75 7.2359 2.75 9C2.75 12.452 5.55 15.25 9 15.25C9.6 15.25 10.17 15.166 10.72 15.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M9.5 5.25L7.25 3L9.5 0.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" data-color="color-2" fill="none" />
        <path d="M13.3444 13.4937C14.5146 12.3575 15.25 10.7634 15.25 9C15.25 5.548 12.45 2.75 9.00002 2.75C8.42002 2.75 7.86002 2.82895 7.33002 2.97595" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" data-color="color-2" fill="none" />
      </g>
    </svg>
  ), description: "解读成分表" },
  { id: "compare", label: "产品对比", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="3.75" cy="5.25" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <circle cx="3.75" cy="12.75" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="8.75" y1="5.25" x2="16.25" y2="5.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <line x1="8.75" y1="12.75" x2="16.25" y2="12.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  ), description: "多维度对比" },
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
              <FluentEmoji
                name="orange circle"
                size={20}
                className="relative size-5 drop-shadow-[0_1px_3px_rgba(255,122,89,0.35)]"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8B5E46]">球球小贴士</p>
              <p className="text-[10px] text-[#A67D65] leading-tight mt-0.5">
                AI 基于社区真实反馈数据及大数据综合智能分析，仅作为参考建议，不构成医疗诊断或专业兽医意见。
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
