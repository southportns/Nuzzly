"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const suggestions = [
"5years oldRagdoll,StomachSensitive,Soft Stool,shouldWhatCat Food？",
"How toCat Food ProteinWhether？",
" and, Senior Cat？",
"grain-freeCat Foodtrue hasCat Foodgood ？",
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
setMessages((prev) => [...prev,
{ role: "assistant", content: `:${err.error?? "pleaseLaterRetry"}` },
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
const text = parsed.choices?.[0]?.delta?.content?? ""
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
setMessages((prev) => [...prev,
{ role: "assistant", content: "failed,please AI Configuration." },
])
}

setLoading(false)
}

return (<div className="flex flex-col h-[calc(100vh-8rem)]">
{messages.length === 0? (<div className="flex-1 flex flex-col items-center justify-center px-4">
<EmojiIcon name="Sparkles" className="size-12 text-primary mb-4" />
<h2 className="text-xl font-semibold mb-2">AI PetNutrition</h2>
<p className="text-sm text-muted-foreground text-center max-w-md mb-8">
based on onCommunitytruelong FeedbackData, for you Pet Recommended and Analysis
</p>
<div className="flex flex-wrap justify-center gap-2 max-w-lg">
{suggestions.map((s) => (<Card
key={s}
className="cursor-pointer transition-colors hover:bg-muted/50 max-w-xs"
onClick={() => sendMessage(s)}
>
<CardContent className="p-3 text-sm text-muted-foreground">
{s}
</CardContent>
</Card>))}
</div>
</div>): (<div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
{messages.map((msg, i) => (<div
key={i}
className={cn("flex gap-3",
msg.role === "user"? "justify-end": "justify-start")}
>
{msg.role === "assistant" && (<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
<EmojiIcon name="Sparkles" className="size-4 text-primary" />
</div>)}
<div
className={cn("rounded-xl px-4 py-2.5 text-sm max-w-[80%]",
msg.role === "user"? "bg-muted": "bg-primary/5 border border-emerald-500/10")}
>
{msg.content || (loading && <EmojiIcon name="Loader2" className="size-4 animate-spin" />)}
</div>
{msg.role === "user" && (<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
<EmojiIcon name="User" className="size-4 text-muted-foreground" />
</div>)}
</div>))}
<div ref={messagesEnd} />
</div>)}

<div className="border-t border-border/40 p-4">
<form
onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
className="flex gap-2"
>
<Input
value={input}
onChange={(e) => setInput(e.target.value)}
placeholder="I AboutPetfood Question…"
className="flex-1"
disabled={loading}
/>
<Button type="submit" size="icon" disabled={loading ||!input.trim()}>
{loading? <EmojiIcon name="Loader2" className="size-4 animate-spin" />: <EmojiIcon name="Send" className="size-4" />}
</Button>
</form>
<p className="mt-2 text-xs text-muted-foreground text-center">
based on onCommunitytrueData and AI Analysis · reference,not Advice
</p>
</div>
</div>)
}
