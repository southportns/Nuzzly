import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { NuzzlyLogo } from "@/components/ui/nuzzly-logo"

export default function SignupPage() {
return (<div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-4">
<div className="w-full max-w-[400px]">
<div className="text-center text-[#6F4535]">
<Link href="/" className="inline-flex items-center gap-2.5 transition-transform duration-200 ease-out hover:-translate-y-1 hover:scale-105">
<NuzzlyLogo className="h-20" />
</Link>
<h1 className="mt-4 text-[28px] font-bold leading-[1.07] tracking-[-0.005em] text-[#6F4535]">
Sign Up Nuzzly Town
</h1>
<p className="mt-2 text-[14px] text-[#6B6B6B]">
Create an account,start tracking real feedback
</p>
</div>
<div className="mt-8 rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-white p-6">
<SignupForm />
<p className="mt-4 text-center text-[14px] text-[#6B6B6B]">
Already have an account?{" "}
<Link href="/login" className="text-[#FF7A59] hover:underline">
Sign In
</Link>
</p>
</div>
</div>
</div>)
}
