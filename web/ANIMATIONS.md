# PetTrust 动画系统指南

## 引擎选择策略

本项目使用 **GSAP** + **Motion (Framer Motion)** 双引擎。

| 场景 | 推荐引擎 | 原因 |
|------|----------|------|
| React 组件声明式动画 | **Motion** | 声明式 API，与 React 生命周期集成 |
| 滚动驱动动画 | **GSAP ScrollTrigger** | 性能最优，scrub/pin/batch 支持 |
| 复杂时间线序列 | **GSAP Timeline** | 精确编排、交错、回调 |
| 微交互 (hover/tap) | **Motion** | whileHover/whileTap 声明式 |
| 元素进出场 | **Motion AnimatePresence** | DOM 挂卸载自动处理 |
| 批量元素交错进场 | **GSAP ScrollTrigger.batch** | onEnter + stagger 最高效 |
| SVG 路径动画 | **GSAP** | MotionPathPlugin 专业支持 |
| 固定区域滚动叙事 | **GSAP ScrollTrigger + pin** | pin: true 锁定区域 |

---

## Motion (Framer Motion) 用法

```tsx
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react"
```

### 微交互

```tsx
<motion.button
  whileHover={{ scale: 0.98 }}
  whileTap={{ scale: 0.96 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
/>
```

### 进场动画

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
/>
```

### 进出场动画 (需要 AnimatePresence)

```tsx
<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    />
  )}
</AnimatePresence>
```

### 滚动触发动画

```tsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.6 }}
/>
```

### 滚动视差

```tsx
const { scrollYProgress } = useScroll()
const y = useTransform(scrollYProgress, [0, 1], [0, -100])
return <motion.div style={{ y }} />
```

### 共享布局动画 (layoutId)

```tsx
{tabs.map(tab => (
  <div key={tab.id}>
    {activeTab === tab.id && <motion.div layoutId="indicator" />}
  </div>
))}
```

### 交错容器

```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }}
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
    />
  ))}
</motion.div>
```

---

## GSAP 用法

```tsx
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(useGSAP, ScrollTrigger)
```

### useGSAP hook (必须用这个，不要用 useEffect)

```tsx
const containerRef = useRef<HTMLDivElement>(null)

useGSAP(() => {
  gsap.to(".box", { x: 360, duration: 1, ease: "power2.out" })
}, { scope: containerRef }) // scope 限定选择器范围
```

### 事件处理中的动画 (必须用 contextSafe)

```tsx
const { contextSafe } = useGSAP({ scope: containerRef })
const handleClick = contextSafe(() => {
  gsap.to(".box", { rotation: 180 })
})
```

### Timeline 编排

```tsx
useGSAP(() => {
  const tl = gsap.timeline({ defaults: { ease: "power2.out" } })
  tl.from(".title", { opacity: 0, y: 20, duration: 0.6 })
    .from(".subtitle", { opacity: 0, y: 20, duration: 0.4 }, "-=0.3")
    .from(".cta", { scale: 0.8, opacity: 0, duration: 0.3 }, "-=0.1")
}, { scope: containerRef })
```

### ScrollTrigger 滚动驱动

```tsx
useGSAP(() => {
  // scrub: 动画进度绑定滚动位置
  gsap.to(".parallax", {
    y: -100,
    scrollTrigger: { trigger: ".section", start: "top bottom", end: "bottom top", scrub: true },
  })

  // 批量交错进场
  ScrollTrigger.batch(".card", {
    onEnter: (elements) =>
      gsap.from(elements, { opacity: 0, y: 40, stagger: 0.1, duration: 0.6 }),
    once: true,
  })
})
```

### pin 固定区域叙事

```tsx
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".story-section",
      pin: true,
      start: "top top",
      end: "+=2000",
      scrub: 1,
    },
  })
  tl.to(".panel-1", { opacity: 0 })
    .from(".panel-2", { opacity: 0 })
    .to(".panel-2", { opacity: 0 })
    .from(".panel-3", { opacity: 0 })
})
```

---

## GSAP 缓动速查

| 类型 | 字符串 | 说明 |
|------|--------|------|
| 线性 | `"none"` | 匀速 |
| 幂次 | `"power1"` ~ `"power4"` | 支持 `.in`/`.out`/`.inOut` |
| 弹性 | `"back.in(1.7)"` | 可配强度参数 |
| 弹跳 | `"bounce.out"` | 自然弹跳 |
| 弹簧 | `"elastic.out(1, 0.3)"` | 参数: (振幅, 周期) |
| 指数 | `"expo.out"` | 强力缓入/出 |
| 步进 | `"steps(8)"` | 逐帧步进 |

---

## 项目封装

- **动画预设**: `web/lib/animations.ts` — Motion variants、transitions、GSAP 配置
- **封装组件**: `web/components/ui/animated-container.tsx` — FadeInUp、StaggerContainer、HoverCard 等
- **设计令牌**: `web/design-system/tokens/motion.ts` — duration、easing CSS 变量

## 重要规则

1. 所有 GSAP 动画必须使用 `useGSAP` hook，不要用 `useEffect`
2. 所有 GSAP 动画必须通过 `scope` 限定范围
3. Motion 的 `AnimatePresence` 必须给子元素设置 `key`
4. 必须考虑 `prefers-reduced-motion` 用户偏好（使用 `safeTransition` / `safeVariants`）
5. SSR 环境确保动画代码在客户端才执行
6. 动画必须克制 — "less is more"，避免过度炫技
