"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, User, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

const suggestions = [
  "5岁布偶猫，肠胃敏感，经常软便，应该选什么猫粮？",
  "如何判断猫粮的蛋白质来源是否优质？",
  "渴望六种鱼和爱肯拿农场盛宴，哪个更适合老年猫？",
  "无谷猫粮真的比有谷猫粮好吗？",
]

interface Message {
  role: "user" | "assistant"
  content: string
}

export function AIChat({ productContext }: { productContext?: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Sparkles className="size-12 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">AI 宠物营养助手</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
            基于社区真实长期反馈数据，为你的宠物提供个性化推荐与分析
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {suggestions.map((s) => (
              <Card
                key={s}
                className="cursor-pointer transition-colors hover:bg-muted/50 max-w-xs"
                onClick={() => sendMessage(s)}
              >
                <CardContent className="p-3 text-sm text-muted-foreground">
                  {s}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Sparkles className="size-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm max-w-[80%]",
                  msg.role === "user"
                    ? "bg-muted"
                    : "bg-primary/5 border border-emerald-500/10"
                )}
              >
                {msg.content || (loading && <Loader2 className="size-4 animate-spin" />)}
              </div>
              {msg.role === "user" && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="size-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>
      )}

      <div className="border-t border-border/40 p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="问我任何关于宠物食品的问题…"
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          基于社区真实数据与 AI 分析 · 仅供参考，不构成医疗建议
        </p>
      </div>
    </div>
  )
}
