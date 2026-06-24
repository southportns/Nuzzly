# Project Backlog — Pet Health AI System

> Generated: 2026-06-08
> Updated: 2026-06-08 (战略调整：先商业闭环，后架构升级)
> Status: 核心功能 ✅ | 商业闭环 🔄 待完善 | Phase 1.3/2.0 ⏸️ 冻结

---

## 战略调整说明

Phase 1.3/2.0（AI Projection Intelligence）代码骨架已生成并保留，但**暂停实施**。
当前优先级调整为：**先跑通商业闭环，验证商业模式后再进行架构升级迭代**。

Phase 1.3/2.0 已生成的代码：
- `web/lib/ai/feature-extractor.ts` ✅
- `web/lib/ai/feature-mappers/` ✅
- `web/lib/ai/embedding/` ✅
- `web/lib/ai/similarity/` ✅
- `web/lib/ai/graph/` ✅
- `web/lib/ai/causal/` ✅
- `web/lib/ai/prediction/` ✅
- `web/lib/ai/ranking/` ✅
- `web/lib/ai/counterfactual/` ✅
- `web/app/api/ai/` ✅
- `supabase/migrations/20260619000001_ai_projection_intelligence.sql` ✅

这些代码作为**技术储备**保留，等商业闭环跑通后再按需激活。

---

## Phase 0 — 商业闭环（P0 最高优先级）

### 现有功能盘点（✅ 已完成）

| 功能 | 状态 | 位置 |
|------|------|------|
| 首页展示 | ✅ | `web/app/(main)/page.tsx` |
| 注册/登录 | ✅ | `web/app/(auth)/signup + login` |
| 宠物档案 | ✅ | `dashboard/pets/[petId]` |
| 饮食记录 | ✅ | `DietLogForm` + `queryDietLogs` |
| 体重追踪 | ✅ | `WeightTracker` + `queryWeightLogs` |
| 过敏管理 | ✅ | `AllergyManager` |
| 健康时间线 | ✅ | `HealthTimeline` |
| 产品浏览 | ✅ | `products/[productId]` |
| 产品追评 | ✅ | `products/[productId]/review` |
| 推荐反馈 | ✅ | `dashboard/recommendations` |
| Followup 系统 | ✅ | `dashboard/followups` |
| Event Store | ✅ | `web/lib/events/` |
| Bandit 学习 | ✅ | `web/lib/timeline/bandit-policy.ts` |
| Admin 后台 | ✅ | `admin/` |

### 商业闭环核心流程

```
用户注册 → 创建宠物档案 → 浏览产品 → 获得推荐 → 反馈(accept/reject) → 系统学习 → 更精准推荐
```

**结论：核心飞轮已转，但以下环节需要加强才能形成完整商业闭环。**

---

### Epic 0.1 — 用户 Onboarding 优化

| ID | Task | Description | Priority | Status |
|----|------|-------------|----------|--------|
| 0.1-A | 首次登录引导 | 新用户登录后引导创建宠物档案 | P0 | TODO |
| 0.1-B | 宠物快速建档 | 简化宠物档案填写流程（最少必填项） | P0 | TODO |
| 0.1-C | 饮食偏好设置 | 首次设置时收集宠物饮食偏好/过敏史 | P1 | TODO |

### Epic 0.2 — 推荐体验优化

| ID | Task | Description | Priority | Status |
|----|------|-------------|----------|--------|
| 0.2-A | 推荐结果展示 | 在 dashboard 首页展示个性化推荐 | P0 | TODO |
| 0.2-B | 推荐理由解释 | 显示"为什么推荐这款粮"（基于宠物档案） | P0 | TODO |
| 0.2-C | 一键采纳/拒绝 | 简化反馈操作（当前已有，需优化 UX） | P1 | TODO |
| 0.2-D | 推荐历史 | 展示历史推荐记录和反馈结果 | P1 | TODO |

### Epic 0.3 — 数据看板（用户侧）

| ID | Task | Description | Priority | Status |
|----|------|-------------|----------|--------|
| 0.3-A | 宠物健康概览 | 展示宠物健康状态摘要 | P0 | TODO |
| 0.3-B | 饮食趋势图 | 可视化饮食记录和变化 | P1 | TODO |
| 0.3-C | 体重趋势图 | 可视化体重变化（已有 WeightTracker） | P1 | TODO |
| 0.3-D | 症状追踪 | 记录和追踪症状变化 | P1 | TODO |

### Epic 0.4 — 转化漏斗

| ID | Task | Description | Priority | Status |
|----|------|-------------|----------|--------|
| 0.4-A | 购买意向追踪 | 记录用户点击/收藏/购买行为 | P0 | TODO |
| 0.4-B | 复购提醒 | 基于饮食记录提醒补货 | P1 | TODO |
| 0.4-C | 用户留存分析 | 追踪用户活跃度和留存率 | P1 | TODO |

### Epic 0.5 — 数据质量

| ID | Task | Description | Priority | Status |
|----|------|-------------|----------|--------|
| 0.5-A | 产品数据完善 | 确保产品库有足够多的猫粮数据 | P0 | TODO |
| 0.5-B | 产品标签体系 | 建立成分/适用/风险标签 | P0 | TODO |
| 0.5-C | 用户反馈质量 | 优化追评表单，收集结构化反馈 | P1 | TODO |

---

## Phase 1.3 — Projection Intelligence Layer ⏸️ 冻结

> 代码骨架已生成，保留为技术储备。商业闭环跑通后按需激活。

### 已生成代码清单

| 模块 | 文件 | 状态 |
|------|------|------|
| Feature Extractor | `web/lib/ai/feature-extractor.ts` | ✅ 骨架完成 |
| Feature Mappers | `web/lib/ai/feature-mappers/` | ✅ 骨架完成 |
| Embedding Layer | `web/lib/ai/embedding/` | ✅ 骨架完成 |
| Similarity Engine | `web/lib/ai/similarity/` | ✅ 骨架完成 |
| Projection Graph | `web/lib/ai/graph/` | ✅ 骨架完成 |
| Causal Engine | `web/lib/ai/causal/` | ✅ 骨架完成 |
| Prediction Engine | `web/lib/ai/prediction/` | ✅ 骨架完成 |
| Ranking Engine | `web/lib/ai/ranking/` | ✅ 骨架完成 |
| Counterfactual | `web/lib/ai/counterfactual/` | ✅ 骨架完成 |
| AI API Routes | `web/app/api/ai/` | ✅ 骨架完成 |
| DB Migration | `supabase/migrations/20260619000001_*.sql` | ✅ 待应用 |

### 冻结任务（原 P0 降级为 P2）

| ID | Task | 新优先级 | 状态 |
|----|------|----------|------|
| 1.3.1 | Feature Extraction Layer | P2 | ⏸️ 冻结 |
| 1.3.2 | Feature Mapping | P2 | ⏸️ 冻结 |
| 1.3.3 | State Embedding Layer | P2 | ⏸️ 冻结 |
| 1.3.4 | Similarity Engine | P2 | ⏸️ 冻结 |
| 1.3.5 | Projection Graph Builder | P2 | ⏸️ 冻结 |
| 1.3.6 | Graph Query Engine | P2 | ⏸️ 冻结 |
| 1.3.7 | Causal Mapping Engine | P2 | ⏸️ 冻结 |
| 1.3.8 | Causal Score System | P2 | ⏸️ 冻结 |
| 1.3.9 | Unified AI State API | P2 | ⏸️ 冻结 |
| 1.3.10 | Cross-Projection Query API | P2 | ⏸️ 冻结 |

---

## Phase 2.0 — Causal & Predictive System ⏸️ 冻结

> 商业闭环跑通后，基于真实数据再决定是否需要预测/反事实推理。

| ID | Task | 新优先级 | 状态 |
|----|------|----------|------|
| 2.0.1 | Full Causal Graph System | P2 | ⏸️ 冻结 |
| 2.0.2 | Counterfactual Engine | P2 | ⏸️ 冻结 |
| 2.0.3 | Health Prediction Engine | P2 | ⏸️ 冻结 |
| 2.0.4 | Food Outcome Prediction | P2 | ⏸️ 冻结 |
| 2.0.5 | Personalized Ranking Engine | P2 | ⏸️ 冻结 |
| 2.0.6 | Stability Score System | P2 | ⏸️ 冻结 |
| 2.0.7 | Policy Engine Upgrade | P2 | ⏸️ 冻结 |
| 2.0.8 | Adaptive Learning Loop | P2 | ⏸️ 冻结 |
| 2.0.9 | Timeline Simulation Engine | P2 | ⏸️ 冻结 |
| 2.0.10 | Scenario Engine | P2 | ⏸️ 冻结 |

---

## 实施路线图

```
Phase 0 — 商业闭环（当前）
├── Epic 0.1: 用户 Onboarding
├── Epic 0.2: 推荐体验优化
├── Epic 0.3: 数据看板
├── Epic 0.4: 转化漏斗
└── Epic 0.5: 数据质量

↓ 商业模型验证通过后

Phase 1.3 — AI 能力集成（解冻）
├── 激活 Prediction Engine → 接入推荐页
├── 激活 Causal Engine → 接入"为什么推荐"解释
└── 激活 Similarity Engine → 接入"相似猫在吃什么"

↓ 数据积累到足够规模后

Phase 2.0 — 预测与反事实（按需）
├── Counterfactual "如果换粮会怎样"
├── Timeline Simulation
└── 数字孪生
```

---

## 关键决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-06-08 | 暂停 Phase 1.3/2.0 | 商业闭环优先，架构升级留到后期 |
| 2026-06-08 | 保留 AI 代码骨架 | 作为技术储备，后续可快速激活 |
| 2026-06-08 | 现有版本足够上线 | 核心飞轮（注册→宠物→推荐→反馈→学习）已完整 |
