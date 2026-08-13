"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import "./grid-motion.css"

export type GridMotionItem = string | React.ReactNode

interface GridMotionProps {
/** 28 cell 容; chars符串 http/https open 头 or.jpg/.jpeg/.png/.webp/.gif/.avif 结尾视 for Images,No 视 for 文 chars;also can传 ReactNode */
items?: GridMotionItem[]
/** 径to 背景渐变颜色 */
gradientColor?: string
/** 鼠标移动时单行Max水平位移(px) */
maxMoveAmount?: number
}

const TOTAL_ITEMS = 28
const COLS = 7
const ROWS = 4

/**
* GridMotion — react-bits JS+CSS 变体 本地实现.
* 4 行 × 7 列网格,鼠标水平移动时相邻行沿相反方to 平移,形成视差.
*/
export function GridMotion({
items = [],
gradientColor = "#000",
maxMoveAmount = 300,
}: GridMotionProps) {
const rowRefs = useRef<(HTMLDivElement | null)[]>([])
const mouseXRef = useRef<number>(0)

// Default填充 "Item N",few on 28 项时自动补齐
const defaultItems = Array.from({ length: TOTAL_ITEMS },
(_, i) => `Item ${i + 1}`)
const combinedItems: GridMotionItem[] =
items.length > 0? items.slice(0, TOTAL_ITEMS).concat(defaultItems.slice(items.length)): defaultItems

useEffect(() => {
// 防止 SSR/初始 for 0 导致首帧错位
if (typeof window!== "undefined") {
mouseXRef.current = window.innerWidth / 2
}

gsap.ticker.lagSmoothing(0)

const handleMouseMove = (e: MouseEvent) => {
mouseXRef.current = e.clientX
}

const updateMotion = () => {
const baseDuration = 0.8
const inertiaFactors = [0.6, 0.4, 0.3, 0.2]

rowRefs.current.forEach((row, index) => {
if (!row) return
const direction = index % 2 === 0? 1: -1
const moveAmount =
((mouseXRef.current / window.innerWidth) * maxMoveAmount - maxMoveAmount / 2) * direction

gsap.to(row, {
x: moveAmount,
duration: baseDuration + inertiaFactors[index % inertiaFactors.length],
ease: "power3.out",
overwrite: "auto",
})
})
}

const removeAnimationLoop = gsap.ticker.add(updateMotion)
window.addEventListener("mousemove", handleMouseMove)

return () => {
window.removeEventListener("mousemove", handleMouseMove)
removeAnimationLoop()
}
}, [maxMoveAmount])

return (<div
className="grid-motion-root"
style={{ ["--gm-gradient" as string]: gradientColor } as React.CSSProperties}
aria-hidden="true"
>
<div className="grid-motion-grid">
{Array.from({ length: ROWS }).map((_, rowIndex) => (<div
key={rowIndex}
className="grid-motion-row"
ref={(el) => {
rowRefs.current[rowIndex] = el
}}
>
{Array.from({ length: COLS }).map((_, itemIndex) => {
const content = combinedItems[rowIndex * COLS + itemIndex]
const isImageUrl =
typeof content === "string" &&
(/^https?:\/\//i.test(content) || /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(content))
return (<div key={itemIndex} className="grid-motion-item">
{isImageUrl? (<div
className="grid-motion-item-img"
style={{ backgroundImage: `url(${content})` }}
/>): (<div className="grid-motion-item-content">{content}</div>)}
</div>)
})}
</div>))}
</div>
<div className="grid-motion-overlay" />
</div>)
}
