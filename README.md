# Nuzzly · 毛球镇

> **让每一次选择都值得信赖**

Nuzzly（毛球镇）是中国首个宠物真实世界数据（PetRWD）AI 基础设施平台。通过长期追踪宠物健康数据，构建宠物食品的长期结果数据库，用数据驱动的 AI 推荐帮助宠物主做出更科学的喂养决策。

---

## 核心理念

宠物食品行业面临一个根本问题：**没人知道长期喂这款粮会怎样**。

传统评测只能告诉你开袋时的感受，但猫咪的软便、黑下巴、泪痕等问题往往在喂养数月后才显现。Nuzzly 通过 7/30/90/180/365 天的长期追踪，积累了真实的宠物食品效果数据，并用 AI 飞轮系统持续优化推荐质量。

---

## 功能全景

### 智能推荐系统

- **AI 助手"球球"**：四种模式 — 自由对话、智能推荐、成分分析、产品对比，基于 DeepSeek 大语言模型流式输出
- **多臂赌博机（Bandit）排序**：Thompson Sampling 自动探索最优推荐策略
- **飞轮引擎**：每日自动运行，对推荐结果做归因 → 纵向追踪 → 效果评分 → 策略迭代
- **A/B 灰度发布**：支持影子评分对比、确定性哈希分桶、回滚机制

### 宠物健康管理

- **宠物档案**：品种、生命阶段、体重追踪、过敏管理、环境档案
- **饮食日志**：记录每日饮食，追踪饮食趋势
- **健康时间线**：症状、用药、就诊、疫苗事件的完整时间线
- **疾病与用药记录**：活跃/慢性/已治愈疾病管理，用药周期追踪
- **健康提醒**：自定义健康提醒，支持完成/跳过操作
- **每日任务**：日常护理任务管理

### 产品信任体系

- **产品档案**：营养成分、配方版本、风险事件、SSS/SS/S 级监控指标
- **结构化评价**：多步骤评价向导 — 选择宠物 → 使用时长（可信度分桶） → 评分 → 文本反馈 → 优缺点 → 凭证验证
- **时间线指标**：稳定性率、软便率、呕吐率、复购率等长期指标
- **风险情报**：自动识别产品风险事件

### 社区系统

- **社区动态**：发帖、点赞、举报
- **内容审核**：自动/人工审核机制
- **用户信任分**：基于行为质量的信任评分

### 户口簿（Resident Book）

- **翻书式宠物档案**：Framer Motion 3D 翻页动画，四页展示（封面/信息/成长/健康）
- **宠物编码**：唯一身份标识

### 管理后台

- **用户管理**：搜索、标记、管理员操作
- **产品管理**：产品列表与搜索
- **评价审核**：评价审核流程
- **Outcomes Dashboard**：推荐系统效果分析（归因/基准/有效性/队列分析）
- **全局策略管理**：策略计算、应用、模拟、历史
- **灰度发布控制**：状态查看、调整、回滚
- **因果分析**：推荐结果的因果推断

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    客户端层                           │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │   Web (Next.js)  │  │  iOS (Vue 3)  │              │
│  │  React + TS      │  │  Vite + TDesign │            │
│  └──────┬───────┘  └──────┬───────┘                 │
├─────────┼─────────────────┼─────────────────────────┤
│         ▼                 ▼                         │
│  ┌─────────────────────────────────┐                │
│  │      Vercel Serverless          │                │
│  │      API Routes (60+)           │                │
│  └──────────────┬──────────────────┘                │
├─────────────────┼───────────────────────────────────┤
│                 ▼                                   │
│  ┌──────────────────────────────────┐               │
│  │        Supabase (PostgreSQL)     │               │
│  │   50+ 张表 · 63 次迁移 · RLS     │               │
│  │   向量搜索 (pgvector)            │               │
│  └──────────────────────────────────┘               │
├─────────────────────────────────────────────────────┤
│                    AI 引擎层                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐        │
│  │ Bandit   │ │ 归因引擎  │ │ 飞轮引擎     │        │
│  │ 策略学习  │ │ 因果推断  │ │ 日循环迭代   │        │
│  └──────────┘ └──────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| **Web 前端** | Next.js 14 (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion |
| **iOS 前端** | Vue 3 + Vite + TDesign Mobile + model-viewer (3D) |
| **后端** | Vercel Serverless (Next.js API Routes) |
| **数据库** | Supabase (PostgreSQL) — 50+ 张表，行级安全 (RLS) |
| **向量数据库** | Qdrant (1536 维，Cosine 距离) |
| **AI 模型** | DeepSeek LLM (流式 SSE) |
| **认证** | Supabase Auth (邮箱密码 + OAuth) |
| **存储** | Supabase Storage (宠物头像/附件/产品图片/用户头像/评价凭证) |
| **动画** | Framer Motion + GSAP |
| **3D** | React Three Fiber (Web) / model-viewer (iOS) |
| **测试** | Vitest |
| **部署** | Vercel (Web + Cron) |

---

## 项目结构

```
Nuzzly/
├── web/                              # Next.js Web 应用
│   ├── app/                          # App Router 路由
│   │   ├── (auth)/                   # 认证页面（登录/注册）
│   │   ├── (main)/                   # 主路由组
│   │   │   ├── page.tsx              # 首页
│   │   │   ├── about/                # 关于我们
│   │   │   ├── protection/           # 保护计划
│   │   │   ├── ai/                   # AI 助手（球球）
│   │   │   ├── community/            # 社区
│   │   │   ├── products/             # 产品库 + 产品详情 + 评价
│   │   │   ├── dashboard/            # 用户中心（宠物/健康/设置等）
│   │   │   └── admin/                # 管理后台
│   │   └── api/                      # API 路由（60+）
│   │       ├── ai/                   # AI 对话/推荐/健康报告
│   │       ├── pets/                 # 宠物管理
│   │       ├── health-reminders/     # 健康提醒
│   │       ├── products/             # 产品时间线/风险情报
│   │       ├── analytics/            # 数据分析
│   │       ├── admin/                # 管理员 API（飞轮/策略/灰度）
│   │       ├── projections/          # CQRS 投影系统
│   │       ├── gateway/              # 写入网关
│   │       └── jobs/                 # 后台任务处理
│   ├── components/                   # UI 组件（100+）
│   │   ├── ui/                       # 基础组件（shadcn/ui）
│   │   ├── layout/                   # 布局组件
│   │   ├── ai/                       # AI 功能组件
│   │   ├── products/                 # 产品组件
│   │   ├── reviews/                  # 评价组件
│   │   ├── pets/                     # 宠物管理组件
│   │   ├── dashboard/                # 仪表盘组件
│   │   ├── community/                # 社区组件
│   │   ├── resident-book/            # 户口簿（翻书式档案）
│   │   └── admin/                    # 管理组件
│   ├── lib/                          # 核心逻辑库
│   │   ├── timeline/                 # 飞轮引擎核心（40+ 文件）
│   │   │   ├── data-flywheel.ts      # 飞轮周期编排器
│   │   │   ├── flywheel-input-builder.ts  # ETL 构建器
│   │   │   ├── outcome-attribution.ts # 结果归因引擎
│   │   │   ├── effectiveness-scoring.ts   # 有效性评分
│   │   │   ├── health-benchmarks.ts  # 健康基准数据集
│   │   │   ├── longitudinal-tracking.ts   # 纵向追踪
│   │   │   ├── explainability-engine.ts   # 可解释性引擎
│   │   │   ├── cohort-intelligence.ts     # 队列智能
│   │   │   ├── bandit-policy.ts      # Thompson Sampling Bandit
│   │   │   ├── reward-function.ts    # 统一奖励信号
│   │   │   ├── learning-loop.ts      # 在线/离线学习闭环
│   │   │   ├── rollout-controller.ts # 灰度发布控制器
│   │   │   ├── rollback-system.ts    # 回滚系统
│   │   │   ├── strategy-registry.ts  # 策略注册表
│   │   │   ├── causal-analysis.ts    # 因果分析引擎
│   │   │   ├── policy-simulator.ts   # 策略模拟器
│   │   │   └── index.ts             # 模块总导出
│   │   ├── events/                   # 事件驱动架构
│   │   ├── gateway/                  # 写入网关（幂等性保障）
│   │   ├── projections/              # CQRS 投影引擎
│   │   ├── jobs/                     # 异步作业系统
│   │   ├── supabase/                 # Supabase 客户端/查询/RPC
│   │   ├── ai/                       # AI 模块（占位）
│   │   ├── vectordb/                 # Qdrant 向量数据库
│   │   ├── tracking/                 # 用户意图追踪
│   │   └── validation.ts             # 请求验证与消毒
│   ├── design-system/                # 设计系统
│   │   └── tokens/                   # 颜色/字体/间距/动画 Token
│   ├── hooks/                        # React Hooks
│   └── tests/                        # 测试文件
│       └── lib/timeline/             # 飞轮 E2E 测试
├── supabase/                         # 数据库
│   ├── config.toml                   # Supabase 配置
│   ├── seed.sql                      # 种子数据（10 款猫粮）
│   └── migrations/                   # 63 个迁移文件
├── ios-app-frontend/                 # iOS 应用（Vue 3）
│   ├── src/
│   │   ├── views/                    # 48 个页面
│   │   ├── composables/              # 33 个 Composable
│   │   ├── components/               # 10 个组件
│   │   └── lib/                      # 12 个工具模块
│   └── DESIGN.md                     # iOS 设计系统文档
├── scripts/
│   ├── scraper/                      # 数据爬虫（淘宝/波奇/小红书）
│   │   ├── tabbit_scraper.ts         # Tabbit Browser 爬虫
│   │   ├── standard_scraper.ts       # Playwright 标准爬虫
│   │   ├── xiaohongshu.ts            # 小红书评价爬虫
│   │   └── schema.ts                 # 70+ 品牌映射表
│   └── ocr-service/                  # 百度 OCR 配料表识别
├── 策划案/                            # 商业策划文档
├── docs/                             # 运维文档
├── vercel.json                       # Vercel 部署配置
├── AGENTS.md                         # AI 编码准则
└── BACKLOG.md                        # 待办事项
```

---

## 飞轮引擎

飞轮是 Nuzzly 的核心竞争力。每次推荐完成后，系统自动进入飞轮循环：

```
推荐请求
  │
  ▼
RolloutController（路由决策）
  ├── AB_CONTROL → 旧评分
  ├── AB_TREATMENT → 新评分
  ├── ROLLOUT_PARTIAL → 按比例分流
  └── ROLLOUT_FULL → 全量新评分
  │
  ▼
BanditPolicy（臂选择）
  ├── review_only → 仅基于评价评分
  ├── timeline_only → 仅基于时间线评分
  └── blend → 融合评分
  │
  ▼
推荐结果返回 + trace_log 记录
  │
  ▼  (异步飞轮循环 — 每日 UTC 19:00)
  │
  ├── 1. outcome-attribution    归因：贡献度拆解（timeline 35%, strategy 30%, bandit 15%, segment 10%, random 10%）
  ├── 2. longitudinal-tracking  纵向：7/30/90/180 天窗口追踪（improved/stable/worsened）
  ├── 3. explainability-engine  解释：生成人类可读的推荐依据
  ├── 4. health-benchmarks      基准：更新统计基准（中位数/均值/标准差/95% CI）
  ├── 5. effectiveness-scoring  有效性：四维评分（quality 25%, accuracy 30%, consistency 15%, safety 30%）
  ├── 6. cohort-intelligence    队列：按群体聚合分析
  └── 7. 异步补全作业           attributionConfidence / outcomeStability / outcomeClarity
```

### 事件驱动架构

所有数据库写入通过统一的写入网关（Write Gateway），保证幂等性：

```
客户端请求 → WriteGateway（验证 → 幂等检查 → 转为 Event → EventBus 发布）
  │
  ├── EventStore 持久化事件
  ├── Projection Engine（Event → pure reducer → 可查询状态）
  └── Job Runtime（异步作业：飞轮补全/指标刷新/投影更新等）
```

---

## 数据库

Supabase PostgreSQL，共 63 次迁移，50+ 张表，两个主要 Schema：

- **public**：核心业务表（pets, products, product_reviews, health_metrics, diet_logs 等）
- **pflid**：飞轮系统表（outcome_attribution, longitudinal_outcomes, health_benchmarks, counterfactual_estimates 等）

### 关键特性

- **RLS 行级安全**：全表启用，公开数据只读，私有数据 owner-only
- **向量搜索**：pgvector 1536 维，用于产品和评价的语义搜索
- **模糊搜索**：pg_trgm 扩展支持产品名称模糊匹配
- **事件存储**：event_store 表支持事件溯源（Event Sourcing）
- **存储桶**：5 个桶（pet-avatars, pet-attachments, product-images, review-vouchers, user-avatars）

---

## 快速开始

### 前置要求

- Node.js 18+
- pnpm 或 npm
- Supabase 项目（本地或远程）

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd Nuzzly

# 安装 Web 依赖
cd web
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase 配置
```

### 环境变量

**Web (`web/.env.local`)**：
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

**iOS (`ios-app-frontend/.env.local`)**：
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3000
```

### 开发

```bash
# 启动 Web 开发服务器
cd web
npm run dev

# 启动 iOS 开发服务器
cd ios-app-frontend
npm run dev
```

Web 开发服务器启动在 `http://localhost:3000`，iOS 开发服务器启动在 `http://localhost:5173`。

### 测试

```bash
cd web
npm test
```

---

## 部署

### Vercel 部署

项目已配置 Vercel 自动部署，包含两个定时任务：

| 任务 | 时间 (UTC) | 功能 |
|------|-----------|------|
| 飞轮周期 | 每日 19:00 | 运行完整的飞轮迭代循环 |
| 数据丰富 | 每日 19:30 | 补全推荐数据的归因置信度、稳定性等字段 |

### 手动触发飞轮

```bash
# 运行飞轮周期
curl -X POST https://your-domain.com/api/admin/outcomes/run-cycle \
  -H "Authorization: Bearer your-cron-secret"

# 补全推荐数据
curl -X POST https://your-domain.com/api/admin/outcomes/enrich-recommendations \
  -H "Authorization: Bearer your-cron-secret"
```

---

## 数据爬虫

项目包含宠物食品数据爬虫工具，支持多个平台：

```bash
cd scripts/scraper

# 淘宝爬虫
npm run scrape -- taobao "猫粮"

# 波奇网爬虫
npm run scrape -- boqii "猫粮"

# 小红书评价爬虫
npm run scrape:xhs

# Tabbit Browser 爬虫（反爬检测更低）
npm run tabbit:taobao
npm run tabbit:boqii
npm run tabbit:jd
```

---

## 商业模式

Nuzzly 的六条盈利路径：

1. **C 端会员订阅**：¥19/月，解锁完整推荐和追踪功能
2. **B 端品牌数据服务**：5-30 万/年，提供产品效果数据报告
3. **宠物保险风控**：基于真实健康数据的保险精算
4. **宠物医院 SaaS**：299-999 元/月，健康管理工具
5. **AI API 开放平台**：宠物健康 AI 能力输出
6. **精准导购佣金**：3-10% 推荐转化佣金

---

## 开发原则

项目遵循严格的编码准则（详见 [AGENTS.md](./AGENTS.md)）：

- **编码前思考**：不假设，不隐藏困惑，明确权衡
- **简洁优先**：解决问题所需的最小代码
- **精准变更**：只改必要的部分
- **目标驱动**：定义成功标准，循环直到验证
- **零副作用**：严禁任何与任务无关的变更

---

## 相关文档

- [策划参考](./策划案/策划参考.md) — 项目最终方案汇总
- [商业落地执行书](./策划案/商业落地执行书.md) — Phase 0 商业闭环执行
- [项目核心资产](./策划案/项目核心资产.md) — 核心资产详解
- [投资 BP](./策划案/PetRWD-BP-Investor-V2.md) — 英文投资商业计划书
- [MVP 设计](./策划案/trust_product_MVP_design_cn.md) — MVP 产品原型设计
- [iOS 设计系统](./ios-app-frontend/DESIGN.md) — iOS 端完整设计规范
- [运维指南](./docs/ops.md) — 飞轮定时触发配置
- [待办事项](./BACKLOG.md) — 已知问题和优化项

---

## 许可证

本项目为私有项目，未经授权不得使用或分发。
