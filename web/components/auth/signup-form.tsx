"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

    router.push("/login?registered=true")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[14px] font-semibold text-[#111111]">
          邮箱
        </label>
        <input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 w-full rounded-[8px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[17px] text-[#111111] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(255,122,89,0.15)] focus:border-[#FF7A59]"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[14px] font-semibold text-[#111111]">
          密码
        </label>
        <input
          id="password"
          type="password"
          placeholder="至少6位密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="h-11 w-full rounded-[8px] border border-[rgba(0,0,0,0.06)] bg-white px-3 text-[17px] text-[#111111] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(255,122,89,0.15)] focus:border-[#FF7A59]"
        />
      </div>
      {error && (
        <p className="text-[14px] text-[#ff3b30]">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center rounded-full bg-[#FF7A59] text-[17px] font-normal text-white transition-colors hover:bg-[#E86A4A] active:scale-[0.98] disabled:opacity-50"
      >
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        注册
      </button>
    </form>
  )
}
