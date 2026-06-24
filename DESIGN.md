# PetRWD iOS App — Design System

## Brand
- **App Name:** Nuzzly · 毛球镇
- **Tagline:** 让每一次选择都值得信赖
- **Language:** 简体中文 (zh-Hans)
- **Platform:** iOS 16+ (iPhone)

---

## Color Palette

### Primary
| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#F59E0B` | 主色、CTA 按钮、活跃标签、价格标签 |
| primary-light | `#FEF3C7` | 浅色背景、标签填充、评分条 |
| primary-dark | `#D97706` | 按钮按压态、标题强调 |

### Neutral
| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | `#F7F7F5` | 页面主背景 |
| bg-card | `#FFFFFF` | 卡片背景 |
| bg-elevated | `.systemThinMaterial` 毛玻璃 | 弹出层、底部 Sheet、ActionSheet |
| text-primary | `#1A1A1A` | 标题、主文字 |
| text-secondary | `#6B7280` | 副标题、描述文字 |
| text-tertiary | `#9CA3AF` | 占位符、时间戳 |
| text-inverse | `#FFFFFF` | 深色背景上的文字 |
| border-default | `#E5E7EB` | 分割线、边框 |
| border-subtle | `#F3F4F6` | 轻微分隔 |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| success | `#22C55E` | 正向指标（便便改善↑、食欲正常） |
| success-bg | `#F0FDF4` | 正向指标背景 |
| warning | `#F59E0B` | 警告（轻微软便） |
| warning-bg | `#FEFCE8` | 警告背景 |
| error | `#EF4444` | 异常指标（严重腹泻、呕吐） |
| error-bg | `#FEF2F2` | 异常背景 |
| info | `#3B82F6` | 信息提示 |
| info-bg | `#EFF6FF` | 信息背景 |

### Star Rating
| Level | Hex | Usage |
|-------|-----|-------|
| star-filled | `#F59E0B` | 已评分星星 |
| star-empty | `#E5E7EB` | 未评分星星 |

---

## Typography

**Font Family:** SF Pro (iOS 系统字体)
**Chinese Fallback:** PingFang SC, Heiti SC

| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| display-lg | 28px | Bold (700) | 34px | -0.02em | 页面大标题 |
| display-md | 24px | Bold (700) | 30px | -0.02em | 模块大标题 |
| heading-lg | 20px | Semibold (600) | 26px | -0.01em | 区域标题 |
| heading-md | 17px | Semibold (600) | 22px | 0 | 列表标题 |
| body-lg | 16px | Regular (400) | 24px | 0 | 正文大字 |
| body-md | 15px | Regular (400) | 22px | 0 | 正文默认 |
| body-sm | 14px | Regular (400) | 20px | 0 | 正文小字 |
| caption | 13px | Regular (400) | 18px | 0.01em | 辅助文字 |
| caption-xs | 12px | Regular (400) | 16px | 0.01em | 标签、时间戳 |
| caption-xxs | 11px | Regular (400) | 14px | 0.02em | 徽标、角标 |

---

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | 最小间距 |
| space-2 | 8px | 紧凑间距 |
| space-3 | 12px | 元素内间距 |
| space-4 | 16px | 卡片内间距 |
| space-5 | 20px | 区域间距 |
| space-6 | 24px | 模块间距 |
| space-8 | 32px | 页面边距 |
| space-10 | 40px | 大模块间距 |
| space-12 | 48px | 页面顶部间距 |

---

## Shapes / Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-xs | 6px | 标签、小徽章 |
| radius-sm | 8px | 小按钮 |
| radius-md | 12px | 卡片内元素 |
| radius-lg | 16px | 卡片 |
| radius-xl | 20px | 大卡片、模态框 |
| radius-full | 9999px | 圆形头像、药丸按钮 |

---

## Shadows / Elevation

| Level | Value | Usage |
|-------|-------|-------|
| shadow-sm | `0 1px 2px rgba(0,0,0,0.04)` | 轻微浮起 |
| shadow-md | `0 4px 12px rgba(0,0,0,0.06)` | 卡片阴影 |
| shadow-lg | `0 8px 24px rgba(0,0,0,0.08)` | 弹出层阴影 |
| shadow-xl | `0 12px 40px rgba(0,0,0,0.12)` | 浮层、Sheet |
| shadow-glass | `0 4px 16px rgba(0,0,0,0.08), inset 0 0 0 0.5px rgba(255,255,255,0.2)` | 毛玻璃元素专用 (含内边框高光) |

---

## Icons

- **Style:** SF Symbols 5 (iOS 原生)
- **Key Icons:**
  - Tab Bar: house.fill, pencil.line, bubble.left.fill, person.fill
  - Navigation: chevron.left, gearshape, ellipsis
  - Actions: heart, heart.fill, bookmark, bookmark.fill, star.fill, plus, arrow.up.right, arrow.down.right
  - Pet: pawprint.fill
  - Status: checkmark.circle.fill, exclamationmark.triangle.fill

---

## Components

### 1. Bottom Tab Bar (毛玻璃)
- **高度:** 83pt (含 safe area)
- **图标尺寸:** 24×24pt
- **标签:** caption-xxs, 居中
- **选中态:** primary 色图标 + primary 色文字
- **未选中态:** text-tertiary 色
- **背景:** `UIVisualEffectView` + `UIBlurEffect(.systemChromeMaterial)` (毛玻璃底)
- **边框:** 顶部 0.5pt separator, rgba(0,0,0,0.08)

### 2. Navigation Bar (毛玻璃)
- **高度:** 44pt (不含状态栏)
- **背景:** `UIVisualEffectView` + `UIBlurEffect(.systemMaterial)` (毛玻璃底, 滚动时自动增强模糊)
- **标题:** heading-lg, 居中, text-primary
- **返回按钮:** chevron.left + 文字, primary 色
- **右上角:** 图标按钮 (gearshape, ellipsis), text-secondary

### 3. User Profile Card
- **布局:** 头像 + 名字 + 宠物信息 + 按钮
- **头像:** 64×64pt, radius-full, 粉色系渐变背景 (#FFB5A7 → #FFCDB2)
- **名字:** heading-lg, Bold
- **宠物信息:** body-sm, text-secondary
- **编辑按钮:** "编辑资料", 药丸形, `.systemThinMaterial` 毛玻璃背景 + primary 边框 40% opacity + primary 文字, radius-full

### 4. Stats Row
- **布局:** 水平三列, 居中对齐
- **格式:** "数字\n标签"
- **数字:** heading-md, Bold, text-primary
- **标签:** caption-xs, text-tertiary
- **分隔:** 竖线或间距

### 5. Section Header
- **布局:** 左侧标题 + 右侧 "更多 >"
- **标题:** heading-lg, Bold
- **更多:** caption, text-secondary + chevron.right

### 6. Product Review Card (横向滚动)
- **尺寸:** 160×240pt (固定宽度)
- **圆角:** radius-lg (16px)
- **布局:** 顶部产品图 (160×140pt) + 下方信息区
- **图片区:** 浅色背景 (primary-light), 产品居中
- **信息区:** 白色背景, padding 10px
  - 产品名: body-sm, Bold, 单行省略
  - 价格标签: caption-xs, primary 色 (¥288/1.5kg)
  - 日期: caption-xxs, text-tertiary
  - 指标标签: 药丸形小标签
    - 正向 (绿色): "便便正常", "食欲佳"
    - 中性 (橙色): "轻微软便"
- **阴影:** shadow-md

### 7. Stash / Inventory Card (横向滚动)
- **尺寸:** 120×160pt (固定宽度)
- **圆角:** radius-lg
- **布局:** 产品图 + 产品名 + 品牌名
- **图片区:** 浅色背景, 120×120pt
- **信息区:** padding 8px
  - 产品名: caption, Bold, 单行省略
  - 品牌: caption-xs, text-tertiary

### 8. Review List Item
- **布局:** 顶部产品缩略图 (60×60pt, radius-md) + 右侧信息
- **产品名:** body-sm, Bold
- **摘要:** caption, text-secondary, 2行省略
- **底部元信息:** caption-xs, text-tertiary
  - 阅读量 (eye icon + 数字)
  - 点赞数 (heart icon + 数字)
  - 时间 ("3天前")

### 9. Tag / Badge
- **尺寸:** 高度 22pt, padding horizontal 8pt
- **圆角:** radius-xs (6px)
- **变体:**
  - success: success-bg 背景 + success 文字
  - warning: warning-bg 背景 + warning 文字
  - error: error-bg 背景 + error 文字
  - primary: primary-light 背景 + primary 文字

### 10. Button (毛玻璃风格)
所有按钮均采用 Apple 原生毛玻璃 (Frosted Glass / Vibrancy) 样式，圆角统一。

- **通用属性:**
  - **圆角:** radius-full (药丸形, 9999px)
  - **最小高度:** 44pt (iOS HIG 推荐的最小触控区域)
  - **内边距:** horizontal 20pt, vertical 12pt
  - **背景:** `UIVisualEffectView` + `UIBlurEffect(.systemMaterial)` (iOS 16+)
  - **字重:** Semibold (600)
  - **按压态:** opacity 0.7 + scale 0.97 (spring animation)

- **Primary:**
  - **背景:** primary (#F59E0B) 为主色半透明叠加毛玻璃底
    - 实现: `.systemMaterial` blur + 上层 primary 色 85% opacity 叠加
  - **文字:** text-inverse (#FFFFFF)
  - **边框:** 无

- **Secondary:**
  - **背景:** 毛玻璃透明底 (`.systemThinMaterial`)
  - **边框:** 1pt primary 色 40% opacity
  - **文字:** primary (#F59E0B)

- **Ghost / Tinted:**
  - **背景:** `.systemUltraThinMaterial` (极轻毛玻璃)
  - **边框:** 无
  - **文字:** primary (#F59E0B)

- **Tab Bar 按钮:**
  - **背景:** `.systemChromeMaterial` (系统标准毛玻璃)
  - **选中态图标:** primary 色
  - **未选中态图标:** text-tertiary

- **Floating Action Button (FAB):**
  - **尺寸:** 56×56pt, radius-full
  - **背景:** primary 色 + `.systemMaterial` blur 叠加
  - **图标:** plus, 24pt, 白色, 居中
  - **阴影:** shadow-lg
  - **位置:** 右下角, 距底部 Tab Bar 上方 16pt

- **Segmented Control / 筛选按钮组:**
  - **背景:** `.systemThinMaterial` 毛玻璃容器
  - **选中项:** primary 色背景胶囊, radius-full
  - **未选中项:** 透明
  - **文字:** 选中白色, 未选中 text-secondary

### 11. Search Bar
- **高度:** 36pt
- **圆角:** radius-full
- **背景:** `.systemUltraThinMaterial` 毛玻璃底
- **图标:** magnifyingglass, text-tertiary
- **占位符:** body-sm, text-tertiary

---

## Screens Overview

基于 Web 端全部功能，iOS App 需要以下界面：

### Tab 1: 首页 (Home)
- **1.1 首页** — 产品推荐流、热门产品、AI 智能推荐入口
- **1.2 产品列表** — 搜索 + 分类筛选 + 产品网格
- **1.3 产品详情** — 产品信息、成分、配方版本、评价列表、风险情报、时间线数据、收藏
- **1.4 产品评价提交** — 多步评价向导 (ReviewWizard)

### Tab 2: 记录 (Record)
- **2.1 我的宠物列表** — 宠物卡片网格 + 添加宠物
- **2.2 宠物详情** — 宠物档案、饮食日志、体重追踪、过敏管理、健康时间线、健康记录、食物历史、症状追踪、回购提醒
- **2.3 添加/编辑宠物** — 宠物信息表单 + 品种搜索
- **2.4 饮食日志** — 记录每日饮食
- **2.5 健康记录** — 体重、症状、诊断、药物、疫苗、体检

### Tab 3: AI 助手 (AI)
- **3.1 AI 智能推荐** — 选择宠物 + 输入需求 → 个性化产品推荐
- **3.2 成分分析** — 产品成分深度解读
- **3.3 产品对比** — 多产品横向对比
- **3.4 自由问答** — AI 健康聊天 (支持 Bearer token 鉴权)
- **3.5 长期追踪 (Followups)** — Day 7/30/90 追踪提醒列表 + 填写追踪表单

### Tab 4: 我的 (Profile)
- **4.1 个人主页** — 头像、昵称、宠物信息、关注/粉丝/获赞、编辑资料
- **4.2 我的记录** — 已提交评价列表 (横向滚动产品卡片)
- **4.3 我的粮仓** — 收藏的产品 (横向滚动卡片)
- **4.4 我的评价** — 评价列表 (含阅读量、点赞、时间)
- **4.5 通知中心** — 通知列表 + 已读/未读
- **4.6 收藏夹** — 收藏的产品网格
- **4.7 推荐反馈** — AI 推荐的接受/拒绝/点击历史
- **4.8 账号设置** — 邮箱、退出登录
- **4.9 消费者保护计划** — 功能介绍页

### Auth
- **5.1 登录** — 邮箱 + 密码
- **5.2 注册** — 邮箱 + 密码

### 公共
- **6.1 搜索** — 全局产品搜索

---

## Interaction Patterns

### Navigation
- **底部 Tab Bar:** 4个 Tab (首页、记录、AI 助手、我的)
- **页面跳转:** iOS 标准 push/pop
- **模态:** 评价提交、添加宠物、筛选器用 modal present
- **返回手势:** 支持左滑返回

### Loading
- **骨架屏:** 灰色渐变 shimmer 动画
- **下拉刷新:** iOS 标准 refresh control
- **加载更多:** 底部 spinner

### Empty State
- **图标 + 标题 + 描述 + CTA 按钮**
- **居中布局**

### Error State
- **Toast 提示** (顶部滑入, 3s 自动消失)
- **网络错误:** 居中重试按钮

### Haptic Feedback
- **按钮点击:** UIImpactFeedbackGenerator (.light)
- **收藏/点赞:** UIImpactFeedbackGenerator (.medium)
- **操作成功:** UINotificationFeedbackGenerator (.success)

---

## Motion / Animation

| 场景 | 动画 | 时长 | 曲线 |
|------|------|------|------|
| 页面转场 | push/pop (iOS 默认) | 350ms | easeInOut |
| Tab 切换 | 交叉淡入 | 200ms | easeOut |
| 卡片出现 | 从下向上 fade in + 20px translateY | 300ms | spring(0.8) |
| 收藏/点赞 | 心跳缩放 1.0→1.3→1.0 | 300ms | spring(0.6) |
| 数字变化 | 数字滚动 | 400ms | easeOut |
| 骨架屏 | shimmer 左→右 | 1500ms | linear, infinite |
| 下拉刷新 | iOS 默认弹性 | - | - |
| 横向滚动 | 惰性滚动 + snap | - | easeOut |

---

## API Endpoints (iOS 端复用)

iOS App 直接调用 Web 端已有的 API，鉴权统一使用 Bearer Token (Supabase Auth JWT)。

### 认证
- Supabase Auth: email + password (signIn / signUp / signOut)

### 宠物管理
- `GET /api/pets?petId=xxx` — 获取宠物详情
- `GET /api/pets/breeds?species=cat&q=xxx` — 品种搜索
- `POST /api/gateway/write` (type: CREATE_PET / UPDATE_PET / SOFT_DELETE_PET)

### 产品
- Supabase 直查: products, product_categories, product_ingredients, product_versions, product_images, product_tags
- `GET /api/products/[id]/timeline` — 产品时间线
- `GET /api/products/[id]/risk-intel` — 风险情报

### 评价
- Supabase 直查: product_reviews (insert / select)
- `POST /api/reviews/[id]/process-timeline` — 提交后触发时间线处理

### 追踪
- Supabase 直查: review_followup_schedules, review_followup_entries
- Supabase RPC: mark_followup_complete

### 收藏
- Supabase 直查: product_bookmarks

### 通知
- Supabase 直查: notifications (select / update is_read)

### AI
- `POST /api/ai/chat` — 健康问答 (Bearer token)
- `POST /api/recommend/outcome` — 结果导向推荐
- `POST /api/feedback` — 推荐反馈记录

### 健康数据
- `POST /api/gateway/write` (type: CREATE_DIET_LOG / UPDATE_PET_WEIGHT / CREATE_PET_ALLERGY / DELETE_PET_ALLERGY)
- `GET /api/analytics/[petId]/summary` — 健康摘要
- `GET /api/analytics/[petId]/trends` — 健康趋势

### 指标
- `POST /api/metrics` — 埋点上报

---

## Data Models (Key Types)

```typescript
// 宠物
interface Pet {
  id: string
  profile_id: string
  name: string
  species: 'cat' | 'dog' | 'other'
  breed: string | null
  age_years: number | null
  age_months: number | null
  gender: 'male' | 'female' | null
  weight_kg: number | null
  stomach_health: 'normal' | 'sensitive'
  photo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// 产品
interface Product {
  id: string
  name: string
  brand: string
  category_id: string | null
  description: string | null
  price_range: string | null
  country_of_origin: string | null
  species_target: string | null
  age_range: string | null
  image_url: string | null
  is_hot: boolean
}

// 评价
interface ProductReview {
  id: string
  product_id: string
  profile_id: string
  pet_id: string | null
  rating: number | null
  review_text: string | null
  usage_duration_days: number | null
  stool_score: number | null
  appetite_score: number | null
  coat_score: number | null
  energy_score: number | null
  would_repurchase: boolean | null
  created_at: string
}

// 通知
interface Notification {
  id: string
  profile_id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  link: string | null
  created_at: string
}

// 收藏
interface ProductBookmark {
  id: string
  profile_id: string
  product_id: string
  created_at: string
}
```

---

## Screen Generation Prompts

Below are the exact prompts for generating each screen. Reference images are provided separately: `logo.png`, `logodesign.png`, `个人资料参考图1.jpg`, `首页参考图2.jpg`.

---

### Screen 1: 个人主页 (我的 — Profile Tab)

Reference style from `个人资料参考图1.jpg`. This is the primary style anchor for the entire app.

```
Generate a mobile screen for "我的" (Profile/Me) tab page.

Reference style from the uploaded image "个人资料参考图1.jpg" — match its warm amber palette, card spacing, font hierarchy, and overall mood exactly.

Layout (top to bottom):

1. Navigation bar (frosted glass, .systemMaterial blur):
   - Left: title "我的" in heading-lg bold
   - Right: gearshape icon + ellipsis icon, text-secondary color

2. Profile section:
   - Circular avatar 64×64pt, warm gradient background (#FFB5A7 → #FFCDB2), initial letter "七" centered in white
   - Name: "小七妈咪", heading-lg bold, text-primary
   - Subtitle: "布偶猫 · 小七", body-sm, text-secondary

3. Edit Profile button (centered):
   - Pill shape (radius-full), frosted glass (.systemThinMaterial)
   - Amber border 1px at 40% opacity, primary text "编辑资料"

4. Stats row (three columns, centered, separated by thin dividers):
   - "128" + "关注" | "3.2k" + "粉丝" | "15.8k" + "获赞"
   - Numbers: heading-md bold text-primary; Labels: caption-xs text-tertiary

5. Section "我的记录":
   - Header: "我的记录" heading-lg bold on left, "更多 >" caption text-secondary with chevron.right on right
   - Horizontal scroll product review cards (show 2.5 visible):
     - Card size: 160×240pt, radius-lg (16px), shadow-md
     - Top: product image area 160×140pt on primary-light (#FEF3C7) background, product package centered
     - Bottom: white padding 10px
       - Product name: body-sm bold, single line ellipsis
       - Price: caption-xs, primary color "¥288/1.5kg"
       - Date: caption-xxs, text-tertiary "2024-12-20 开始使用"
       - Status pills: row of small rounded tags
         - Green (success-bg + success text): "便便正常"
         - Amber (warning-bg + warning text): "轻微软便"
         - Green: "食欲佳"
     - Specific cards to show:
       - Card 1: "GO! 九种肉全猫粮", ¥288/1.5kg, "便便改善↑", "食欲佳"
       - Card 2: "纽翠斯黑钻猫粮", ¥320/5kg, "轻微软便", "食欲佳"

6. Section "我的粮仓":
   - Same header pattern: "我的粮仓" + "更多 >"
   - Horizontal scroll smaller cards (show 3 visible):
     - Card size: 120×160pt, radius-lg
     - Top: product image 120×120pt, light background
     - Bottom: padding 8px
       - Product name: caption bold, single line ellipsis
       - Brand: caption-xs, text-tertiary
     - Cards: "渴望六种鱼", "GO! 九种肉", "百利高蛋白"

7. Section "我的评价":
   - Same header pattern: "我的评价" + "更多 >"
   - Review list items (vertical):
     - Layout: left 60×60pt rounded thumbnail (radius-md) + right info
     - Product name: body-sm bold
     - Summary: caption text-secondary, 2 lines max with ellipsis "布偶猫换粮记录：从渴望换到GO! 九种肉，两周过渡期..."
     - Bottom meta row: eye icon + "1,203" views, heart icon + "89" likes, "3天前" timestamp
     - All meta in caption-xs text-tertiary

Bottom tab bar (frosted glass, .systemChromeMaterial):
- 4 tabs: 首页 (house.fill), 记录 (pencil.line), AI助手 (sparkles), 我的 (person.fill)
- "我的" tab active: primary color icon + text
- Others: text-tertiary
```

---

### Screen 2: 首页 (Home Tab)

Reference style from `首页参考图2.jpg`.

```
Generate a mobile screen for "首页" (Home) tab.

Reference style from the uploaded image "首页参考图2.jpg" — match its layout structure, card style, and warm amber tone.

Layout (top to bottom):

1. Frosted glass navigation bar (.systemMaterial):
   - Left: app logo (pawprint.fill icon + "PetRWD" in primary color)
   - Right: magnifyingglass icon + bell icon (text-secondary)

2. Hero banner card (full width minus 32px margin):
   - Rounded 20px, gradient background from #FEF3C7 to #FDE68A
   - Headline: "让每一次选择都值得信赖", display-md bold
   - Subtitle: "基于真实长期追踪数据的宠物食品推荐", body-sm text-secondary
   - CTA button: "开始探索", pill shape, white background, primary text, shadow-sm

3. Section "热门猫粮":
   - Header: "热门猫粮" heading-lg bold + "查看全部 >" link
   - Horizontal scroll large product cards (show 1.5 visible):
     - Card: 200×280pt, radius-xl (20px), shadow-md, white background
     - Product image area: 200×180pt, primary-light background, product centered
     - Info: padding 12px
       - Brand: caption-xs text-tertiary "渴望"
       - Name: body-md bold "六种鱼全猫粮"
       - Row: star.rating (5 amber stars) + "4.8" + "(2,847评价)" caption-xs
       - Price: body-md bold primary "¥420/5.4kg"

4. Section "AI 智能推荐":
   - Card with amber gradient border (1px primary at 20%), primary/5 background
   - Icon: sparkles in primary color
   - Title: "AI 智能推荐" heading-md bold
   - Description: "基于你的宠物档案，为你精准匹配最适合的猫粮", body-sm text-secondary
   - Button: "获取推荐" amber pill button (primary bg, white text)

5. Section "社区最新评价":
   - List of review preview items:
   - Each item: white card, radius-lg, padding 16px
     - Top row: 32pt circular avatar + username "布偶猫家长小王" + time "2小时前" right-aligned
     - Content: review excerpt 2 lines, body-sm
     - Bottom row: product pill tag (primary-light bg) "GO! 九种肉" + heart icon "42"

Bottom tab bar (frosted glass):
- "首页" tab active
```

---

### Screen 3: 产品列表 (Product List)

```
Generate a mobile screen for "产品列表" (Product Library).

Layout (top to bottom):

1. Navigation bar (frosted glass): back chevron + "猫粮大全" centered title

2. Search bar (16px horizontal margin):
   - Pill shape (radius-full), 36pt height
   - Background: .systemUltraThinMaterial frosted glass
   - magnifyingglass icon left + placeholder "搜索产品名、品牌、成分..." text-tertiary

3. Category filter pills (horizontal scroll, 16px margin):
   - Pills: radius-full, height 28pt, padding horizontal 14pt
   - "全部" selected: primary bg + white text
   - Others unselected: white bg + text-secondary + subtle border
   - Categories: 全部, 干粮, 湿粮, 零食, 保健品, 处方粮

4. Sort bar: "综合排序 ▾" left + grid/list toggle icon right, caption text-secondary

5. Product grid (2 columns, 12px gap, 16px margin):
   - Each card: white bg, radius-lg, shadow-sm
   - Product image: aspect ratio 1:1, light bg, product centered, radius-md top corners
   - Info: padding 10px
     - Brand: caption-xs text-tertiary
     - Name: body-sm bold, single line ellipsis
     - Star row: amber stars + "4.6" + "(1.2k)"
     - Price: body-sm bold primary "¥288"
     - Species badges row: small pills "🐱 全猫种"

Bottom tab bar: frosted glass, "首页" active.
```

---

### Screen 4: 产品详情 (Product Detail)

```
Generate a mobile screen for "产品详情" (Product Detail) — scrollable.

Layout (top to bottom):

1. Navigation bar (frosted glass): back chevron + product name (truncated) + share icon + heart (bookmark) icon

2. Product hero section (white card):
   - Large product image centered, 240×240pt, primary-light background
   - Category pill top-left: "干粮" primary-light bg + primary text
   - Brand: "渴望 ORIJEN", caption text-secondary
   - Name: "六种鱼全猫粮", display-md bold
   - Description: body-sm text-secondary, 2 lines

3. Metadata chips row (horizontal wrap):
   - Pills: "¥420/5.4kg" (primary bg), "加拿大进口" (outline), "全猫种" (outline), "全阶段" (outline)
   - Each pill: radius-full, height 26pt

4. Action buttons row (horizontal, equal width):
   - "写评价" button: primary bg, white text, pill, 44pt height
   - "收藏" button: frosted glass (.systemThinMaterial), primary border, primary text, pill

5. Tab segmented control (frosted glass container):
   - Tabs: "详情", "成分", "配方版本", "评价", "风险情报"
   - Selected: primary bg capsule, white text
   - Unselected: transparent, text-secondary

6. [Active tab: "评价"]:
   - Rating summary card: "4.8" large bold + star row + "(2,847条评价)"
   - Rating distribution bars (5-star to 1-star, each with amber fill bar)
   - Review list:
     - Each review: user avatar 36pt circle + username + star rating
     - Usage duration tag: "使用 90 天" primary-light pill
     - Health badges: "便便正常 ✓" green, "食欲佳 ✓" green
     - Review text: body-sm, 3 lines max
     - Bottom: heart + "42" | "3天前"

Bottom tab bar: frosted glass.
```

---

### Screen 5: 我的宠物列表 (My Pets)

```
Generate a mobile screen for "我的宠物" (My Pets).

Layout:

1. Navigation bar (frosted glass): back chevron + "我的宠物" title + "⊕" add button (primary color circle)

2. Pet cards grid (2 columns, 12px gap, 16px margin):
   - Each card: white bg, radius-lg, shadow-sm, padding 16px
   - Pet photo: 80×80pt circle, centered, gradient bg (#FFB5A7 → #FFCDB2) if no photo, or actual photo
   - Name: heading-md bold, centered
   - Breed: body-sm text-secondary, centered
   - Age: caption text-tertiary "2岁3个月"
   - Badges row (centered):
     - Life stage: "成猫" success-bg + success text pill
     - Stomach: "肠胃敏感" warning-bg + warning text pill (only if sensitive)
   - Species icon: 🐱 top-right corner of card

3. Empty state (alternate version):
   - Icon: pawprint.fill, 64pt, primary/30 color
   - Title: "还没有添加宠物", heading-md bold
   - Description: "添加你的第一只宠物开始记录健康数据", body-sm text-secondary
   - CTA: "添加宠物" primary pill button

Bottom tab bar: frosted glass, "记录" active.
```

---

### Screen 6: 宠物详情 (Pet Detail)

```
Generate a mobile screen for "宠物详情" (Pet Detail) — scrollable with tab sections.

Layout:

1. Navigation bar (frosted glass): back chevron + "小七" + pencil.edit icon

2. Pet header (white card, radius-xl, margin 16px):
   - Circular photo 80pt, centered, with amber ring
   - Name: "小七", display-md bold, centered
   - Breed: "布偶猫", body-sm text-secondary
   - Info grid (2×2): "年龄: 2岁3个月", "体重: 4.5kg", "性别: ♀ 母", "绝育: 已绝育"
   - Badges: "成猫" green pill, "肠胃敏感" amber pill

3. Segmented tabs (frosted glass, horizontal scroll):
   - Tabs: 概况, 饮食日志, 体重, 过敏, 健康时间线, 健康记录, 食物历史, 症状
   - Selected: primary bg capsule

4. [Active: "概况"]:
   a. Health metrics row (4 tiles, horizontal):
      - Each tile: white card, radius-md
        - Icon (24pt) + label (caption-xs)
        - Value: heading-md bold (e.g. "4.5kg", "正常", "正常", "活跃")
        - Trend: arrow.up.right green or arrow.down.right red + percentage
      - Tiles: 体重, 食欲, 便便, 活力

   b. Section "最近饮食记录":
      - List items: date caption + food name body-sm + amount caption-xs
      - "查看全部 >" link

   c. Section "体重趋势":
      - Simple line chart placeholder, 7 data points, amber line
      - Current: "4.5kg", range: "4.2 - 4.8kg"

5. FAB button (bottom-right):
   - 56×56pt circle, primary bg + frosted glass overlay
   - Plus icon, white, 24pt
   - shadow-lg, positioned 16pt above tab bar

Bottom tab bar: frosted glass, "记录" active.
```

---

### Screen 7: 添加宠物 (Add Pet Form)

```
Generate a mobile screen for "添加宠物" (Add Pet) form.

Layout:

1. Navigation bar: "取消" text button (gray) left + "添加宠物" title center + "保存" text button (amber) right

2. Photo upload (centered, 24px margin top):
   - Circle 100pt, dashed border 2px primary color
   - Camera icon + "添加照片" caption primary text, centered inside

3. Form card (white, radius-xl, 16px margin):
   a. "宠物名称" label + text input placeholder "例如：小七"
   b. "物种" label + segmented control: 猫 / 狗 / 其他
      - Selected: primary bg, white text, pill
      - Unselected: bg-primary, text-secondary
   c. "品种" label + searchable dropdown field: "搜索品种..." with magnifyingglass icon, chevron.down right
   d. "性别" label + segmented control: ♂ 公 / ♀ 母 / 未知
   e. "年龄" label + two inputs side by side: "X 年" + "X 月"
   f. "体重(kg)" label + number input with "kg" suffix
   g. "是否绝育" label + iOS-style toggle switch (amber when on)
   h. "肠胃状况" label + segmented control: 正常 / 敏感

4. Bottom: "保存" full-width primary pill button, 44pt height, 16px margin
```

---

### Screen 8: AI 智能推荐 (AI Recommendation)

```
Generate a mobile screen for "AI 智能推荐" (AI Smart Recommendation).

Layout:

1. Navigation bar (frosted glass): back chevron + "AI 智能推荐" + sparkles icon

2. Input card (16px margin, amber gradient border 1px):
   - "选择宠物" label + dropdown: "小七 · 布偶猫 · 肠胃敏感" with pawprint icon
   - "需求描述" label + multi-line text area placeholder "例如：布偶猫长期软便、低敏幼猫粮、性价比高..."
   - "获取智能推荐" full-width primary pill button with sparkles icon

3. Results section (below input, after "submission"):

   a. Summary banner (primary/5 bg, radius-lg):
      - "基于 2,847 条长期追踪数据" body-sm
      - "为小七推荐以下产品" heading-md bold

   b. Pet context chips row:
      - "布偶猫" "2岁" "肠胃敏感" — each in primary-light pill

   c. Recommendation cards (vertical list, 3 cards):
      - Each card: white, radius-lg, shadow-md, padding 16px
      - Left: product image 60×60pt rounded
      - Right: product name bold + brand caption
      - Overall score: amber progress bar with "92 分" label
      - Dimension bars (smaller):
        - 肠胃匹配: 92% amber bar
        - 便便安全: 88% amber bar
        - 长期稳定: 85% amber bar
        - 回购率: 78% amber bar
      - Confidence badge: "高置信度" green pill
      - "查看详情 >" link

   d. Risk warnings panel (amber border card):
      - exclamationmark.triangle icon + "风险提示"
      - "以下产品近期有配方变更，请留意" caption

Bottom tab bar: frosted glass, "AI助手" active.
```

---

### Screen 9: AI 健康问答 (AI Chat)

```
Generate a mobile screen for "AI 健康问答" (AI Health Chat).

Layout:

1. Navigation bar (frosted glass): back chevron + "AI 健康问答" + pet selector "小七 ▾"

2. Chat area (scrollable, flex-grow):
   - Message 1 (AI, left-aligned):
     - White bubble, radius-lg, max-width 80%
     - "你好！我是小七的健康助手 🐱 有什么关于小七饮食或健康的问题吗？"

   - Message 2 (User, right-aligned):
     - Primary bg (#F59E0B), white text bubble, radius-lg, max-width 80%
     - "小七最近换了GO!猫粮后有点软便，正常吗？"

   - Message 3 (AI, left-aligned):
     - White bubble with longer content:
     - "换粮后出现软便比较常见，通常需要7-14天过渡期。建议：\n\n• 第1-3天：新粮25% + 旧粮75%\n• 第4-7天：各50%\n• 第8-14天：新粮75% + 旧粮25%\n\n⚠️ 如果14天后仍软便，建议咨询兽医。"
     - Risk badge: "风险等级: 低" green pill below message

   - Suggestion chips (horizontal, below AI bubble):
     - "查看饮食记录" "推荐替代猫粮" "记录症状" — each in outline pill

3. Input bar (fixed bottom, above tab bar):
   - Frosted glass background (.systemMaterial)
   - Text field: "输入问题..." with rounded border
   - Send button: primary color circle with arrow.up icon

Bottom tab bar: frosted glass, "AI助手" active.
```

---

### Screen 10: 登录 (Login)

```
Generate a mobile screen for "登录" (Login) page. Clean, centered layout.

Layout (vertically centered):

1. App logo (centered):
   - Pawprint icon 48pt in primary color
   - "PetRWD" display-md bold below

2. Title: "欢迎回来" display-lg bold, centered
3. Subtitle: "登录你的账号" body-md text-secondary, centered

4. Form card (white, radius-xl, 16px margin):
   a. Email field: envelope icon left + "邮箱地址" placeholder input
   b. Password field: lock icon left + "密码" placeholder + eye.slash icon right (toggle visibility)

5. "登录" full-width primary pill button, 44pt

6. "忘记密码?" link: caption, primary color, centered

7. Divider: "—— 或 ——" caption text-tertiary, centered with horizontal lines

8. Bottom: "还没有账号？" body-sm text-secondary + "注册" primary link
```

---

### Screen 11: 注册 (Sign Up)

```
Generate a mobile screen for "注册" (Sign Up) page.

Layout (vertically centered):

1. App logo: pawprint icon + "PetRWD"

2. Title: "创建账号" display-lg bold
3. Subtitle: "开始记录真实的宠物食品反馈" body-md text-secondary

4. Form card (white, radius-xl):
   a. "昵称" field: person icon + placeholder "你的昵称"
   b. "邮箱" field: envelope icon + placeholder "邮箱地址"
   c. "密码" field: lock icon + placeholder "至少8位" + eye icon
   d. "确认密码" field: lock icon + placeholder "再次输入密码"

5. "注册" full-width primary pill button, 44pt

6. Bottom: "已有账号？" body-sm + "登录" primary link
```

---

### Screen 12: 通知中心 (Notifications)

```
Generate a mobile screen for "通知中心" (Notification Center).

Layout:

1. Navigation bar (frosted glass): back chevron + "通知中心" + "全部已读" text button (amber)

2. Unread badge: "3 条未读" primary-light pill, 16px margin

3. Notification list (vertical, 12px gap):
   - Unread item (white card, radius-lg, amber left border 3px):
     - Icon circle (28pt) left: e.g. clock.fill for followup, heart.fill for like
     - Title: body-sm bold "Day 30 追踪提醒"
     - Body: caption text-secondary "GO! 九种肉全猫粮的30天追踪问卷已到期"
     - Time: caption-xs text-tertiary "2小时前"
   - Read item (white card, radius-lg, no left border):
     - Same layout but dimmed opacity (0.7)
     - Title: "小王 赞了你的评价"
     - Time: "1天前"

4. Empty state (alternate):
   - Bell icon 64pt, text-tertiary
   - "暂无通知" heading-md bold
   - "新的追踪提醒和互动通知会在这里显示" body-sm text-secondary
```

---

### Screen 13: 账号设置 (Settings)

```
Generate a mobile screen for "账号设置" (Account Settings). iOS Settings style.

Layout:

1. Navigation bar (frosted glass): back chevron + "账号设置"

2. Profile summary card (white, radius-xl, 16px margin):
   - Avatar 56pt circle + name "小七妈咪" bold + email "user@example.com" caption text-secondary
   - Chevron right

3. Settings groups (white rounded cards, 12px gap):

   Group "账号":
   - Row: "邮箱地址" label + "user@example.com" value + chevron
   - Row: "修改密码" label + chevron

   Group "通知":
   - Row: "推送通知" + toggle switch (amber when on)
   - Row: "新评价提醒" + toggle switch
   - Row: "追踪提醒" + toggle switch

   Group "隐私与安全":
   - Row: "隐私政策" + chevron
   - Row: "用户协议" + chevron

   Group "关于":
   - Row: "消费者保护计划" + chevron
   - Row: "关于 PetRWD" + chevron
   - Row: "当前版本" + "v1.0.0" text-tertiary

4. "退出登录" button: error color text, centered, in white card, 16px margin
```

---

### Screen 14: 消费者保护计划 (Protection Plan)

```
Generate a mobile screen for "消费者保护计划" (Consumer Protection Plan).

Layout (scrollable):

1. Navigation bar (frosted glass): back chevron + "保护计划"

2. Hero section (centered):
   - Shield icon 48pt in amber circle with primary/10 bg
   - Title: "消费者保护计划" display-md bold
   - Subtitle: "通过多重机制保护消费者权益" body-sm text-secondary

3. Features grid (2 columns, 12px gap, 16px margin):
   - Card 1: alerttriangle icon + "风险预警系统" + green pill "已上线" + description caption
   - Card 2: clock icon + "长期追踪机制" + green pill "已上线"
   - Card 3: filecheck icon + "凭证验证体系" + amber pill "开发中"
   - Card 4: users icon + "可信用户等级" + green pill "已上线"
   - Card 5: bell icon + "配方变更追踪" + amber pill "开发中"
   - Card 6: shield icon + "产品透明度指数" + gray pill "规划中"
   - Each card: white bg, radius-lg, padding 16px

4. Principles section:
   - Title: "我们的原则" heading-lg bold, centered
   - 3 principle cards (horizontal list or vertical):
     - "不做官方定性" + barchart icon + description
     - "严格打击水军" + ban icon + description
     - "保护用户隐私" + lock icon + description
   - Each: white card, radius-lg, icon in primary/10 circle

5. CTA: "加入保护计划" full-width primary pill button, 16px margin
```
