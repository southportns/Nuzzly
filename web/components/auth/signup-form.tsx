"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTranslations } from "next-intl"

export function SignupForm() {
const t = useTranslations("Auth")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const [error, setError] = useState("")
const [loading, setLoading] = useState(false)
const router = useRouter()
const supabase = createClient()

async function handleSubmit(e: React.FormEvent) {
e.preventDefault()
if (loading) return
setError("")
setLoading(true)

const { error: signUpError } = await supabase.auth.signUp({
email,
password,
options: {
emailRedirectTo: `${location.origin}/callback`,
},
})

if (signUpError) {
setError(signUpError.message)
setLoading(false)
return
}

router.push("/login")
}

return (<form onSubmit={handleSubmit} className="space-y-4">
<div>
<label htmlFor="email" className="mb-1.5 block text-[14px] font-semibold text-[#111111]">
{t("email")}
</label>
<input
id="email"
name="email"
type="email"
autoComplete="email"
placeholder={t("emailPlaceholder")}
value={email}
onChange={(e) => setEmail(e.target.value)}
required
className="h-11 w-full rounded-[8px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[17px] text-[#111111] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(255,122,89,0.15)] focus:border-[#FF7A59]"
/>
</div>
<div>
<label htmlFor="password" className="mb-1.5 block text-[14px] font-semibold text-[#111111]">
{t("password")}
</label>
<input
id="password"
name="password"
type="password"
autoComplete="new-password"
placeholder={t("passwordMinLength")}
value={password}
onChange={(e) => setPassword(e.target.value)}
required
minLength={6}
className="h-11 w-full rounded-[8px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[17px] text-[#111111] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(255,122,89,0.15)] focus:border-[#FF7A59]"
/>
</div>
{error && (<p className="text-[14px] text-[#ff3b30]">{error}</p>)}
<button
type="submit"
disabled={loading}
className="flex h-11 w-full items-center justify-center rounded-full bg-[#FF7A59] text-[17px] font-normal text-white transition-colors hover:bg-[#E86A4A] active:scale-[0.98] disabled:opacity-50"
>
{loading && <EmojiIcon name="Loader2" className="mr-2 size-4 animate-spin" />}
{t("signUpButton")}
</button>
</form>)
}
