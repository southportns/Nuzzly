# Pet RWD 架构升级完成

## 📋 概述

本次升级将平台从"宠物社区"升级为"宠物真实世界数据（Pet RWD）基础设施"，核心目标是建立中国最大的宠物长期健康结果数据库。

---

## 🗂️ 新增文件

### 数据库迁移

- `web/lib/supabase/migration_v2_pet_rwd.sql` - Pet RWD核心数据库结构

### 架构文档

- `docs/pet_rwd_architecture.md` - 完整架构设计文档

### TypeScript代码

- `web/lib/pet-rwd/types.ts` - 类型定义
- `web/lib/pet-rwd/api.ts` - API客户端
- `web/lib/pet-rwd/index.ts` - 模块导出

---

## 🏗️ 核心数据表

### 1. pet_events（统一事件系统）

**地位：全平台最核心数据表**

所有用户行为、系统事件、AI抽取结果都统一存储。

```sql
pet_events
├── pet_id (宠物)
├── event_type (事件类型)
├── event_time (事件时间)
├── source_type (数据来源)
├── trust_score (可信度)
├── symptom_code (标准化症状)
├── severity (严重程度)
└── metadata (灵活元数据)
```

### 2. symptom_ontology（症状标准化词典）

将用户自然语言标准化：

| 用户说 | 标准化代码 |
|--------|-----------|
| 拉稀、稀便、软便 | soft_stool |
| 黑下巴、毛囊炎 | black_chin |
| 吐了、反胃 | vomiting |

### 3. food_usage_periods（食品使用周期）

记录宠物食用某款产品的完整周期，支持长期结果追踪。

### 4. health_records（健康记录）

统一存储体重、症状、诊断、用药等所有健康数据。

### 5. environment_profiles（环境数据层）

记录宠物的生活环境（地区、气候、多宠家庭等）。

### 6. causal_event_chains（因果事件链）

从事件序列中推断弱因果关系。

### 7. stable_samples（长期稳定样本库）

重点积累"长期无问题数据"，对AI训练价值极高。

### 8. nlp_extractions（NLP结构化抽取）

从用户自然语言中提取结构化数据。

---

## 🔄 数据流

```
用户输入 → pet_events → Timeline → Longitudinal Data → AI训练
```

---

## 🚀 使用示例

### 创建事件

```typescript
import { createPetEvent } from '@/lib/pet-rwd';

await createPetEvent({
  pet_id: 'pet-uuid',
  event_type: 'symptom_observed',
  symptom_code: 'soft_stool',
  severity: 3,
  product_id: 'product-uuid',
  notes: '换粮2周后出现'
});
```

### 获取宠物时间线

```typescript
import { getPetTimeline } from '@/lib/pet-rwd';

const timeline = await getPetTimeline('pet-uuid');
console.log(timeline.timeline); // 完整事件序列
```

### 获取产品风险分析

```typescript
import { getProductRiskAnalysis } from '@/lib/pet-rwd';

const risk = await getProductRiskAnalysis('product-uuid');
console.log(risk.symptom_rates); // 各症状发生率
```

---

## 📊 数据库部署

执行迁移文件：

```bash
# 在Supabase Dashboard的SQL Editor中执行
cat web/lib/supabase/migration_v2_pet_rwd.sql
```

---

## 🎯 下一步

1. **执行数据库迁移** - 在Supabase中运行migration_v2_pet_rwd.sql
2. **迁移现有数据** - 将product_reviews等数据迁移到pet_events
3. **实现NLP抽取** - 集成AI模型进行文本结构化
4. **构建Timeline UI** - 展示宠物健康时间线
5. **实现因果链分析** - 从事件序列推断因果关系

---

## 📚 相关文档

- [完整架构设计](pet_rwd_architecture.md)
- [商业策划案V2.0](../business_plan_v2.md)
- [数据库迁移文件](../web/lib/supabase/migration_v2_pet_rwd.sql)

---

## ⚠️ 合规边界

平台**不做**：
- ❌ 医疗诊断
- ❌ 治疗建议
- ❌ 替代兽医

平台**做**：
- ✅ 真实世界数据展示
- ✅ 健康趋势分析
- ✅ 风险概率预测
- ✅ 建议就医
