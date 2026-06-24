# Timeline First Readiness Report
## Phase 3.5 — Shadow Mode & Cutover Validation

**Generated:** 2026-06-12
**Phase:** 3.5 (Shadow Mode)
**Status:** Ready for Dual-Track Validation

---

## 1. Timeline 覆盖率

| 模块 | 状态 | 说明 |
|------|------|------|
| `timeline_groups` | ✅ 已上线 | 评论→Timeline 分组引擎 |
| `timeline_events` | ✅ 已上线 | 事件提取引擎 |
| `timeline_metrics_daily` | ✅ 已上线 | 每日指标聚合表 |
| `product_score_comparison` | ✅ 新增 | 双轨评分对比表 |
| `generate_timeline_metrics()` | ✅ 已上线 | 指标生成函数 |
| `calculate_longitudinal_score()` | ✅ 已上线 | 纵向评分引擎 |
| `build_timeline_context()` | ✅ 已上线 | AI 上下文构建器 |
| `recommend_food_by_outcome()` | ✅ 已上线 | 结果推荐引擎 |
| `build_outcome_dataset()` | ✅ 新增 | AI 训练数据集构建器 |

**覆盖率：9/9 核心模块已就绪**

---

## 2. Agent Timeline 使用率

| Agent 模块 | 评分来源 | 切换状态 |
|-----------|---------|---------|
| `runAgentPipeline()` | Review Score | ⚠️ 保留（回滚路径） |
| `runAgentPipelineWithShadow()` | Timeline + Review (70/30) | ✅ 新增（Shadow Mode） |
| `scoreProductTimelineOnly()` | Timeline Only | ✅ 新增（未来切换） |
| `/api/ai/recommend` | Timeline First (默认) | ✅ 已升级 |
| `/api/recommend/shadow` | Dual Scoring | ✅ 新增 |
| `/api/recommend/outcome` | Timeline Metrics | ✅ 已上线 |

**Timeline 使用率：推荐系统已默认使用 Timeline First，保留 Review 回滚路径**

---

## 3. Review 依赖残留模块

| 模块 | 文件 | 依赖类型 | 优先级 |
|------|------|---------|--------|
| `review-queries.ts` | `web/lib/supabase/queries/review-queries.ts` | 评论查询 | 低（UI 展示） |
| `product-queries.ts` | `web/lib/supabase/queries/product-queries.ts` | `average_rating` | 中（需改造） |
| `coldstart.ts` | `web/lib/ai/coldstart.ts` | `positive_rate` | 中（冷启动推荐） |
| `explain-types.ts` | `web/lib/ai/explain-types.ts` | 评论证据 | 低（解释层） |
| `timeline-extractor.ts` | `web/lib/ai/timeline-extractor.ts` | `review_text` 输入 | 已改造 |
| `context-builder.ts` | `web/lib/timeline/context-builder.ts` | `review_text` 输入 | 已改造 |
| `process-timeline/route.ts` | `app/api/reviews/[id]/process-timeline/route.ts` | 评论触发 | 正常（触发器） |

**残留模块：6 个，其中 2 个需要改造（product-queries, coldstart）**

---

## 4. Score 差异分析

### 双轨评分设计

```
Review Score  →  基于 average_rating * 20 (0-100)
Timeline Score →  基于 longitudinal_score (稳定率 65% + 复购率 20% - 风险 15%)
Score Delta   →  Timeline - Review
```

### 预期差异模式

| 模式 | 含义 | 行动 |
|------|------|------|
| Delta > +15 | Timeline 评分显著高于 Review | 发现被低估的优质产品 |
| Delta < -15 | Review 评分显著高于 Timeline | 可能存在刷评/短期偏差 |
| -15 ≤ Delta ≤ +15 | 双轨评分一致 | 评分系统可靠 |

### 验证指标

- `product_score_comparison` 表自动记录每次评分对比
- `get_score_comparison_report()` 输出 Top Delta Report
- 触发器自动在指标更新时重新计算对比

---

## 5. 推荐系统迁移状态

| 组件 | 状态 | 说明 |
|------|------|------|
| `outcome-recommendation.ts` | ✅ 已上线 | 基于 Timeline 指标的推荐 |
| `agent-migration.ts` | ✅ 新增 | Shadow Mode 渐进切换 |
| `recommendation-card.tsx` | ✅ 已升级 | 支持 Timeline 增强字段展示 |
| `/api/ai/recommend` | ✅ 已升级 | 默认 Timeline First |
| `/api/recommend/shadow` | ✅ 新增 | 双轨对比 API |
| `/api/recommend/outcome` | ✅ 已上线 | 结果推荐 API |

**迁移状态：推荐系统已完成 Timeline First 升级**

---

## 6. AI Context 迁移状态

| 组件 | 旧输入 | 新输入 | 状态 |
|------|--------|--------|------|
| `buildTimelineContext()` | `review_text` | `timeline_events` | ✅ 已改造 |
| `timeline-extractor.ts` | `review_text` | 提取 timeline 事件 | ✅ 已改造 |
| `context-builder.ts` | 评论文本 | Timeline 上下文 | ✅ 已改造 |
| AI 推荐输入 | Review 文本 | Timeline Context | ✅ 已改造 |

**AI Context 迁移：已完成从 Review 到 Timeline 的输入切换**

---

## 7. 风险项

### 🔴 高风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Timeline 数据不足 | 新产品无 Timeline 评分 | 回滚到 Review Score |
| 评分差异过大 | 用户体验不一致 | Shadow Mode 70/30 混合 |
| 冷启动推荐 | 无历史数据的产品 | `coldstart.ts` 仍需改造 |

### 🟡 中风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `product-queries.ts` 仍使用 `average_rating` | 产品列表排序不一致 | 下一步改造 |
| 推荐卡片展示复杂 | 信息过载 | 分层展示（已实现） |
| Dataset Builder 性能 | 大数据量查询慢 | 增量构建 + 分页 |

### 🟢 低风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Review 查询残留 | 仅影响 UI 展示 | 不影响推荐逻辑 |
| 解释层依赖评论 | 证据来源 | 可保留作为辅助 |

---

## 8. 回滚方案

### 场景 1: Timeline 评分异常

```typescript
// 在 agent-migration.ts 中设置
const USE_TIMELINE = false  // 切换回 Review-only 模式
```

### 场景 2: 推荐质量下降

```typescript
// 在 /api/ai/recommend 中设置
{ "useTimeline": false }  // 强制使用 Review 模式
```

### 场景 3: 数据库回滚

```sql
-- 禁用自动更新触发器
DROP TRIGGER IF EXISTS after_timeline_metrics_insert
  ON pflid.timeline_metrics_daily;

-- 删除对比表（保留数据）
-- ALTER TABLE pflid.product_score_comparison DISABLE ROW LEVEL SECURITY;
```

### 场景 4: 完全回滚到 Phase 3

```bash
# 删除 Phase 3.5 迁移文件
# supabase/migrations/20260612000000_shadow_scoring.sql
# supabase/migrations/20260612000001_outcome_dataset.sql

# 恢复推荐 API 到 Phase 3 版本
# git checkout HEAD~1 -- web/app/api/ai/recommend/route.ts
```

---

## 交付物清单

| # | 交付物 | 状态 | 路径 |
|---|--------|------|------|
| 1 | Migration | ✅ | `supabase/migrations/20260612000000_shadow_scoring.sql` |
| 2 | Migration | ✅ | `supabase/migrations/20260612000001_outcome_dataset.sql` |
| 3 | Repository | ✅ | `web/lib/timeline/shadow-scoring.ts` |
| 4 | Repository | ✅ | `web/lib/timeline/agent-migration.ts` |
| 5 | Repository | ✅ | `web/lib/timeline/outcome-dataset.ts` |
| 6 | Service | ✅ | `web/lib/timeline/longitudinal-score.ts` (Phase 3) |
| 7 | Service | ✅ | `web/lib/timeline/metrics-engine.ts` (Phase 3) |
| 8 | Dashboard API | ✅ | `web/app/api/admin/outcome-intelligence/route.ts` |
| 9 | Dashboard API | ✅ | `web/app/api/admin/outcome-dataset/route.ts` |
| 10 | Dashboard UI | ✅ | `web/app/(main)/admin/outcome-intelligence/page.tsx` |
| 11 | Agent Migration | ✅ | `web/lib/timeline/agent-migration.ts` |
| 12 | API Upgrade | ✅ | `web/app/api/ai/recommend/route.ts` |
| 13 | API (Shadow) | ✅ | `web/app/api/recommend/shadow/route.ts` |
| 14 | UI Component | ✅ | `web/components/ai/recommendation-card.tsx` (升级) |
| 15 | Readiness Report | ✅ | 本文档 |

---

## 核心原则验证

| 原则 | 验证状态 |
|------|---------|
| Timeline = Source of Truth | ✅ 推荐系统默认使用 Timeline |
| Review = Raw Data | ✅ 评论仅作为原始数据输入 |
| Outcome = Product Value | ✅ 评分基于长期结果而非短期评价 |
| AI = Timeline Consumer | ✅ AI 输入已改造为 Timeline Context |
| Recommendation = Outcome Driven | ✅ 推荐基于纵向指标而非平均评分 |

---

## 下一步：Phase 4 — Outcome Prediction Engine

1. 使用 `outcome-dataset` 构建 ML 训练数据
2. 训练预测模型（稳定率、症状风险、复购概率）
3. 实现预测性推荐（提前识别潜在问题）
4. 建立反馈闭环（预测 → 实际 → 模型更新）

---

**报告生成完毕。Shadow Mode 已就绪，可开始双轨验证。**
