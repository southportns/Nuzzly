// PetTrust Animation System — GSAP + Motion 双引擎
// 统一管理动画配置、预设和工具函数

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

/** 微交互 hover 上浮 */
export const hoverLift: Variants = {
  rest: { y: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  hover: { y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
}

/** 元素进场 — 淡入上移 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

/** 元素进场 — 淡入缩放 */
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

/** 容器子元素交错进场 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

/** 子元素统一进场 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

/** 页面过渡 */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/** 模态框/弹窗进出场 */
export const modalTransition: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
}

/** 遮罩层淡入 */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

// ──────────────────────────────────────────────
// 统一 Transition 配置
// ──────────────────────────────────────────────

export const transitions = {
  /** 默认平滑过渡 */
  default: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  /** 快速过渡 */
  fast: { duration: 0.12, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  /** 缓慢过渡 */
  slow: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
  /** 弹簧过渡 */
  spring: { type: "spring", stiffness: 400, damping: 17 } satisfies Transition,
  /** 柔和弹簧 */
  gentleSpring: { type: "spring", stiffness: 200, damping: 20 } satisfies Transition,
  /** 页面切换 */
  page: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
} as const

// ──────────────────────────────────────────────
// GSAP 配置常量
// ──────────────────────────────────────────────

/** GSAP 默认缓动 */
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

/** GSAP 默认动画配置 */
export const GSAP_DEFAULTS = {
  duration: 0.5,
  ease: GSAP_EASE.default,
  stagger: 0.08,
} as const

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

/** 检查用户是否偏好减少动画 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** 根据用户偏好返回安全的动画配置 */
export function safeTransition(transition: Transition): Transition {
  if (prefersReducedMotion()) {
    return { duration: 0 }
  }
  return transition
}

/** 根据用户偏好返回安全的 variants */
export function safeVariants(variants: Variants): Variants {
  if (prefersReducedMotion()) {
    return {
      hidden: variants.visible ?? {},
      visible: variants.visible ?? {},
    }
  }
  return variants
}
