// PetTrust Animation System — GSAP + Motion 双引擎
// 统aManagement动画Configuration,预设 and 工具函数

import type { Transition, Variants } from "motion/react"

// ──────────────────────────────────────────────
// Motion (Framer Motion) 预设
// ──────────────────────────────────────────────

/** 微交互 hover 缩放 */
export const hoverScale: Variants = {
rest: { scale: 1 },
hover: { scale: 0.98 },
tap: { scale: 0.96 },
}

/** 微交互 hover 浮 */
export const hoverLift: Variants = {
rest: { y: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
hover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
}

/** SGD素进场 — 淡 移 */
export const fadeInUp: Variants = {
hidden: { opacity: 0, y: 20 },
visible: { opacity: 1, y: 0 },
}

/** SGD素进场 — 淡 缩放 */
export const fadeInScale: Variants = {
hidden: { opacity: 0, scale: 0.95 },
visible: { opacity: 1, scale: 1 },
}

/** 容器子SGD素交错进场 */
export const staggerContainer: Variants = {
hidden: { opacity: 0 },
visible: {
opacity: 1,
transition: { staggerChildren: 0.08, delayChildren: 0.1 },
},
}

/** 子SGD素统a进场 */
export const staggerItem: Variants = {
hidden: { opacity: 0, y: 16 },
visible: { opacity: 1, y: 0 },
}

/** 页面past 渡 */
export const pageTransition: Variants = {
initial: { opacity: 0, y: 8 },
animate: { opacity: 1, y: 0 },
exit: { opacity: 0, y: -8 },
}

/** 模态框/sheet进 场 */
export const modalTransition: Variants = {
hidden: { opacity: 0, scale: 0.95, y: 10 },
visible: { opacity: 1, scale: 1, y: 0 },
exit: { opacity: 0, scale: 0.95, y: 10 },
}

/** 遮罩层淡 */
export const overlayFade: Variants = {
hidden: { opacity: 0 },
visible: { opacity: 1 },
exit: { opacity: 0 },
}

// ──────────────────────────────────────────────
// 统a Transition Configuration
// ──────────────────────────────────────────────

export const transitions = {
/** Default平滑past 渡 */
default: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
/** 快速past 渡 */
fast: { duration: 0.12, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
/** 缓慢past 渡 */
slow: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
/** 弹簧past 渡 */
spring: { type: "spring", stiffness: 400, damping: 17 } satisfies Transition,
/** 柔 and 弹簧 */
gentleSpring: { type: "spring", stiffness: 200, damping: 20 } satisfies Transition,
/** 页面切换 */
page: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
} as const

// ──────────────────────────────────────────────
// GSAP Configuration常量
// ──────────────────────────────────────────────

/** GSAP Default缓动 */
export const GSAP_EASE = {
default: "power1.out",
smooth: "power2.out",
strong: "power3.out",
dramatic: "power4.out",
bounce: "bounce.out",
elastic: "elastic.out(1, 0.3)",
back: "back.in(1.7)",
expo: "expo.out",
} as const

/** GSAP Default动画Configuration */
export const GSAP_DEFAULTS = {
duration: 0.5,
ease: GSAP_EASE.default,
stagger: 0.08,
} as const

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

/** 检查UserWhether偏good 减few 动画 */
export function prefersReducedMotion(): boolean {
if (typeof window === "undefined") return false
return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** 根据User偏good returnSecurity 动画Configuration */
export function safeTransition(transition: Transition): Transition {
if (prefersReducedMotion()) {
return { duration: 0 }
}
return transition
}

/** 根据User偏good returnSecurity variants */
export function safeVariants(variants: Variants): Variants {
if (prefersReducedMotion()) {
return {
hidden: variants.visible?? {},
visible: variants.visible?? {},
}
}
return variants
}
