"use client"

import { type ReactNode, useRef } from "react"
import { motion, type Variants, type Transition } from "motion/react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import {
  fadeInUp,
  fadeInScale,
  staggerContainer,
  staggerItem,
  hoverScale,
  hoverLift,
  transitions,
  safeTransition,
  safeVariants,
} from "@/lib/animations"

// 注册 GSAP hook
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP)
}

// ──────────────────────────────────────────────
// Motion 包装组件
// ──────────────────────────────────────────────

interface AnimatedProps {
  children: ReactNode
  className?: string
  variants?: Variants
  transition?: Transition
  delay?: number
}

/** 淡入上移容器 */
export function FadeInUp({ children, className, transition, delay }: AnimatedProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={safeVariants(fadeInUp)}
      transition={safeTransition(transition ?? { ...transitions.default, delay })}
    >
      {children}
    </motion.div>
  )
}

/** 淡入缩放容器 */
export function FadeInScale({ children, className, transition, delay }: AnimatedProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={safeVariants(fadeInScale)}
      transition={safeTransition(transition ?? { ...transitions.default, delay })}
    >
      {children}
    </motion.div>
  )
}

/** 交错子元素容器 */
export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={safeVariants(staggerContainer)}
    >
      {children}
    </motion.div>
  )
}

/** 交错子元素项 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={safeVariants(staggerItem)} transition={transitions.default}>
      {children}
    </motion.div>
  )
}

/** 可 hover 的交互容器 */
export function HoverCard({
  children,
  className,
  variant = "scale",
}: {
  children: ReactNode
  className?: string
  variant?: "scale" | "lift"
}) {
  return (
    <motion.div
      className={className}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      variants={variant === "scale" ? hoverScale : hoverLift}
      transition={transitions.spring}
    >
      {children}
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// GSAP 包装组件
// ──────────────────────────────────────────────

interface GSAPScrollRevealProps {
  children: ReactNode
  className?: string
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  stagger?: number
  once?: boolean
}

/** GSAP 滚动触发动画 */
export function GSAPScrollReveal({
  children,
  className,
  from = { opacity: 0, y: 30 },
  to = { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
  stagger = 0,
  once = true,
}: GSAPScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const targets = ref.current?.children
      if (!targets?.length) return

      gsap.from(targets, {
        ...from,
        stagger,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: once ? "play none none none" : "play reverse play reverse",
        },
      })

      gsap.to(targets, {
        ...to,
        stagger,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: once ? "play none none none" : "play reverse play reverse",
        },
      })
    },
    { scope: ref },
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
