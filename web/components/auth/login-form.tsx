"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import CurvedInput from "@/components/ui/curved-input"
import { useTranslations } from "next-intl"

// ── SVG Icons ──

function PhoneIcon() {
return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0.7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
</svg>)
}

function GitHubIcon() {
return (<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 32 32">
<title>github</title>
<g fill="currentColor">
<path d="M16,2.345c7.735,0,14,6.265,14,14-.002,6.015-3.839,11.359-9.537,13.282-.7,.14-.963-.298-.963-.665,0-.473,.018-1.978,.018-3.85,0-1.312-.437-2.152-.945-2.59,3.115-.35,6.388-1.54,6.388-6.912,0-1.54-.543-2.783-1.435-3.762,.14-.35,.63-1.785-.14-3.71,0,0-1.173-.385-3.85,1.435-1.12-.315-2.31-.472-3.5-.472s-2.38,.157-3.5,.472c-2.677-1.802-3.85-1.435-3.85-1.435-.77,1.925-.28,3.36-.14,3.71-.892,.98-1.435,2.24-1.435,3.762,0,5.355,3.255,6.563,6.37,6.913-.403,.35-.77,.963-.893,1.872-.805,.368-2.818,.963-4.077-1.155-.263-.42-1.05-1.452-2.152-1.435-1.173,.018-.472,.665,.017,.927,.595,.332,1.277,1.575,1.435,1.978,.28,.787,1.19,2.293,4.707,1.645,0,1.173,.018,2.275,.018,2.607,0,.368-.263,.787-.963,.665-5.719-1.904-9.576-7.255-9.573-13.283,0-7.735,6.265-14,14-14Z"/>
</g>
</svg>)
}

function AppleIcon() {
return (<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 32 32">
<title>apple</title>
<g fill="currentColor">
<path d="M19.61,4.808c1.035-1.294,1.737-3.032,1.552-4.808-1.515,.075-3.363,.999-4.433,2.295-.961,1.109-1.811,2.92-1.59,4.621,1.7,.147,3.399-.85,4.471-2.108"/>
<path d="M21.143,7.248c-2.469-.147-4.569,1.401-5.748,1.401s-2.986-1.327-4.939-1.292c-2.542,.037-4.901,1.475-6.191,3.761-2.653,4.573-.7,11.357,1.88,15.081,1.253,1.843,2.763,3.872,4.753,3.799,1.88-.074,2.617-1.217,4.902-1.217s2.947,1.217,4.937,1.18c2.064-.037,3.354-1.844,4.607-3.688,1.437-2.101,2.026-4.129,2.063-4.24-.037-.037-3.98-1.549-4.016-6.084-.037-3.797,3.095-5.603,3.243-5.716-1.769-2.616-4.533-2.911-5.491-2.985"/>
</g>
</svg>)
}

function EmailIcon() {
return (<svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="butt">
<title>envelope</title>
<polyline points="30 9 16 16 2 9" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="2"/>
<rect x="2" y="4" width="28" height="24" rx="3" ry="3" fill="none" stroke="currentColor" strokeLinecap="square" strokeMiterlimit="10" strokeWidth="2"/>
</svg>)
}

function WechatIcon() {
return (<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 32 32">
<title>wechat</title>
<g fill="currentColor">
<path d="M11.606,3.068C5.031,3.068,0,7.529,0,12.393s4.344,7.681,4.344,7.681l-.706,2.676c-.093,.353,.284,.644,.602,.464l3.173-1.798c1.403,.447,4.381,.59,4.671,.603-.208-.721-.311-1.432-.311-2.095,0-3.754,3.268-9.04,10.532-9.04,.165,0,.331,.004,.496,.011-.965-4.627-5.769-7.827-11.195-7.827Zm-4.327,7.748c-.797,0-1.442-.646-1.442-1.442s.646-1.442,1.442-1.442,1.442,.646,1.442,1.442-.646,1.442-1.442,1.442Zm8.386,0c-.797,0-1.442-.646-1.442-1.442s.646-1.442,1.442-1.442,1.442,.646,1.442,1.442-.646,1.442-1.442,1.442Z"/>
<path d="M32,19.336c0-4.26-4.998-7.379-9.694-7.379-6.642,0-9.459,4.797-9.459,7.966s2.818,7.966,9.459,7.966c1.469,0,2.762-.211,3.886-.584l2.498,1.585c.197,.125,.447-.052,.394-.279l-.567-2.46c2.36-1.643,3.483-4.234,3.483-6.815Zm-12.73-.81c-.704,0-1.275-.571-1.275-1.275s.571-1.275,1.275-1.275,1.275,.571,1.275,1.275c0,.705-.571,1.275-1.275,1.275Zm6.373,0c-.704,0-1.275-.571-1.275-1.275s.571-1.275,1.275-1.275,1.275,.571,1.275,1.275-.571,1.275-1.275,1.275Z"/>
</g>
</svg>)
}

// ── Types ──

type LoginMethod = "phone" | "github" | "apple" | "wechat" | "email"

const METHODS: { id: LoginMethod; icon: React.FC }[] = [
{ id: "phone", icon: PhoneIcon },
{ id: "github", icon: GitHubIcon },
{ id: "apple", icon: AppleIcon },
{ id: "wechat", icon: WechatIcon },
{ id: "email", icon: EmailIcon },
]

// ── Arc layout computation ──

const BTN_SIZE = 44
const BTN_GAP = 20
const BTN_BEND = -12

function computeArcPositions(count: number, size: number, gap: number, bend: number) {
const span = (count - 1) * (size + gap)
const a = Math.max(0.1, Math.abs(bend))
const R = (span * span * 0.25 + a * a) / (2 * a)
const phi = Math.asin(Math.min(1, span / (2 * R)))
const dir = bend >= 0? 1: -1
const raw = Array.from({ length: count }, (_, i) => {
const t = count === 1? 0: (i / (count - 1)) * 2 - 1
const theta = t * phi
const x = R * Math.sin(theta)
const y = dir * (-R + R * Math.cos(theta))
return { x, y }
})
const minY = Math.min(...raw.map(p => p.y))
return raw.map(p => ({ x: p.x, y: p.y - minY }))
}

const ARC_POSITIONS = computeArcPositions(METHODS.length, BTN_SIZE, BTN_GAP, BTN_BEND)
const ARC_HEIGHT = BTN_SIZE + Math.max(...ARC_POSITIONS.map(p => p.y))

// ── LoginForm component ──

interface LoginFormProps {
onSuccess?: () => void
onModeChange?: (mode: "login" | "signup") => void
}

export function LoginForm({ onSuccess, onModeChange }: LoginFormProps) {
const [loginMethod, setLoginMethod] = useState<LoginMethod>("email")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const [error, setError] = useState("")
const [loading, setLoading] = useState(false)
const [mode, setMode] = useState<"login" | "signup">("login")
const [step, setStep] = useState<"email" | "password">("email")
const router = useRouter()
const supabaseRef = useRef<ReturnType<typeof createClient>>(undefined)
if (!supabaseRef.current) supabaseRef.current = createClient()
const supabase = supabaseRef.current
const t = useTranslations("LoginButton")
const tAuth = useTranslations("Auth")

function validateAccount(value: string) {
if (loginMethod === "phone") {
const digits = value.replace(/\D/g, "")
return /^1\d{10}$/.test(digits)
}
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function handleEmailSubmit(value: string) {
if (!validateAccount(value)) {
setError(loginMethod === "phone"? tAuth("phoneInvalid"): tAuth("emailInvalid"))
return
}
setError("")
setEmail(value)
setStep("password")
}

function isNetworkError(err: unknown): boolean {
if (err instanceof TypeError) return true
if (err instanceof Error && (err.message.includes("failed to fetch") || err.message.includes("NetworkError"))) return true
return false
}

async function handlePasswordSubmit(value: string) {
if (loading) return
setPassword(value)
setError("")
setLoading(true)

try {
if (mode === "login") {
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
email,
password: value,
})
if (signInError) {
setError(signInError.message)
setLoading(false)
return
}

// Check if admin — redirect to admin dashboard
if (signInData.user) {
try {
const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", signInData.user.id).single()
if ((profile as { is_admin?: boolean } | null)?.is_admin) {
onSuccess?.()
router.push("/admin")
router.refresh()
return
}
} catch {
// Fallback to default redirect on profile query failure
}
}
} else {
const { error: signUpError } = await supabase.auth.signUp({
email,
password: value,
})
if (signUpError) {
setError(signUpError.message)
setLoading(false)
return
}
}

onSuccess?.()
router.push("/")
router.refresh()
} catch (err) {
if (isNetworkError(err)) {
setError(tAuth("networkError"))
} else if (err instanceof Error) {
setError(err.message)
} else {
setError(tAuth("loginfailed"))
}
setLoading(false)
}
}

async function handleOAuth(provider: "github" | "apple") {
if (loading) return
setError("")
setLoading(true)
try {
const { error: oauthError } = await supabase.auth.signInWithOAuth({
provider,
options: { redirectTo: `${window.location.origin}/auth/callback` },
})
if (oauthError) {
setError(oauthError.message)
setLoading(false)
}
} catch (err) {
if (isNetworkError(err)) {
setError(tAuth("networkError"))
} else if (err instanceof Error) {
setError(err.message)
}
setLoading(false)
}
}

function selectMethod(method: LoginMethod) {
setError("")
if (method === "github") { handleOAuth("github"); return }
if (method === "apple") { handleOAuth("apple"); return }
// WeChat login API will be wired up before launch.
if (method === "wechat") { return }
setLoginMethod(method)
setStep("email")
}

function handlereturn() {
setStep("email")
setPassword("")
setError("")
}

return (<div className="relative">
{/* ── Login method icons (curved arc) ── */}
{step === "email" && (<div className="relative" style={{ height: ARC_HEIGHT }}>
{METHODS.map((m, i) => {
const isActive = loginMethod === m.id
const Icon = m.icon
const pos = ARC_POSITIONS[i]
return (<button
key={m.id}
type="button"
onClick={() => selectMethod(m.id)}
title={m.id}
className="absolute flex items-center justify-center size-11 rounded-full transition-all duration-200"
style={{
left: `calc(50% + ${pos.x}px - ${BTN_SIZE / 2}px)`,
top: m.id === "email"? pos.y + 4: pos.y,
backgroundColor: "transparent",
border: "none",
boxShadow: "none",
opacity: 1,
transform: isActive? "translateY(-5px)": "translateY(0)",
}}
>
<span style={{ color: "#6F4535" }}>
<Icon />
</span>
</button>)
})}
</div>)}

{/* ── Email flow ── */}
{/* Phone login UI is not implemented yet; fall back to the email flow. */}
{(loginMethod === "email" || loginMethod === "phone") && (step === "email"? (<div className="mt-4">
<CurvedInput
value={email}
onChange={setEmail}
onSubmit={handleEmailSubmit}
placeholder={loginMethod === "phone"? t("enterPhone"): t("enterEmail")}
buttonText={t("next")}
type={loginMethod === "phone"? "tel": "email"}
autoFocus
width="100%"
bend={12}
height={52}
fontSize={14}
backgroundColor="#ffffff"
textColor="#111111"
placeholderColor="#b0b0b0"
borderColor="#e5e5e5"
buttonColor="#FF7A59"
buttonTextColor="#ffffff"
shadowColor="#FF7A59"
showButton={true}
/>
</div>): (<div className="mt-4">
<div className="flex items-center justify-center gap-2 mb-2">
<button
type="button"
onClick={handlereturn}
className="flex items-center justify-center size-8 rounded-full text-[#6B6B6B] hover:text-[#6F4535] hover:bg-white/80 transition-all"
aria-label="return"
>
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
<title>circle-arrow-left</title>
<g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt">
<path d="M2 12C2 17.5229 6.47715 22 12 22C17.5229 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" fill="none"></path>
<path d="M17 12L7 12L7.69239 12" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" fill="none"></path>
<path d="M11.2426 7.75732L6.99997 12L11.2426 16.2426" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" fill="none"></path>
</g>
</svg>
</button>
<span className="text-[13px] text-[#999]">|</span>
<span className="text-[13px] text-[#6B6B6B] truncate">{email}</span>
</div>
<CurvedInput
value={password}
onChange={setPassword}
onSubmit={handlePasswordSubmit}
placeholder={t("enterPassword")}
buttonText={mode === "login"? t("signIn"): t("signUp")}
type="password"
autoFocus
width="100%"
bend={12}
height={52}
fontSize={14}
backgroundColor="#ffffff"
textColor="#111111"
placeholderColor="#b0b0b0"
borderColor="#e5e5e5"
buttonColor="#8B5E46"
buttonTextColor="#ffffff"
shadowColor="#8B5E46"
showButton={true}
/>
</div>))}

{error && (<p className="mt-4 text-[13px] text-[#ff3b30] text-center">{error}</p>)}

{loading && (<div className="mt-4 flex items-center justify-center">
<svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5E46" strokeWidth="2.5" strokeLinecap="round">
<path d="M21 12a9 9 0 1 1-6.219-8.56" />
<polyline points="21 3 21 9 15 9" />
</svg>
</div>)}

<p className="mt-4 text-center text-[13px] text-[#6B6B6B]">
{mode === "login"? (<>
{t("noAccount")}{" "}
<button
type="button"
onClick={() => { setMode("signup"); onModeChange?.("signup"); setError(""); setStep("email") }}
className="text-[#FF7A59] font-medium hover:underline"
>
{t("signUpNow")}
</button>
</>): (<>
{t("hasAccount")}{" "}
<button
type="button"
onClick={() => { setMode("login"); onModeChange?.("login"); setError(""); setStep("email") }}
className="text-[#FF7A59] font-medium hover:underline"
>
{t("signInNow")}
</button>
</>)}
</p>
</div>)
}
