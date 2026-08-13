"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Mascot3D } from "./mascot-3d"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import ReactMarkdown from "react-markdown"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { rehypeFluentEmoji } from "@/lib/rehype-fluent-emoji"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"

// ── Static config (module-level, created once) ───────────────────────────────

const sanitizeSchema = {...defaultSchema,
attributes: {...defaultSchema.attributes,
img: ["src", "alt", "width", "height", "loading", "className", "class"],
},
protocols: {...defaultSchema.protocols,
src: ["http", "https"],
href: ["http", "https", "mailto", "tel"],
},
}

const markdownComponents: import("react-markdown").Components = {
h1: ({ children }) => (<h1 className="text-[16px] font-bold text-[#111111] mt-4 mb-2 leading-tight">{children}</h1>),
h2: ({ children }) => (<h2 className="text-[15px] font-bold text-[#111111] mt-3.5 mb-2 leading-tight">{children}</h2>),
h3: ({ children }) => (<h3 className="text-[14px] font-semibold text-[#111111] mt-3 mb-1.5 leading-tight">{children}</h3>),
p: ({ children }) => (<p className="mb-2.5 last:mb-0 leading-[1.7]">{children}</p>),
ul: ({ children }) => (<ul className="mb-2.5 pl-4 space-y-1 list-disc marker:text-[#FF7A59]">{children}</ul>),
ol: ({ children }) => (<ol className="mb-2.5 pl-4 space-y-1 list-decimal marker:text-[#6B6B6B]">{children}</ol>),
li: ({ children }) => (<li className="leading-[1.65]">{children}</li>),
strong: ({ children }) => (<strong className="font-semibold text-[#111111]">{children}</strong>),
em: ({ children }) => (<em className="not-italic font-medium text-[#FF7A59]">{children}</em>),
a: ({ children, href }) => (<a href={href} target="_blank" rel="noopener noreferrer" className="text-[#FF7A59] underline">
{children}
</a>),
hr: () => <hr className="my-3 border-[rgba(0,0,0,0.06)]" />,
blockquote: ({ children }) => (<blockquote className="border-l-2 border-[#FF7A59] pl-3 py-0.5 my-2 text-[#6B6B6B]">
{children}
</blockquote>),
code: ({ children }) => (<code className="bg-[#F0EFED] rounded px-1 py-0.5 text-[12px] text-[#333333]">{children}</code>),
pre: ({ children }) => (<pre className="bg-[#F0EFED] rounded-xl p-3 overflow-x-auto text-[12px] my-2">{children}</pre>),
img: ({ src, alt, width, height, className }) => {
const rawClass = className as string | string[] | undefined
const resolvedClass =
typeof rawClass === "string"? rawClass: Array.isArray(rawClass)? rawClass.join(" "): ""
return (<img
src={src}
alt={alt?? ""}
width={width?? 16}
height={height?? 16}
loading="lazy"
className={resolvedClass || "inline-block size-4 object-contain align-text-bottom mx-0.5"}
onError={(e) => {
const target = e.target as HTMLImageElement
target.style.display = "none"
}}
/>)
},
}

// Stable rehypePlugins reference (created once)
const rehypePlugins = [[rehypeSanitize, sanitizeSchema], rehypeFluentEmoji] as const

// ── Static sub-components ────────────────────────────────────────────────────

const AssistantAvatar = memo(function AssistantAvatar() {
return (<img
src="/logo.png"
alt="Pomi"
className="size-8 shrink-0 rounded-full object-cover shadow-[0_2px_8px_rgba(255,122,89,0.2)]"
/>)
})

const ThinkingIndicator = memo(function ThinkingIndicator({ text }: { text: string }) {
return (<div className="flex items-center gap-2 py-0.5 text-[#A0A09E]">
<EmojiIcon name="PawPrint" className="size-4 text-[#FF7A59] animate-bounce" />
<span className="text-[13px]">{text}</span>
<span className="flex gap-0.5">
<span className="size-1 rounded-full bg-[#FFB89A] animate-bounce" style={{ animationDelay: "0ms" }} />
<span className="size-1 rounded-full bg-[#FFB89A] animate-bounce" style={{ animationDelay: "150ms" }} />
<span className="size-1 rounded-full bg-[#FFB89A] animate-bounce" style={{ animationDelay: "300ms" }} />
</span>
</div>)
})

// ── Tool action card ──────────────────────────────────────────────────────

interface ToolAction {
tool_name: string
status: "loading" | "success" | "error"
message?: string
}

const TOOL_LABEL_KEYS: Record<string, string> = {
create_pet: "createPetProfile",
update_pet: "updatePetInfo",
record_weight: "recordWeight",
record_diet: "recordDiet",
record_vaccination: "recordVaccine",
record_disease: "recordDisease",
record_medication: "recordMedication",
record_allergy: "recordAllergy",
record_symptom: "recordSymptom",
record_checkup: "recordCheckup",
}

const ToolActionCard = memo(function ToolActionCard({ action, label, runningText }: { action: ToolAction; label: string; runningText: string }) {
const isSuccess = action.status === "success"
const isError = action.status === "error"
const isLoading = action.status === "loading"

return (<div
className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-2 border transition-all",
isSuccess && "bg-[#F0FDF4] border-[#86EFAC]/40",
isError && "bg-[#FEF2F2] border-[#FCA5A5]/40",
isLoading && "bg-[#FFF7ED] border-[#FDBA74]/40",)}
>
<div className="shrink-0">
{isLoading? (<EmojiIcon name="Loader2" className="size-4 animate-spin text-[#FF7A59]" />): isSuccess? (<FluentEmoji src={FLUENT_EMOJI.checkMark} size={16} className="shrink-0" />): (<FluentEmoji src={FLUENT_EMOJI.x} size={16} className="shrink-0" />)}
</div>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-1.5">
<span className="text-[12px] font-medium text-[#111111]">{label}</span>
{isLoading && <span className="text-[11px] text-[#A0A09E]">{runningText}</span>}
</div>
{action.message && (<p className={cn("text-[11px] mt-0.5 truncate",
isSuccess? "text-[#16A34A]": isError? "text-[#DC2626]": "text-[#6B6B6B]")}>
{action.message}
</p>)}
</div>
</div>)
})

// ── Individual message item (memoized – skips re-render if content unchanged) ─

interface ChatMessageItemProps {
role: "user" | "assistant"
content: string
isLoading: boolean
userAvatar: string | null
toolActions?: ToolAction[]
toolLabels?: Record<string, string>
toolRunningText?: string
thinkingText?: string
}

const ChatMessageItem = memo(function ChatMessageItem({ role, content, isLoading, userAvatar, toolActions, toolLabels, toolRunningText, thinkingText }: ChatMessageItemProps) {
const hasToolActions = toolActions && toolActions.length > 0
return (<div
className={cn("flex gap-3",
role === "user"? "justify-end pr-5": "justify-start")}
>
{role === "assistant" && <AssistantAvatar />}
<div
className={cn("rounded-2xl px-4 py-3 text-[14px] leading-[1.7] max-w-[80%] shadow-sm",
role === "user"? "bg-gradient-to-br from-[#FFB89A] to-[#FF7A59] text-white rounded-tr-md": "bg-white border border-[rgba(0,0,0,0.05)] text-[#333333] rounded-tl-md")}
>
{role === "assistant"? (<>
{hasToolActions && (<div className="mb-1">
{toolActions!.map((ta, i) => (<ToolActionCard key={`${ta.tool_name}-${i}`} action={ta} label={toolLabels?.[ta.tool_name] ?? ta.tool_name} runningText={toolRunningText ?? ""} />))}
</div>)}
{content? (<ReactMarkdown
components={markdownComponents}
rehypePlugins={rehypePlugins as any}
>
{content}
</ReactMarkdown>):!hasToolActions && isLoading? (<ThinkingIndicator text={thinkingText ?? ""} />): null}
</>): (<span className="whitespace-pre-wrap">{content}</span>)}
</div>
{role === "user" && (<img
src={userAvatar || "/zdytoux.png"}
alt="Me"
className="size-8 shrink-0 rounded-full object-cover bg-[#F0EFED]"
/>)}
</div>)
})

// ── Constants ────────────────────────────────────────────────────────────────

const WELCOME_SUGGESTION_KEYS = [
"welcomeSuggestion1",
"welcomeSuggestion2",
"welcomeSuggestion3",
"welcomeSuggestion4",
] as const

interface ChatMessage {
role: "user" | "assistant"
content: string
toolActions?: ToolAction[]
}

export interface AIChatNewRef {
openHistory: () => void
newChat: () => void
}

// ── Main component ───────────────────────────────────────────────────────────

export const AIChatNew = forwardRef<AIChatNewRef, { productContext?: string }>(function AIChatNew({ productContext }, ref) {
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
const t = useTranslations("AI")
const locale = useLocale() as string
const dateLocale = locale === "zh" ? "zh-CN" : "en-US"

// Build tool label map from translation keys
const toolLabels: Record<string, string> = {}
Object.entries(TOOL_LABEL_KEYS).forEach(([key, labelKey]) => {
toolLabels[key] = t(labelKey as any)
})
const toolRunningText = t("toolRunning")
const thinkingText = t("pomiThinking")

// Fetch user avatar on mount
useEffect(() => {
if (!user?.id) return
const supabase = createClient()
supabase.from("public_profiles").select("avatar_url").eq("id", user.id).single().then(({ data }) => {
setUserAvatar((data as { avatar_url?: string | null } | null)?.avatar_url?? null)
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
setHistoryItems(data.sessions?? [])
}
} catch {}
setHistoryLoading(false)
}

function openHistory() {
setHistoryOpen(true)
loadHistory()
}

function newChat() {
setMessages([])
setInput("")
setLoading(false)
setHistoryOpen(false)
}

useImperativeHandle(ref, () => ({
openHistory,
newChat,
}))

function loadHistoryItem(item: { user_message: string; ai_response: string }) {
setMessages([
{ role: "user", content: item.user_message },
{ role: "assistant", content: item.ai_response },
])
setHistoryOpen(false)
}

async function deleteHistoryItem(id: string) {
try {
const res = await fetch("/api/ai/chat/history", {
method: "DELETE",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ id }),
})
if (res.ok) {
setHistoryItems((prev) => prev.filter((item) => item.id!== id))
}
} catch {}
}

useEffect(() => {
messagesEnd.current?.scrollIntoView({ behavior: "smooth" })
}, [messages])

const sendMessage = useCallback(async (content: string) => {
if (!content.trim() || loading) return

const newMessages = [...messages, { role: "user" as const, content }]
setMessages(newMessages)
setInput("")
setLoading(true)

setMessages((prev) => [...prev, { role: "assistant", content: "", toolActions: [] }])

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
setMessages((prev) => {
const updated = [...prev]
updated[updated.length - 1] = {
role: "assistant",
content: `Error: ${err.error?? t("errorRetryLater")}`,
}
return updated
})
setLoading(false)
return
}

const reader = response.body?.getReader()
const decoder = new TextDecoder()
let assistantContent = ""
let toolActions: ToolAction[] = []
let currentEventType: string | null = null

if (reader) {
while (true) {
const { done, value } = await reader.read()
if (done) break

const chunk = decoder.decode(value)
const lines = chunk.split("\n")

for (const line of lines) {
// Track SSE event type
if (line.startsWith("event: ")) {
currentEventType = line.slice(7).trim()
continue
}

if (!line.startsWith("data: ")) continue
const data = line.replace("data: ", "")
if (data === "[DONE]") continue

try {
const parsed = JSON.parse(data)

// Handle custom tool events
if (currentEventType === "tool_start") {
const toolName = parsed.tool_name?? "unknown"
toolActions = [...toolActions, { tool_name: toolName, status: "loading" }]
setMessages((prev) => {
const updated = [...prev]
updated[updated.length - 1] = {
role: "assistant",
content: assistantContent,
toolActions: [...toolActions],
}
return updated
})
currentEventType = null
continue
}

if (currentEventType === "tool_result") {
const toolName = parsed.tool_name?? "unknown"
const isSuccess = parsed.success!== false
toolActions = toolActions.map((ta) =>
ta.tool_name === toolName && ta.status === "loading"? {...ta, status: isSuccess? "success": "error", message: parsed.message }: ta)
setMessages((prev) => {
const updated = [...prev]
updated[updated.length - 1] = {
role: "assistant",
content: assistantContent,
toolActions: [...toolActions],
}
return updated
})
currentEventType = null
continue
}

// Regular content stream
const text = parsed.choices?.[0]?.delta?.content?? ""
if (text) {
assistantContent += text
setMessages((prev) => {
const updated = [...prev]
updated[updated.length - 1] = {
role: "assistant",
content: assistantContent,
toolActions: toolActions.length > 0? [...toolActions]: undefined,
}
return updated
})
}
} catch {
// Partial chunk, skip
}
// Reset event type after processing data line (unless it was already reset)
if (currentEventType!== null) {
currentEventType = null
}
}
}
}
} catch {
setMessages((prev) => {
const updated = [...prev]
updated[updated.length - 1] = {
role: "assistant",
content: t("connectionFailed"),
}
return updated
})
}

setLoading(false)
}, [messages, loading, productContext])

const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
setInput(e.target.value)
}, [])

const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
if (e.key === "Enter" &&!e.shiftKey) {
e.preventDefault()
sendMessage(input)
}
}, [sendMessage, input])

const handleFormSubmit = useCallback((e: React.FormEvent) => {
e.preventDefault()
sendMessage(input)
}, [sendMessage, input])

const hasMessages = messages.length > 0

// Memoize message list to avoid re-processing markdown on unrelated state changes
const messageList = useMemo(() => {
if (!hasMessages) return null
return messages.map((msg, i) => (<ChatMessageItem
key={`${msg.role}-${i}`}
role={msg.role}
content={msg.content}
isLoading={loading}
userAvatar={userAvatar}
toolActions={msg.toolActions}
toolLabels={toolLabels}
toolRunningText={toolRunningText}
thinkingText={thinkingText}
/>))
}, [messages, loading, userAvatar, hasMessages])

return (<div className="flex flex-col h-full relative">
{/* History panel */}
{historyOpen && (<div className="absolute inset-0 z-20 flex">
<div
className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"
onClick={() => setHistoryOpen(false)}
/>
<div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-[−8px_0_30px_rgba(0,0,0,0.08)] rounded-l-2xl flex flex-col overflow-hidden">
<div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] px-4 py-3">
<div className="flex items-center gap-2">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-[#FF7A59]">
<path d="M9,1c-2.488,0-4.774,1.157-6.268,3.048l-.117-.846c-.058-.41-.442-.696-.846-.64-.411,.057-.697,.436-.641,.846l.408,2.945c.053,.375,.374,.647,.742,.647,.034,0,.069-.002,.104-.007l2.944-.407c.41-.057,.697-.436,.641-.846-.057-.411-.443-.694-.846-.641l-1.448,.2c1.199-1.727,3.168-2.8,5.326-2.8,3.397,0,6.245,2.651,6.483,6.037,.027,.395,.357,.697,.747,.697,.018,0,.036,0,.054-.002,.413-.029,.725-.388,.695-.801-.293-4.167-3.798-7.431-7.979-7.431Z" fill="currentColor" />
<circle cx="14.127" cy="14.126" r=".75" fill="currentColor" />
<circle cx="9" cy="16.25" r=".75" fill="currentColor" />
<circle cx="3.873" cy="14.126" r=".75" fill="currentColor" />
<circle cx="1.75" cy="9" r=".75" fill="currentColor" />
<path d="M15.985,11.082c-.383-.159-.821,.023-.98,.406-.159,.383,.023,.821,.406,.98s.821-.023,.98-.406-.023-.821-.406-.98Z" fill="currentColor" />
<path d="M11.487,15.005c-.383,.158-.564,.597-.406,.98,.159,.382,.597,.564,.98,.406s.564-.597,.406-.98-.597-.564-.98-.406Z" fill="currentColor" />
<path d="M6.513,15.005c-.383-.159-.821,.023-.98,.406s.023,.821,.406,.98,.821-.023,.98-.406c.159-.383-.023-.822-.406-.98Z" fill="currentColor" />
<path d="M2.015,11.082c-.383,.159-.564,.597-.406,.98s.597,.564,.98,.406,.564-.597,.406-.98c-.159-.383-.597-.564-.98-.406Z" fill="currentColor" />
</svg>
<span className="text-[14px] font-semibold text-[#111111]">{t("history")}</span>
</div>
<button
onClick={() => setHistoryOpen(false)}
className="flex size-7 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F0EFED] transition-colors"
>
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="text-current">
<rect x="11" y="1.101" width="2" height="21.799" transform="translate(-4.971 12) rotate(-45)" fill="currentColor" />
<rect x="1.101" y="11" width="21.799" height="2" transform="translate(-4.971 12) rotate(-45)" fill="currentColor" />
</svg>
</button>
</div>

<div className="flex-1 overflow-y-auto">
{historyLoading? (<div className="flex items-center justify-center py-12">
<EmojiIcon name="Loader2" className="size-5 animate-spin text-[#FF7A59]" />
</div>): historyItems.length === 0? (<div className="flex flex-col items-center justify-center py-12 px-4">
<EmojiIcon name="Clock" className="size-8 text-[#D2D1CF] mb-2" />
<p className="text-[13px] text-[#A0A09E]">{t("noHistory")}</p>
</div>): (<div className="p-2 space-y-1">
{historyItems.map((item) => (<div
key={item.id}
className="flex items-start gap-2 rounded-xl px-3 py-3 transition-all hover:bg-[#F7F6F3] group"
>
<button
onClick={() => loadHistoryItem(item)}
className="flex-1 text-left min-w-0"
>
<p className="text-[12px] font-medium text-[#111111] truncate group-hover:text-[#FF7A59]">
{item.user_message}
</p>
<p className="text-[10px] text-[#D2D1CF] mt-1">
{new Date(item.created_at).toLocaleString(dateLocale)}
</p>
</button>
<button
onClick={(e) => {
e.stopPropagation()
deleteHistoryItem(item.id)
}}
className="shrink-0 mt-0.5 p-1 rounded-md text-[#B0B0AE] hover:text-[#FF7A59] hover:bg-[#FFE8DF] transition-colors opacity-0 group-hover:opacity-100"
>
<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="14" height="14" viewBox="0 0 18 18">
<path d="M4,14.75c-.192,0-.384-.073-.53-.22-.293-.293-.293-.768,0-1.061L13.47,3.47c.293-.293,.768-.293,1.061,0s.293,.768,0,1.061L4.53,14.53c-.146,.146-.338,.22-.53,.22Z" fill="currentColor"/>
<path d="M14,14.75c-.192,0-.384-.073-.53-.22L3.47,4.53c-.293-.293-.293-.768,0-1.061s.768-.293,1.061,0L14.53,13.47c.293,.293,.293,.768,0,1.061-.146,.146-.338,.22-.53,.22Z" fill="currentColor"/>
</svg>
</button>
</div>))}
</div>)}
</div>
</div>
</div>)}

{!hasMessages? (/* Welcome State */
<div className="flex flex-1 flex-col items-center justify-center px-6 md:px-12 overflow-y-auto">
<Mascot3D size="large" mood="welcome" className="mb-2" />
<h2 className="mt-2 text-[22px] font-bold text-[#111111] tracking-tight">
{t("welcomeTitle")}
</h2>
<p className="mt-1.5 text-[14px] text-[#6B6B6B] text-center max-w-md leading-relaxed">
{t("welcomeDesc")}
</p>

<div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
{WELCOME_SUGGESTION_KEYS.map((key, i) => { const text = t(key); return (<button
key={key}
onClick={() => sendMessage(text)}
className="group flex items-start gap-2.5 rounded-2xl border border-[rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-sm px-4 py-3 text-left transition-all duration-200 hover:border-[#FFB89A]/40 hover:bg-white hover:shadow-[0_4px_16px_rgba(255,122,89,0.08)] hover:-translate-y-0.5"
style={{ animationDelay: `${i * 80}ms` }}
>
<FluentEmoji
name="orange circle"
size={14}
className="mt-0.5 shrink-0 drop-shadow-[0_1px_2px_rgba(255,122,89,0.3)]"
/>
<span className="text-[13px] leading-relaxed text-[#444444] group-hover:text-[#111111] whitespace-nowrap overflow-hidden text-ellipsis">
{text}
</span>
</button>) })}
</div>

<div className="mt-6 flex items-center gap-4 text-[11px] text-[#A0A09E]">
<span>{t("smartRecShort")}</span>
<span className="w-1 h-1 rounded-full bg-[#D2D1CF]" />
<span>{t("ingredientShort")}</span>
<span className="w-1 h-1 rounded-full bg-[#D2D1CF]" />
<span>{t("smartRecording")}</span>
</div>
</div>): (/* Chat Messages */
<div className="flex-1 overflow-y-auto px-6 py-6 md:px-12">
<div className="mx-auto max-w-4xl space-y-5">
{messageList}
<div ref={messagesEnd} />
</div>
</div>)}

{/* Input Bar */}
<div className="border-t border-[rgba(0,0,0,0.04)] bg-white/40 backdrop-blur-sm px-6 py-4 md:px-12">
<form
onSubmit={handleFormSubmit}
className="mx-auto max-w-4xl"
>
<div className="flex items-end gap-2 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-2.5 transition-all focus-within:border-[#FFB89A]/50 focus-within:shadow-[0_4px_20px_rgba(255,122,89,0.1)]">
<Input
value={input}
onChange={handleInputChange}
placeholder={t("inputPlaceholder")}
className="flex-1 border-0 bg-transparent shadow-none text-[14px] focus-visible:ring-0 pl-5 pr-0 py-0 placeholder:text-[#B0B0AE]"
disabled={loading}
onKeyDown={handleKeyDown}
/>
<Button
type="submit"
size="icon"
disabled={loading ||!input.trim()}
className={cn("size-9 shrink-0 rounded-xl transition-all",
input.trim()? "bg-gradient-to-br from-[#FFB89A] to-[#FF7A59] hover:from-[#FFA885] hover:to-[#E86A4A] shadow-[0_2px_8px_rgba(255,122,89,0.25)]": "bg-[#F0EFED] text-[#B0B0AE] hover:bg-[#E5E4E2]")}
>
{loading? <EmojiIcon name="Loader2" className="size-4 animate-spin" />: (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
<path d="M3.474,2.784L14.897,6.958c.481,.176,.467,.861-.021,1.018l-5.228,1.673-1.673,5.228c-.156,.488-.842,.502-1.018,.021L2.784,3.474c-.157-.43,.26-.847,.69-.69Z" fill="none" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</svg>)}
</Button>
</div>
<p className="mt-2.5 text-center text-[10.5px] text-[#B0B0AE]">
{t("disclaimerFooter")}
</p>
</form>
</div>
</div>)
})
