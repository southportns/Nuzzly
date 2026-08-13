"use client"

import Link from "next/link"
import { useState } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { GridMotion } from "@/components/backgrounds/grid-motion"
import type { GridMotionItem } from "@/components/backgrounds/grid-motion"
import { NuzzlyLogo } from "@/components/ui/nuzzly-logo"

/**
* Sign In页 — 左右布局
* 左:Logo + title + Sign-in form(embedded directly,Nosheet 壳)
* 右:react-bits GridMotion Images grid(鼠标视差)
*
* 替换Right sideImages:直接Modify 面 `baseImages` 数组.
*/
// 14 based on basic Images,Copya次 填满 GridMotion 28 格
const baseImages: GridMotionItem[] = [
"/loginpage/image-619b6170-0acd-4d75-bf95-bd0474b9e6e1.jpg",
"/loginpage/image-03b5e753-258f-4b9b-a171-310c5d9b4f73.jpg",
"/loginpage/image-eb5ab2e5-1e10-4eb7-9157-4ad494c61be4.jpg",
"/loginpage/image-61446606-23e0-42b8-9990-1cc91a987b80.jpg",
"/loginpage/image-9396722d-d8b3-494b-bb76-3ae23c2ee9e1.jpg",
"/loginpage/image-b86634c8-3583-4487-9f46-d022b54077db.jpg",
"/loginpage/image-17dea0ed-e0ec-49a0-a359-b4dc13575788.jpg",
"/loginpage/image-90a129d0-0948-45ba-9a44-563c01204087.jpg",
"/loginpage/image-c3b34f62-5fcd-4421-ab15-e38dc01b2c90.jpg",
"/loginpage/image-1daff9e4-c2f8-4b82-b1c0-13317d9090b0.jpg",
"/loginpage/image-acd49b5a-927c-4e1b-89cd-f6f3e2160b89.jpg",
"/loginpage/image-1b363147-6ba2-4b52-99e0-ea293db8b304.jpg",
"/loginpage/image-2b231ec1-2a45-4b80-887b-a8fdd82d84d2.jpg",
"/loginpage/image-8f9e4e6a-88c3-4f3c-9247-2b300a0adf4c.jpg",
]

const gridMotionItems: GridMotionItem[] = [...baseImages,...baseImages]

export default function LoginPage() {
const [mode, setMode] = useState<"login" | "signup">("login")

return (<div className="relative min-h-screen w-full overflow-hidden bg-[#F7F6F3]">
{/* ── Gradient background layer:cream white → light orange → banana yellow → brand orange,full-page gradient fill ── */}
<div
className="absolute inset-0"
aria-hidden="true"
style={{
background:
"linear-gradient(100deg, #F7F6F3 0%, #FFF0E8 40%, #FFE6B3 55%, #FFD166 70%, #FF7A59 100%)",
}}
/>

{/* ── Content layer ── */}
<div className="relative flex min-h-screen">
{/* Left side:Logo + title + Sign-in form */}
<div className="flex w-full flex-col items-center justify-center px-4 md:w-1/2">
<div className="w-full max-w-[440px]">
<div className="text-center text-[#6F4535]">
<Link href="/" className="inline-flex items-center gap-2.5 transition-transform duration-200 ease-out hover:-translate-y-1 hover:scale-105">
<NuzzlyLogo className="h-20" />
</Link>
<h1 className="mt-4 text-[28px] font-bold leading-[1.07] tracking-[-0.005em] text-[#6F4535]">
{mode === "login"? "Sign In": "Sign Up"}
</h1>
</div>

{/* Sign-in form(embedded directly,transparent background) */}
<div className="mt-6">
<LoginForm onModeChange={setMode} />
</div>
</div>
</div>

{/* Right side:GridMotion Images grid(transparent background,blends into gradient) */}
<div className="relative hidden md:block md:w-1/2">
<GridMotion
items={gridMotionItems}
gradientColor="transparent"
maxMoveAmount={300}
/>
</div>
</div>
</div>)
}
