"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface NuzzlyLogoProps {
className?: string
mobile?: boolean
}

export function NuzzlyLogo({ className = "", mobile = false }: NuzzlyLogoProps) {
return (<div className={cn("nuzzly-logo-root inline-flex items-center", mobile? "h-12": "h-20", className)}>
{/* new Logo:++ chars a SVG */}
<div className="nuzzly-logo-wrap flex-shrink-0 h-full">
<Image
src="/Vector.svg"
alt="Nuzzly Town"
width={311}
height={128}
className="h-full w-auto"
priority
/>
</div>
<style>{`.nuzzly-logo-root:hover .nuzzly-logo-wrap {
animation: nuzzly-bounce 0.6s ease-in-out;
}
@keyframes nuzzly-bounce {
0% { transform: scale(1); }
30% { transform: scale(1.08); }
60% { transform: scale(0.97); }
100% { transform: scale(1); }
}
`}</style>
</div>)
}
