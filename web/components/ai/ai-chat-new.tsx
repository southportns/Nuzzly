"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, Sparkles, User, PawPrint, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Mascot3D } from "./mascot-3d"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { rehypeFluentEmoji } from "@/lib/rehype-fluent-emoji"

// rehype-sanitize 自定义 schema：在默认白名单基础上保留 Fluent Emoji 渲染所需的 img 标签属性
// 默认 schema 已禁用 script/iframe/style/raw HTML，可有效防止 AI 输出 XSS
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "width", "height", "loading", "className", "class"],
  },
  // 显式禁用所有 javascript: 协议（默认 schema 已禁，这里强化）
  protocols: {
    ...defaultSchema.protocols,
    src: ["http", "https"],
    href: ["http", "https", "mailto", "tel"],
  },
}

// Markdown 渲染样式：让 AI 回复的标题、列表、加粗等格式清晰呈现
const markdownComponents: import("react-markdown").Components = {
  h1: ({ children }) => (
    <h1 className="text-[16px] font-bold text-[#111111] mt-4 mb-2 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-bold text-[#111111] mt-3.5 mb-2 leading-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold text-[#111111] mt-3 mb-1.5 leading-tight">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2.5 last:mb-0 leading-[1.7]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2.5 pl-4 space-y-1 list-disc marker:text-[#FF7A59]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2.5 pl-4 space-y-1 list-decimal marker:text-[#6B6B6B]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.65]">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#111111]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="not-italic font-medium text-[#FF7A59]">{children}</em>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#FF7A59] underline">
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-[rgba(0,0,0,0.06)]" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#FF7A59] pl-3 py-0.5 my-2 text-[#6B6B6B]">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-[#F0EFED] rounded px-1 py-0.5 text-[12px] text-[#333333]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-[#F0EFED] rounded-xl p-3 overflow-x-auto text-[12px] my-2">{children}</pre>
  ),
}

// Logo avatar for assistant messages
function AssistantAvatar() {
  return (
    <img
      src="/logo.png"
      alt="球球"
      className="size-8 shrink-0 rounded-full object-cover shadow-[0_2px_8px_rgba(255,122,89,0.2)]"
    />
  )
}

const welcomeSuggestions = [
  { text: "5岁布偶猫肠胃敏感，应该选什么猫粮？", icon: PawPrint },
  { text: "如何判断猫粮的蛋白质来源是否优质？", icon: Sparkles },
  { text: "渴望六种鱼和爱肯拿农场盛宴哪个好？", icon: Sparkles },
  { text: "无谷猫粮真的比有谷猫粮好吗？", icon: Sparkles },
]

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export function AIChatNew({ productContext }: { productContext?: string }) {
  console.log("[AIChatNew] rendered")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyItems, setHistoryItems] = useState<Array<{
    id: string
    user_message: string
    ai_response: string
    created_at: string
  }>>([])

  // Fetch user avatar on mount
  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    supabase
      .from("public_profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setUserAvatar((data as { avatar_url?: string | null } | null)?.avatar_url ?? null)
      })
  }, [user?.id])

  // Fetch chat history
  async function loadHistory() {
    if (!user?.id) return
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/ai/chat/history", {
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (res.ok) {
        setHistoryItems(data.sessions ?? [])
      }
    } catch {}
    setHistoryLoading(false)
  }

  function openHistory() {
    setHistoryOpen(true)
    loadHistory()
  }

  function loadHistoryItem(item: { user_message: string; ai_response: string }) {
    setMessages([
      { role: "user", content: item.user_message },
      { role: "assistant", content: item.ai_response },
    ])
    setHistoryOpen(false)
  }

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const newMessages = [...messages, { role: "user" as const, content }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          productContext,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `出错了：${err.error ?? "请稍后重试"}` },
        ])
        setLoading(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""

      setMessages((prev) => [...prev, { role: "assistant", content: "" }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n").filter((line) => line.startsWith("data: "))

          for (const line of lines) {
            const data = line.replace("data: ", "")
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              const text = parsed.choices?.[0]?.delta?.content ?? ""
              assistantContent += text
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                }
                return updated
              })
            } catch {
              // Partial chunk, skip
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "连接失败，请检查 AI 服务配置。" },
      ])
    }

    setLoading(false)
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full relative">
      {/* History button - top right */}
      <button
        onClick={openHistory}
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white/80 backdrop-blur-sm px-3 py-2 text-[12px] font-medium text-[#6B6B6B] transition-all hover:border-[#FFB89A]/40 hover:bg-white hover:text-[#FF7A59]"
      >
        <Clock className="size-3.5" />
        历史记录
      </button>

      {/* History panel */}
      {historyOpen && (
        <div className="absolute inset-0 z-20 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"
            onClick={() => setHistoryOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-[−8px_0_30px_rgba(0,0,0,0.08)] rounded-l-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-[#FF7A59]" />
                <span className="text-[14px] font-semibold text-[#111111]">历史记录</span>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F0EFED] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-[#FF7A59]" />
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Clock className="size-8 text-[#D2D1CF] mb-2" />
                  <p className="text-[13px] text-[#A0A09E]">暂无历史记录</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {historyItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left rounded-xl px-3 py-3 transition-all hover:bg-[#F7F6F3] group"
                    >
                      <p className="text-[12px] font-medium text-[#111111] truncate group-hover:text-[#FF7A59]">
                        {item.user_message}
                      </p>
                      <p className="text-[11px] text-[#A0A09E] mt-1 line-clamp-2">
                        {item.ai_response.slice(0, 80)}...
                      </p>
                      <p className="text-[10px] text-[#D2D1CF] mt-1">
                        {new Date(item.created_at).toLocaleString("zh-CN")}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasMessages ? (
        /* Welcome State */
        <div className="flex flex-1 flex-col items-center justify-center px-6 md:px-12 overflow-y-auto">
          <Mascot3D size="large" mood="welcome" className="mb-2" />
          <h2 className="mt-2 text-[22px] font-bold text-[#111111] tracking-tight">
            你好，我是毛球镇镇长球球
          </h2>
          <p className="mt-1.5 text-[14px] text-[#6B6B6B] text-center max-w-md leading-relaxed">
            基于社区真实长期反馈数据，为你的宠物提供个性化产品推荐与营养分析
          </p>

          {/* Suggestion chips */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
            {welcomeSuggestions.map((s, i) => (
              <button
                key={s.text}
                onClick={() => sendMessage(s.text)}
                className="group flex items-start gap-2.5 rounded-2xl border border-[rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-sm px-4 py-3 text-left transition-all duration-200 hover:border-[#FFB89A]/40 hover:bg-white hover:shadow-[0_4px_16px_rgba(255,122,89,0.08)] hover:-translate-y-0.5"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FFB89A]/20 to-[#FF7A59]/10 mt-0.5 transition-colors group-hover:from-[#FFB89A]/30 group-hover:to-[#FF7A59]/20">
                  <s.icon className="size-3.5 text-[#FF7A59]" />
                </div>
                <span className="text-[13px] leading-relaxed text-[#444444] group-hover:text-[#111111] whitespace-nowrap overflow-hidden text-ellipsis">
                  {s.text}
                </span>
              </button>
            ))}
          </div>

          {/* Quick feature hints */}
          <div className="mt-6 flex items-center gap-4 text-[11px] text-[#A0A09E]">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-[#FF7A59]" />
              智能推荐
            </span>
            <span className="w-1 h-1 rounded-full bg-[#D2D1CF]" />
            <span className="flex items-center gap-1">
              <PawPrint className="size-3 text-[#A8C5A0]" />
              成分分析
            </span>
            <span className="w-1 h-1 rounded-full bg-[#D2D1CF]" />
            <span>产品对比</span>
          </div>
        </div>
      ) : (
        /* Chat Messages */
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-12">
          <div className="mx-auto max-w-4xl space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end pr-5" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <AssistantAvatar />
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-[14px] leading-[1.7] max-w-[80%] shadow-sm",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[#FFB89A] to-[#FF7A59] text-white rounded-tr-md"
                      : "bg-white border border-[rgba(0,0,0,0.05)] text-[#333333] rounded-tl-md"
                  )}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <ReactMarkdown
                        components={markdownComponents}
                        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeFluentEmoji]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : loading ? (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <span className="size-1.5 rounded-full bg-[#FFB89A] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="size-1.5 rounded-full bg-[#FFB89A] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="size-1.5 rounded-full bg-[#FFB89A] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : null
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
                {msg.role === "user" && (
                  <img
                    src={userAvatar || "/zdytoux.png"}
                    alt="我"
                    className="size-8 shrink-0 rounded-full object-cover bg-[#F0EFED]"
                  />
                )}
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t border-[rgba(0,0,0,0.04)] bg-white/40 backdrop-blur-sm px-6 py-4 md:px-12">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="mx-auto max-w-4xl"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-2.5 transition-all focus-within:border-[#FFB89A]/50 focus-within:shadow-[0_4px_20px_rgba(255,122,89,0.1)]">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问我任何关于宠物食品的问题…"
              className="flex-1 border-0 bg-transparent shadow-none text-[14px] focus-visible:ring-0 px-0 py-0 placeholder:text-[#B0B0AE]"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className={cn(
                "size-9 shrink-0 rounded-xl transition-all",
                input.trim()
                  ? "bg-gradient-to-br from-[#FFB89A] to-[#FF7A59] hover:from-[#FFA885] hover:to-[#E86A4A] shadow-[0_2px_8px_rgba(255,122,89,0.25)]"
                  : "bg-[#F0EFED] text-[#B0B0AE] hover:bg-[#E5E4E2]"
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
          <p className="mt-2.5 text-center text-[10.5px] text-[#B0B0AE]">
            基于社区真实数据与 AI 分析 · 仅供参考，不构成医疗建议
          </p>
        </form>
      </div>
    </div>
  )
}
