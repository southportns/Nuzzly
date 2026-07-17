# Nuzzly iOS 前端设计文档

## 概述

本文档描述 Nuzzly iOS 端（Vue 3 + Vite）前端的设计系统、组件规范和页面布局。

---

## 设计理念

温暖、友好、可爱的宠物社区设计风格。采用柔和的暖棕色系、大圆角造型和流畅的动画，营造轻松愉悦的用户体验。

---

## 1. 色彩系统

### 品牌色

| Token | 色值 | 用途 |
|-------|------|------|
| `--brown` / `--color-primary` | `#8B5E46` | 主按钮、强调、活跃状态 |
| `--beige` / `--color-secondary` | `#D7B593` | 渐变辅助色、次要元素 |
| `--green` / `--color-accent` | `#6C8A69` | 成功状态、健康指标 |

### 中性色

| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` / `--color-bg` | `#F5F3F1` | 页面主背景 |
| `--card` / `--color-card` | `#FFFFFF` | 卡片背景 |
| `--fg` / `--color-fg` | `#171717` | 主要文字 |
| `--muted` / `--color-muted` | `#7B7B7B` | 次要文字、占位符 |
| `--border` | `rgba(0,0,0,.06)` | 边框、分隔线 |
| `--sep` | `rgba(60,60,67,0.12)` | 分割线 |

### 语义色

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-success` | `#6C8A69` | 正向指标 |
| `--color-warning` | `#F5A623` | 警告 |
| `--color-error` / `--red` | `#FF3B30` | 错误、危险 |
| `--color-info` / `--blue` | `#007AFF` | 信息链接 |
| `--color-warning-bg` | `rgba(245,166,35,.1)` | 警告背景 |
| `--color-error-bg` | `rgba(255,59,48,.1)` | 错误背景 |

### 渐变

```css
/* 头像渐变 */
background: linear-gradient(135deg, var(--beige), var(--brown));

/* 卡片背景渐变 */
background: linear-gradient(135deg, #FFFFFF 0%, #F5F3F1 100%);
```

---

## 2. 字体系统

### 字体族

```css
--font-display: -apple-system, 'SF Pro Display', 'PingFang SC', system-ui, sans-serif;
--font-body: -apple-system, 'SF Pro Text', 'PingFang SC', system-ui, sans-serif;
--font-num: 'Inter', -apple-system, system-ui, sans-serif;
```

### 字号层级

| 层级 | Token | 值 | 字重 | 用途 |
|------|-------|-----|------|------|
| Display | `--font-size-3xl` | 24px | Bold (700) | 数字展示、大标题 |
| H1 | `--font-size-2xl` | 20px | Bold (700) | 页面标题 |
| H2 | `--font-size-xl` | 18px | Semibold (600) | 区块标题 |
| H3 | `--font-size-lg` | 16px | Semibold (600) | 卡片标题 |
| Body | `--font-size-md` | 15px | Regular (400) | 表单输入、正文 |
| Body-sm | `--font-size-base` | 14px | Regular (400) | 正文默认 |
| Caption | `--font-size-sm` | 13px | Regular (400) | 辅助说明 |
| Caption-xs | `--font-size-xs` | 11px | Regular (400) | 标签、时间戳 |

### 行高

| Token | 值 | 用途 |
|-------|-----|------|
| `--line-height-tight` | 1.2 | 标题、数字 |
| `--line-height-normal` | 1.5 | 正文 |
| `--line-height-loose` | 1.8 | 宽松排版 |

### 字间距

| Token | 值 | 用途 |
|-------|-----|------|
| `--letter-spacing-tight` | -0.01em | 标题 |
| `--letter-spacing-normal` | 0 | 正文 |
| `--letter-spacing-loose` | 0.02em | 标签 |

---

## 3. 间距系统

基于 4px 网格。

| Token | 值 | 用途 |
|-------|-----|------|
| `--spacing-xs` | 4px | 极小间距 |
| `--spacing-sm` | 8px | 元素内间距 |
| `--spacing-md` | 12px | 组件间距 |
| `--spacing-lg` | 16px | 卡片内边距、页面边距 |
| `--spacing-xl` | 20px | 区块间距 |
| `--spacing-2xl` | 24px | 模块间距 |
| `--spacing-3xl` | 32px | 大区块间距 |

---

## 4. 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-xs` | 4px | 小标签 |
| `--radius-sm` | 8px | 小按钮 |
| `--radius-md` | 10px | 输入框 |
| `--radius-lg` | 12px | 卡片 |
| `--radius-xl` | 16px | 大卡片 |
| `--radius-2xl` | 20px | 弹窗 |
| `--radius-3xl` | 36px | 特殊组件（首页卡片） |
| `--radius-pill` / `--radius-btn` | 999px | 胶囊按钮、标签 |
| `--radius-circle` | 50% | 圆形头像 |

---

## 5. 阴影系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,.04)` | 小阴影 |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.06)` | 中阴影 |
| `--shadow-lg` | `0 8px 30px rgba(0,0,0,.06)` | 大阴影 |
| `--shadow-xl` | `0 12px 40px rgba(0,0,0,.08)` | 弹窗阴影 |
| `--shadow-card` | `0 8px 30px rgba(0,0,0,.06)` | 卡片专用 |
| `--shadow-btn` | `0 4px 16px rgba(139,94,70,.18)` | 按钮专用 |
| `--shadow-tab` | `0 -4px 24px rgba(0,0,0,.06)` | TabBar 阴影 |

---

## 6. 尺寸系统

### 组件高度

| Token | 值 | 用途 |
|-------|-----|------|
| `--height-input` | 44px | 输入框 |
| `--height-button` | 48px | 按钮 |
| `--height-tab` | 51px | TabBar |

### 图标尺寸

| Token | 值 | 用途 |
|-------|-----|------|
| `--icon-size-sm` | 16px | 小图标 |
| `--icon-size-md` | 20px | 中图标 |
| `--icon-size-lg` | 24px | 大图标 |
| `--icon-size-xl` | 32px | 超大图标 |

### 头像尺寸

| Token | 值 | 用途 |
|-------|-----|------|
| `--avatar-size-sm` | 40px | 小头像 |
| `--avatar-size-md` | 52px | 中头像（首页） |
| `--avatar-size-lg` | 64px | 大头像 |

### 触摸目标

```css
--touch-target-min: 44px;  /* Apple HIG 最小触摸目标 */
```

---

## 7. 动画系统

### 动画时长

| Token | 值 | 用途 |
|-------|-----|------|
| `--duration-fast` | 0.15s | 按钮反馈 |
| `--duration-normal` | 0.2s | 过渡效果 |
| `--duration-slow` | 0.3s | 淡入淡出 |
| `--duration-slower` | 0.6s | 页面动画 |

### 动画曲线

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--animation-curve: cubic-bezier(0.22, 1, 0.36, 1);
```

### 预设动画类

```css
/* 从下淡入 */
.anim-fade-up {
  opacity: 0;
  animation: fadeUp .6s cubic-bezier(.22,1,.36,1) forwards;
}

/* 缩放淡入 */
.anim-scale-in {
  opacity: 0;
  animation: scaleIn .5s cubic-bezier(.22,1,.36,1) forwards;
}

/* 延迟类 */
.anim-delay-1 { animation-delay: .1s }
.anim-delay-2 { animation-delay: .2s }
.anim-delay-3 { animation-delay: .3s }
.anim-delay-4 { animation-delay: .4s }
.anim-delay-5 { animation-delay: .5s }
.anim-delay-6 { animation-delay: .6s }
```

### 交互动画

```css
/* 按钮点击反馈 */
button:active { transform: scale(.92); }

/* 卡片点击反馈 */
.dash-card:active { transform: scale(.97); }

/* 快捷按钮点击 */
.qa-btn:active { transform: scale(.9); }
```

---

## 8. 安全区

```css
--safe-top: env(safe-area-inset-top, 48px);
--safe-bottom: env(safe-area-inset-bottom, 34px);
--safe-left: env(safe-area-inset-left, 0px);
--safe-right: env(safe-area-inset-right, 0px);
```

---

## 9. 层级系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--z-index-base` | 1 | 基础层 |
| `--z-index-dropdown` | 10 | 下拉菜单 |
| `--z-index-sticky` | 20 | 粘性定位 |
| `--z-index-modal-backdrop` | 90 | 弹窗背景 |
| `--z-index-modal` | 100 | 弹窗 |
| `--z-index-toast` | 1000 | Toast 提示 |

---

## 10. 组件规范

### 10.1 页面容器 (app-shell)

```css
.app-shell {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: var(--safe-top);
  padding-bottom: calc(88px + var(--safe-bottom));
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  position: relative;
}
```

### 10.2 顶部导航栏

**布局结构：**
```
┌─────────────────────────────────┐
│ [头像]              [搜索] [通知] │
│                                  │
│ 你好，用户名                      │
│ 欢迎来到毛球镇                    │
└─────────────────────────────────┘
```

**头像：**
```css
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--beige), var(--brown));
  box-shadow: 0 2px 12px rgba(139,94,70,.12);
}
```

**图标按钮：**
```css
.action-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
}
```

**问候语：**
```css
.greeting-main {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -.02em;
}
```

### 10.3 快捷操作按钮

```css
.qa-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
}

.qa-btn.primary {
  background: var(--brown);
  border: none;
  box-shadow: var(--shadow-btn);
}

.qa-btn.primary svg {
  color: #fff;
}

.qa-label {
  position: absolute;
  bottom: -20px;
  font-size: 11px;
  color: var(--muted);
}
```

### 10.4 健康卡片 (Hero Card)

```css
.hero-card {
  margin: 36px 24px 0;
  background: var(--card);
  border-radius: var(--radius-card);  /* 36px */
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
  padding: 28px 28px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 200px;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(108,138,105,.1);
  color: var(--green);
  font-size: 13px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: var(--radius-btn);
}

.hero-score {
  font-family: var(--font-num);
  font-size: 56px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -.03em;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--brown);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  padding: 14px 24px;
  border-radius: var(--radius-btn);
  box-shadow: var(--shadow-btn);
}
```

### 10.5 功能卡片网格

```css
.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 28px 24px 0;
}

.dash-card {
  background: var(--card);
  border-radius: var(--radius-card);  /* 36px */
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
  padding: 24px;
  width: 155px;
  height: 155px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dash-card.accent-bg {
  background: rgba(215,181,147,.12);
}

.dash-card.green-bg {
  background: rgba(108,138,105,.08);
}

.dash-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
}

.dash-icon.brown { background: rgba(139,94,70,.1); }
.dash-icon.beige { background: rgba(215,181,147,.2); }
.dash-icon.green { background: rgba(108,138,105,.12); }
.dash-icon.gray  { background: rgba(0,0,0,.04); }

.dash-value {
  font-family: var(--font-num);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -.02em;
}
```

### 10.6 底部 TabBar

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: calc(20px + var(--safe-bottom));
  width: 405px;
  height: 51px;
  background: rgba(255,255,255,.82);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: var(--radius-tab);
  box-shadow: var(--shadow-tab), 0 4px 20px rgba(0,0,0,.04);
  border: 1px solid rgba(255,255,255,.6);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 16px;
  border-radius: 20px;
}

.tab-item svg {
  width: 24px;
  height: 24px;
  color: var(--muted);
}

.tab-item span {
  font-size: 10px;
  color: var(--muted);
  font-weight: 500;
}

.tab-item.active svg { color: var(--brown); }
.tab-item.active span { color: var(--brown); font-weight: 600; }

.tab-item.active::after {
  content: '';
  position: absolute;
  top: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brown);
}

/* 中心按钮 */
.tab-center-btn {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-logo {
  width: 65px;
  height: 65px;
}
```

### 10.7 通知徽标

```css
.notif-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #FF3B30;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
```

---

## 11. 页面布局

### 11.1 首页 (Home)

```
┌─────────────────────────────────┐
│         状态栏安全区              │
│                                  │
│ [头像]              [搜索] [通知] │  <- 顶部导航
│                                  │
│ 你好，用户名                      │  <- 问候语
│ 欢迎来到毛球镇                    │
│                                  │
│ [AI诊] [疫苗] [产品]             │  <- 快捷操作
│                                  │
│ ┌─────────────────────────────┐ │
│ │ ✓ 健康状况良好               │ │  <- 健康卡片
│ │ 96                           │ │
│ │ 综合健康评分                  │ │
│ │ [查看报告]          🐱       │ │
│ └─────────────────────────────┘ │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │ 今日体重  │ │ 养宠日记  │      │  <- 功能卡片
│ │ 4.5 kg   │ │          │      │
│ │ 记录 →   │ │    →     │      │
│ └──────────┘ └──────────┘      │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │ 宠物年龄  │ │ 今日饮食  │      │
│ │ 2岁 3月  │ │ 3 次/今日 │      │
│ │          │ │ 添加 +    │      │
│ └──────────┘ └──────────┘      │
│                                  │
│ ══════════════════════════════  │  <- 底部 TabBar
│ [首页] [产品库] [毛球镇] [AI] [我的] │
└─────────────────────────────────┘
```

### 11.2 社区页 (Community)

```
┌─────────────────────────────────┐
│ [Nuzzly Logo]       [搜索] [通知] │
│                                  │
│ [猫猫] [狗狗] [品种▼]           │  <- 筛选栏
│                                  │
│ ┌─────────────────────────────┐ │
│ │ 👤 用户名                    │ │  <- 帖子卡片
│ │ 帖子内容...                  │ │
│ │ [图片区域]                   │ │
│ │ ♡ 42  💬 12  ↗              │ │
│ └─────────────────────────────┘ │
│                                  │
│ ┌─────────────────────────────┐ │
│ │ ...更多帖子...               │ │
│ └─────────────────────────────┘ │
│                                  │
│ ══════════════════════════════  │
│ [首页] [产品库] [毛球镇] [AI] [我的] │
└─────────────────────────────────┘
```

---

## 12. 响应式处理

### viewport 单位适配

Vite 配置中使用 `postcss-px-to-viewport` 将 px 转为 vw：

```javascript
// vite.config.js
{
  selectorBlackList: ['.ignore-vw'],  // 排除 TabBar 等不缩放元素
}
```

### 不缩放元素

以下元素使用 `.ignore-vw` 类，保持固定像素：
- TabBar 容器
- TabBar 内图标和文字
- 中心导航按钮

---

## 13. 代码规范

### 文件结构

```
ios-app-frontend/
├── css/
│   ├── design-tokens.css    # 设计 Token 定义
│   └── common.css           # 共享样式、Reset、动画
├── src/
│   ├── components/          # 可复用组件
│   │   ├── TabBar.vue
│   │   ├── EmptyState.vue
│   │   ├── FormField.vue
│   │   └── ...
│   ├── views/               # 页面视图
│   │   ├── Home.vue
│   │   ├── Community.vue
│   │   ├── Profile.vue
│   │   └── ...
│   ├── composables/         # 组合式函数
│   └── router/              # 路由配置
```

### CSS 变量引用

```css
/* 使用 CSS 变量 */
background: var(--card);
color: var(--brown);
border-radius: var(--radius-card);
box-shadow: var(--shadow-card);
```

### 动画使用

```html
<!-- 页面元素动画 -->
<div class="anim-fade-up anim-delay-2">内容</div>

<!-- 按钮缩放动画 -->
<button class="qa-btn anim-scale-in anim-delay-3">操作</button>
```

---

## 14. 二级页面头部规范

**所有二级页面（从一级页面跳转进入的子页面）必须使用统一的头部样式，与社区页（Community）保持一致：**

### 头部结构

```
┌─────────────────────────────────┐
│         状态栏安全区              │
│                                  │
│ [Nuzzly Logo 毛球镇]    [🔔 通知] │  <- 顶栏（Logo + 通知按钮）
│                                  │
│  [内容区域...]                   │
│                                  │
│ ══════════════════════════════  │
│ [首页] [产品库] [毛球镇] [AI] [我的] │
└─────────────────────────────────┘
```

### 样式要求

1. **顶栏**：左侧品牌 Logo 图片（`/nuzzly-zuhe.png`，高度 32px），右侧通知按钮（`.action-circle` 圆形按钮）
2. **Shell 容器**：使用 `.app-shell` 类，`padding-top: var(--safe-top)`，`padding-bottom: calc(88px + var(--safe-bottom))`
3. **动画**：头部使用 `anim-fade-up`

### 参考实现

- 社区页：`src/views/Community.vue`
- 健康提醒页：`src/views/HealthReminders.vue`

---

## 15. 设计检查清单

- [ ] 所有颜色使用 CSS 变量
- [ ] 圆角遵循圆角系统
- [ ] 间距使用 4px 网格
- [ ] 字体层级清晰
- [ ] 按钮有点击反馈 (scale)
- [ ] 卡片有适当阴影
- [ ] TabBar 有毛玻璃效果
- [ ] 安全区适配正确
- [ ] 动画流畅不卡顿
- [ ] 触摸目标不小于 44px

---

*最后更新: 2026年7月*
*版本: 1.1*
