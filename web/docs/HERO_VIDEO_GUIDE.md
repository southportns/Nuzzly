# 毛球镇 3D Hero 视频界面使用指南

## 功能概述

已完成 Nuzzly 毛球镇 web 端 Hero 界面的开发，支持 3D 视频背景播放。

### ✅ 已实现功能

1. **视频背景支持**
   - 自动播放、循环、静音
   - 支持 16:9 横屏比例
   - 0.8x 播放速度（更平滑的镜头运动）
   - 视频加载失败时自动降级到静态图片

2. **视差滚动效果**
   - 使用 Motion `useScroll` 实现滚动视差
   - 视频背景随页面滚动轻微下移

3. **GSAP 入场动画**
   - 标签淡入上移
   - 标题分阶段入场
   - 副标题延迟出现
   - CTA 按钮缩放淡入
   - 浮动数据卡片从右侧滑入

4. **环境氛围动画**
   - 🌸 飘落的花瓣动画（GSAP timeline）
   - 🐱 浮动宠物角色（无限循环上下浮动）
   - 渐变叠加层增强文字可读性

5. **场景地点标签**
   - Nuzzly Café
   - 宠物医院
   - 公告栏
   - 用品店

6. **响应式设计**
   - 移动端 / 桌面端适配
   - Tailwind CSS 响应式断点

---

## 视频集成说明

### 视频文件位置

将生成好的视频文件放置在：

```
web/public/nuzzly-town.mp4
```

### 视频规范建议

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| **分辨率** | 1920 × 1080 (1080p) | 或更高的 2560 × 1440 |
| **时长** | 10-15 秒 | 循环播放 |
| **码率** | 5-8 Mbps | 平衡画质与加载速度 |
| **格式** | MP4 (H.264) | 浏览器兼容性最好 |
| **帧率** | 30 fps | 平滑动画 |
| **文件大小** | < 10MB | 首屏加载优化 |

### 视频生成提示词

```
Continuous FPV drone shot, smooth 360-degree clockwise tracking shot around the central fountain.
Camera briefly focuses on Nuzzly Cafe, wooden bulletin board, pet hospital, and pet supply store during rotation.
In front center, cute chubby mascot Qiuqiu bounces happily in place.
Small white and cream-colored cats, milk-tea colored dogs are everywhere:
going in and out of buildings, peeking out, waving paws, holding toys and balloons, jumping together.

Dynamic environment:
- flower petals falling gently
- realistic water flowing in the fountain
- shop flags swaying softly
- tree leaves rustling in the breeze

Bright sunny lighting, high quality, highly detailed, masterpiece, web hero background video.
Orbit camera with slight zoom in to simulate FPV drone feeling.

Negative Prompt: morphing, distorted, deformed, mutated, blur, blurry, low quality, bad anatomy, static water, frozen leaves, dark lighting, gloomy, text errors.

Motion strength: 70%
```

---

## 开发说明

### 技术栈

- **Next.js 16** - React 框架
- **GSAP** - 高级动画引擎（入场动画、花瓣、宠物浮动）
- **Motion (Framer Motion)** - 声明式 React 动画、滚动视差
- **Tailwind CSS 4** - 样式系统

### 核心文件

```
web/
├── app/
│   └── (main)/
│       └── page.tsx          # 主页面，包含 Hero 组件
├── lib/
│   └── animations.ts         # 动画预设工具函数
└── public/
    ├── nuzzly-town.mp4       # 3D 视频文件（待添加）
    └── hero-background.png   # 降级静态图片
```

### 本地开发

```bash
cd web
npm install
npm run dev
```

访问 http://localhost:3000 查看效果

---

## 视频生成状态

⏳ **待生成**: 3D 视频由于 API 暂时不可用，待后续生成后放入 public 目录。

### 临时降级方案

在视频生成之前，页面会自动使用 `/hero-background.png` 作为背景图片，所有文字和动画效果正常工作。

### 视频生成后操作

1. 将视频文件命名为 `nuzzly-town.mp4`
2. 放入 `web/public/` 目录
3. 刷新页面即可看到视频背景效果

---

## 优化建议

### 1. 视频懒加载

可在后续添加视频懒加载优化：

```tsx
<video
  ref={videoRef}
  preload="none"
  poster="/hero-background.png"
  onIntersectionEnter={(e) => e.target.load()}
/>
```

### 2. 加载状态

添加视频加载中的骨架屏或加载指示器：

```tsx
{!videoLoaded && (
  <div className="absolute inset-0 bg-gradient-to-r from-[#F7F6F3] to-[#F5F0EB] animate-pulse" />
)}
```

### 3. 移动端优化

考虑在移动端禁用自动播放，改用静态图片或缩短版视频：

```tsx
const isMobile = useMediaQuery('(max-width: 768px)')
// 移动端使用静态图片优化加载速度
```

---

## 后续任务

- [ ] 生成 `nuzzly-town.mp4` 3D 视频
- [ ] 放入 `web/public/` 目录
- [ ] 测试不同浏览器兼容性
- [ ] 性能优化（Lighthouse 评分）
- [ ] 添加视频加载失败的用户提示
