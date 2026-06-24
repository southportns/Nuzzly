# Pet Social Platform - Design System

## 设计理念 / Design Philosophy

温暖、友好、可爱的宠物社交平台设计风格。采用柔和的暖色调、圆润的造型语言和富有亲和力的插画，营造轻松愉悦的用户体验。

---

## 1. 色彩系统 / Color Palette

### 主色调 / Primary Colors

| 名称 | 色值 | 用途 |
|------|------|------|
| **暖米白** Background | `#F5F0EB` | 页面主背景色 |
| **深棕** Primary Brown | `#8B6F4E` | 主按钮、重要操作 |
| **浅棕** Light Brown | `#C4A882` | 卡片背景、次要元素 |
| **焦糖棕** Caramel | `#B8956A` | 装饰性卡片、标签 |
| **纯白** White | `#FFFFFF` | 卡片、按钮、输入框 |

### 辅助色 / Secondary Colors

| 名称 | 色值 | 用途 |
|------|------|------|
| **暖灰** Warm Gray | `#E8E0D8` | 次要背景、分割线 |
| **深灰** Dark Gray | `#2D2D2D` | 主要文字 |
| **中灰** Medium Gray | `#6B6B6B` | 次要文字、标签 |
| **浅灰** Light Gray | `#B0A898` | 占位符、禁用状态 |
| **健康绿** Health Green | `#4CAF50` | 正常状态、成功提示 |
| **活力橙** Accent Orange | `#E8A87C` | 强调、提醒 |

### 渐变 / Gradients

```css
/* 卡片背景渐变 */
background: linear-gradient(135deg, #FFFFFF 0%, #F5F0EB 100%);

/* 品牌水印渐变 */
background: linear-gradient(135deg, #E8DDD0 0%, #D4C4B0 100%);
opacity: 0.3;
```

---

## 2. 字体系统 / Typography

### 字体选择

- **中文**: `"PingFang SC"`, `"Hiragino Sans GB"`, `"Microsoft YaHei"`, sans-serif
- **英文/数字**: `"SF Pro Display"`, `"Helvetica Neue"`, sans-serif
- **品牌字**: 自定义圆体或使用 `"Nunito"` (可爱风格)

### 字号层级

| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 | 28-32px | Bold (700) | 页面标题、问候语 |
| H2 | 22-24px | Bold (700) | 卡片标题、数据展示 |
| H3 | 18-20px | SemiBold (600) | 区块标题 |
| Body | 16px | Regular (400) | 正文内容 |
| Caption | 14px | Regular (400) | 辅助说明文字 |
| Small | 12px | Regular (400) | 标签、时间戳 |
| Display | 48-56px | Bold (700) | 大数字展示 (如健康分) |

### 文字颜色

```css
/* 主要文字 */
color: #2D2D2D;

/* 次要文字 */
color: #6B6B6B;

/* 辅助文字 */
color: #B0A898;

/* 品牌水印 */
color: #D4C4B0;
opacity: 0.4;
```

---

## 3. 圆角系统 / Border Radius

采用大圆角设计，营造柔和友好的视觉感受。

| 名称 | 圆角值 | 用途 |
|------|--------|------|
| Small | 8px | 小按钮、标签 |
| Medium | 12px | 输入框、小卡片 |
| Large | 16px | 中等卡片 |
| XLarge | 20-24px | 主要卡片、面板 |
| Full | 50% | 圆形头像、图标按钮 |

```css
/* 卡片圆角 */
border-radius: 20px;

/* 按钮圆角 */
border-radius: 12px;

/* 头像圆角 */
border-radius: 50%;
```

---

## 4. 间距系统 / Spacing

基于 4px 网格的间距系统。

| 名称 | 值 | 用途 |
|------|-----|------|
| xs | 4px | 紧凑间距 |
| sm | 8px | 元素内间距 |
| md | 12px | 组件内间距 |
| lg | 16px | 卡片内间距 |
| xl | 20px | 区块间距 |
| xxl | 24-32px | 页面边距、大区块间距 |
| xxxl | 40-48px | 页面顶部/底部留白 |

---

## 5. 组件设计规范 / Component Specifications

### 5.1 顶部导航栏 / Top Navigation Bar

```
高度: 56-64px
背景: 透明或与页面背景一致
左侧: 用户头像 (40x40px 圆形)
右侧: 功能图标 (24x24px)
内边距: horizontal 20px
```

**图标按钮样式:**
```css
width: 44px;
height: 44px;
border-radius: 50%;
background: #FFFFFF;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
```

### 5.2 问候语区域 / Greeting Section

```
问候语: "下午好，"
用户名: "陈家军"
字号: 28-32px Bold
颜色: #2D2D2D
品牌水印: "aiMomo" 浅色叠加
位置: 左对齐，顶部留白 20px
```

### 5.3 快捷操作按钮 / Quick Action Buttons

```
排列: 水平排列，间距 12px
按钮尺寸: 48-52px 圆形
背景: #FFFFFF
阴影: 0 2px 8px rgba(0, 0, 0, 0.06)
图标: 24px，颜色 #2D2D2D
```

### 5.4 健康卡片 / Health Card

```
尺寸: 全宽，高度约 200-240px
背景: #FFFFFF 或渐变
圆角: 20-24px
内边距: 20px
阴影: 0 4px 16px rgba(0, 0, 0, 0.08)

布局:
┌─────────────────────────────────┐
│  今日健康分                        │
│  100%  (Display字号)              │
│  正常  (绿色标签)                  │
│                                   │
│  [和我聊聊] 按钮                    │
│                          🐱 插画  │
└─────────────────────────────────┘
```

**CTA 按钮:**
```css
background: #8B6F4E;
color: #FFFFFF;
padding: 12px 32px;
border-radius: 24px;
font-size: 16px;
font-weight: 600;
```

### 5.5 功能卡片网格 / Feature Card Grid

```
布局: 2列等宽网格
间距: 12-16px
卡片高度: 自适应，建议 min-height 160px
圆角: 16-20px
```

**卡片类型:**

1. **数据卡片** (如"今日体重")
   - 背景: #FFFFFF
   - 图标: 圆形，带单位标签
   - 数值: 大号字体展示
   - 操作: 文字链接 "更新数据"

2. **功能卡片** (如"养宠日记")
   - 背景: #C4A882 或 #B8956A
   - 文字: 白色
   - 图标: 白色线条图标
   - 箭头: 指示可进入

### 5.6 底部标签栏 / Bottom Tab Bar

```
高度: 64px (含安全区域)
背景: 毛玻璃效果或半透明白色
图标尺寸: 24px
标签字号: 10-12px
选中状态: 深色圆形背景包裹图标
```

```css
/* 底部栏背景 */
background: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(20px);

/* 选中图标 */
width: 48px;
height: 48px;
border-radius: 50%;
background: #2D2D2D;
color: #FFFFFF;
```

### 5.7 个人主页 / Profile Page

**用户信息区:**
```
头像: 100-120px 圆形，白色边框 4px
用户名: 24-28px Bold
用户ID: 14px 灰色
统计数据: 4列等分
  - 获赞 / 好友 / 粉丝 / 关注
  - 数值: 20px Bold
  - 标签: 12px 灰色
```

**操作按钮:**
```
"编辑资料": 
  background: #8B6F4E;
  width: 60%;
  height: 48px;
  border-radius: 24px;

"设置":
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #E8E0D8;
```

### 5.8 功能入口卡片 / Feature Entry Cards

```
"更多玩法" 区域:
- 分割线 + 文字居中
- 两列卡片布局
- 卡片背景: 白色
- 圆角: 16px
- 内容: 标题 + 描述 + 插画
- 插画: 右下角或右侧
```

---

## 6. 图标规范 / Icon Guidelines

### 风格

- 线条图标为主 (Line Icons)
- 线宽: 1.5-2px
- 圆角: 圆润处理
- 颜色: #2D2D2D (默认), #FFFFFF (反色)

### 必要图标

| 图标 | 用途 | 描述 |
|------|------|------|
| 🔍 搜索 | 搜索功能 | 放大镜，线条风格 |
| ➕ 添加 | 新增内容 | 圆形内加号 |
| 🤖 AI | AI 功能 | "AI" 文字或机器人图标 |
| 🔔 通知 | 消息提醒 | 铃铛图标 |
| 🏠 首页 | 主页 | 房屋轮廓 |
| 📍 位置 | 地图/位置 | 定位标记 |
| 🧭 发现 | 探索 | 指南针 |
| 👤 我的 | 个人中心 | 人形轮廓 |
| ⚙️ 设置 | 设置页 | 齿轮图标 |
| 📝 编辑 | 编辑资料 | 铅笔图标 |

---

## 7. 插画与图片规范 / Illustrations & Images

### 宠物插画风格

- **风格**: 3D 渲染风格，可爱卡通
- **特点**: 大眼睛、圆润造型、温暖色调
- **背景**: 透明或与卡片融合
- **尺寸**: 根据场景，建议 200-400px

### 用户头像风格

- **风格**: 扁平化卡通插画
- **背景**: 纯色 (如 #4CAF50 绿色)
- **形象**: 简化的宠物/人物形象
- **边框**: 白色 3-4px (可选)

### 图片处理

```css
/* 圆形头像 */
border-radius: 50%;
object-fit: cover;

/* 卡片图片 */
border-radius: 16px;
object-fit: cover;

/* 模糊背景效果 */
filter: blur(20px);
opacity: 0.6;
```

---

## 8. 动效规范 / Animation Guidelines

### 过渡动画

```css
/* 通用过渡 */
transition: all 0.3s ease;

/* 按钮点击 */
transform: scale(0.96);

/* 卡片出现 */
animation: fadeInUp 0.4s ease;
```

### 推荐动效

1. **页面切换**: 左右滑动，300ms
2. **卡片加载**: 从下方淡入，400ms
3. **按钮反馈**: 缩放 0.96，150ms
4. **列表项**: 依次淡入，间隔 50ms
5. **Tab 切换**: 图标弹跳效果

---

## 9. 页面布局参考 / Page Layouts

### 9.1 首页 (Home)

```
┌─────────────────────────────────┐
│ [头像]              [🔔] [➕]   │  <- 顶部栏
│                                  │
│ 下午好，                          │  <- 问候语
│ 陈家军                aiMomo水印  │
│                                  │
│ [🔍] [➕] [AI]                  │  <- 快捷按钮
│                                  │
│ ┌─────────────────────────────┐ │
│ │ 今日健康分                    │ │  <- 健康卡片
│ │ 100%                        │ │
│ │ 正常                         │ │
│ │ [和我聊聊]           🐱      │ │
│ └─────────────────────────────┘ │
│                                  │
│ ──────── 拖拽指示器 ────────     │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │ 今日体重  │ │ 养宠日记  │      │  <- 功能卡片
│ │ 0.96KG   │ │          │      │
│ │ 更新数据  │ │    ➚     │      │
│ └──────────┘ └──────────┘      │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │ 宠物年龄  │ │ 今日饮食  │      │
│ │ ...      │ │ ...      │      │
│ └──────────┘ └──────────┘      │
│                                  │
│ ══════════════════════════════  │  <- 底部导航
│ [🏠] [🤖] [📍] [🧭] [👤]      │
└─────────────────────────────────┘
```

### 9.2 个人主页 (Profile)

```
┌─────────────────────────────────┐
│ 15:34           📶 🔋66%        │  <- 状态栏
│                                  │
│         ┌─────────┐             │
│         │   🐱    │             │  <- 宠物大图
│         │  (大图)  │             │
│         └─────────┘             │
│              ┌─────────┐        │
│              │   🐕    │        │  <- 用户头像
│              │ (大头像) │        │
│              └─────────┘        │
│                                  │
│          陈家军                  │  <- 用户名
│          @165507                 │  <- 用户ID
│                                  │
│  获赞    好友    粉丝    关注     │  <- 统计数据
│   0      0       0       0      │
│                                  │
│ ┌────────────────┐ ┌──┐        │
│ │    编辑资料     │ │⚙️│        │  <- 操作按钮
│ └────────────────┘ └──┘        │
│                                  │
│ ────── 更多玩法 ──────          │
│                                  │
│ ┌──────────┐ ┌──────────┐      │
│ │ 美食记录  │ │  表情包   │      │  <- 功能入口
│ │ 用AI生成  │ │ 定制宠物  │      │
│ │ 宠物美食  │ │ 专属表情  │      │
│ └──────────┘ └──────────┘      │
│                                  │
│ ══════════════════════════════  │
│ [🏠] [🤖] [📍] [🧭] [👤]      │
└─────────────────────────────────┘
```

---

## 10. 代码实现参考 / Implementation Reference

### CSS Variables

```css
:root {
  /* Colors */
  --color-bg: #F5F0EB;
  --color-primary: #8B6F4E;
  --color-secondary: #C4A882;
  --color-accent: #B8956A;
  --color-white: #FFFFFF;
  --color-warm-gray: #E8E0D8;
  --color-text-primary: #2D2D2D;
  --color-text-secondary: #6B6B6B;
  --color-text-muted: #B0A898;
  --color-success: #4CAF50;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-xxl: 24px;
  --radius-full: 50%;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-xxl: 24px;
  --spacing-xxxl: 32px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  
  /* Typography */
  --font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-xxl: 24px;
  --font-size-display: 48px;
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'pet-bg': '#F5F0EB',
        'pet-primary': '#8B6F4E',
        'pet-secondary': '#C4A882',
        'pet-accent': '#B8956A',
        'pet-warm-gray': '#E8E0D8',
        'pet-success': '#4CAF50',
      },
      borderRadius: {
        'pet-sm': '8px',
        'pet-md': '12px',
        'pet-lg': '16px',
        'pet-xl': '20px',
        'pet-2xl': '24px',
      },
      boxShadow: {
        'pet-sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'pet-md': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'pet-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
    },
  },
}
```

---

## 11. 设计检查清单 / Design Checklist

- [ ] 所有颜色使用设计系统定义的色值
- [ ] 圆角遵循圆角系统规范
- [ ] 间距使用 4px 网格对齐
- [ ] 字体层级清晰，对比度足够
- [ ] 图标风格统一 (线条、圆角)
- [ ] 插画风格一致 (3D 可爱风格)
- [ ] 按钮有明确的点击反馈
- [ ] 页面切换有流畅的过渡动画
- [ ] 底部导航栏有毛玻璃效果
- [ ] 卡片有适当的阴影层次
- [ ] 空状态有友好的插画提示
- [ ] 加载状态有骨架屏或 loading 动画

---

## 12. 参考资源 / References

- 主色调灵感: 咖啡、奶茶、木质等温暖材质
- 插画风格: 参考 iOS 宠物类 App 的 3D 卡通风格
- 交互模式: 参考 iOS Human Interface Guidelines
- 卡片设计: 参考 Notion、Apple Health 的数据卡片

---

*最后更新: 2024年*
*版本: 1.0*
