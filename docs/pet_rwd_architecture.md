# Pet Real World Data (Pet RWD) 架构设计文档

## 文档版本

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-05-29 | 初始架构设计 |

---

## 一、架构概述

### 1.1 设计目标

将平台从"宠物社区"升级为"宠物真实世界数据基础设施"，核心目标：

- 建立中国最大的宠物长期健康结果数据库
- 支持宠物纵向健康预测AI训练
- 实现数据驱动的长期价值

### 1.2 核心理念

```
用户行为 → 结构化数据 → Timeline → Longitudinal Data → AI训练
```

所有产品功能都围绕"数据采集 → 数据结构化 → 时间线 → AI训练"展开。

---

## 二、核心架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Pet RWD Platform                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   用户输入    │  │   AI抽取     │  │   系统生成    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Unified Event System (pet_events)           │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Pet Timeline │  │  Health      │  │   Food       │         │
│  │   Engine     │  │  Records     │  │   Periods    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Data Layers                           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Trust   │ │ Medical │ │ Environ │ │ Life    │       │   │
│  │  │ Layer   │ │ Stand.  │ │ Layer   │ │ Stage   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Causal     │  │   Stable     │  │    NLP       │         │
│  │   Chains     │  │   Samples    │  │   Extract    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   AI Training Pipeline                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、核心数据表设计

### 3.1 Pet Events（统一事件系统）

**地位：全平台最核心数据表**

所有用户行为、系统事件、AI抽取结果都统一存储在 `pet_events` 表中。

```sql
pet_events
├── id (uuid, PK)
├── pet_id (uuid, FK → pets)
├── profile_id (uuid, FK → profiles)
├── event_type (pet_event_type_t)  -- 事件类型
├── event_time (timestamptz)       -- 事件时间
├── source_type (event_source_t)   -- 数据来源
├── trust_score (integer)          -- 可信度评分
├── product_id (uuid, FK)          -- 关联产品
├── review_id (uuid, FK)           -- 关联评价
├── metadata (jsonb)               -- 灵活元数据
├── symptom_code (text)            -- 标准化症状代码
├── severity (integer)             -- 严重程度 1-5
├── ai_extracted (boolean)         -- AI抽取标记
├── ai_confidence (numeric)        -- AI置信度
└── raw_text (text)                -- 原始文本
```

**事件类型覆盖：**

| 类别 | 事件 |
|------|------|
| 饮食 | food_start, food_stop, food_switch, food_amount_change |
| 健康 | symptom_observed, symptom_resolved, weight_change, energy_change |
| 医疗 | vet_visit, diagnosis, medication_start, medication_stop |
| 行为 | behavior_change, environment_change |
| 数据 | review_posted, followup_completed, photo_uploaded |

---

### 3.2 Symptom Ontology（症状标准化词典）

将用户自然语言标准化为统一代码：

```sql
symptom_ontology
├── id (uuid, PK)
├── canonical_name (text, UNIQUE)  -- 标准名称：soft_stool
├── display_name (text)            -- 显示名称：软便
├── category (text)                -- 分类：消化/皮肤/行为
├── aliases (jsonb)                -- 别名：["拉稀", "稀便", "便软"]
└── severity_default (integer)     -- 默认严重程度
```

**预置症状分类：**

| 分类 | 症状 |
|------|------|
| 消化 | 软便、呕吐、便秘、腹泻、食欲不振 |
| 皮肤 | 黑下巴、泪痕、掉毛、皮肤发红、瘙痒 |
| 行为 | 精神萎靡、过度活跃、攻击性 |
| 泌尿 | 频繁排尿、血尿、尿闭 |
| 体重 | 体重增加、体重下降 |
| 呼吸 | 打喷嚏、咳嗽、流鼻涕 |

---

### 3.3 Food Usage Periods（食品使用周期）

记录宠物食用某款产品的完整周期：

```sql
food_usage_periods
├── id (uuid, PK)
├── pet_id (uuid, FK → pets)
├── product_id (uuid, FK → products)
├── start_date (date)              -- 开始日期
├── end_date (date)                -- 结束日期
├── is_current (boolean)           -- 是否当前使用
├── daily_amount (text)            -- 每日用量
├── switch_reason (text)           -- 更换原因
├── outcome_summary (text)         -- 结果总结
├── would_continue (boolean)       -- 是否会继续
└── stability_score (integer)      -- 稳定性评分 1-5
```

---

### 3.4 Health Records（健康记录）

统一存储所有健康相关数据：

```sql
health_records
├── id (uuid, PK)
├── pet_id (uuid, FK → pets)
├── record_type (text)             -- weight/symptom/diagnosis/medication
├── record_time (timestamptz)
├── weight_kg (numeric)            -- 体重数据
├── symptom_code (text, FK)        -- 症状代码
├── severity (integer)             -- 严重程度
├── diagnosis (text)               -- 诊断
├── medication_name (text)         -- 药物名称
├── related_food_period_id (uuid)  -- 关联食品周期
└── related_event_id (uuid)        -- 关联事件
```

---

### 3.5 Environment Profiles（环境数据层）

记录宠物的生活环境：

```sql
environment_profiles
├── id (uuid, PK)
├── pet_id (uuid, FK → pets, UNIQUE)
├── region (text)                  -- 地区
├── climate_type (climate_type_t)  -- 气候类型
├── multi_pet_household (boolean)  -- 多宠家庭
├── indoor_outdoor (text)          -- 室内/室外
├── activity_level (activity_level_t) -- 活跃度
└── has_children (boolean)         -- 有无小孩
```

---

### 3.6 Life Stage History（生命周期历史）

追踪宠物的生命阶段变化：

```sql
life_stage_history
├── id (uuid, PK)
├── pet_id (uuid, FK → pets)
├── life_stage (life_stage_t)      -- kitten/young_adult/adult/senior/geriatric
├── start_date (date)
├── end_date (date)
└── is_current (boolean)
```

**生命周期定义（猫）：**

| 阶段 | 年龄 | 特征 |
|------|------|------|
| kitten | 0-1岁 | 幼年期 |
| young_adult | 1-3岁 | 青年期 |
| adult | 3-7岁 | 成年期 |
| senior | 7-10岁 | 中年期 |
| geriatric | 10岁+ | 老年期 |

---

### 3.7 Causal Event Chains（因果事件链）

记录事件之间的因果关系：

```sql
causal_event_chains
├── id (uuid, PK)
├── pet_id (uuid, FK → pets)
├── chain_name (text)              -- 链名称
├── chain_type (text)              -- food_reaction/health_progression/treatment_outcome
├── events (jsonb)                 -- 事件序列
├── confidence (numeric)           -- 因果置信度
├── is_causal (boolean)            -- 是否存在因果
└── causal_strength (numeric)      -- 因果强度
```

**事件序列示例：**

```json
[
  {"event_id": "xxx", "day_offset": 0, "description": "开始食用猫粮A"},
  {"event_id": "yyy", "day_offset": 14, "description": "出现软便"},
  {"event_id": "zzz", "day_offset": 30, "description": "症状消失"}
]
```

---

### 3.8 Stable Samples（长期稳定样本库）

重点积累"长期无问题数据"，对AI训练价值极高：

```sql
stable_samples
├── id (uuid, PK)
├── pet_id (uuid, FK → pets)
├── product_id (uuid, FK → products)
├── stable_days (integer)          -- 稳定天数
├── weight_stable (boolean)        -- 体重稳定
├── stool_stable (boolean)         -- 排便稳定
├── no_symptoms (boolean)          -- 无症状
├── stability_score (integer)      -- 稳定性评分
├── is_training_sample (boolean)   -- 是否训练样本
└── sample_quality (text)          -- excellent/good/fair/poor
```

---

### 3.9 NLP Extractions（NLP结构化抽取）

从用户自然语言中提取结构化数据：

```sql
nlp_extractions
├── id (uuid, PK)
├── source_text (text)             -- 原始文本
├── source_type (text)             -- review/post/comment/followup
├── symptoms (jsonb)               -- [{"code": "soft_stool", "confidence": 0.9}]
├── timeline_events (jsonb)        -- [{"time": "3_month", "event": "negative"}]
├── food_mentions (jsonb)          -- [{"product": "xxx", "sentiment": "negative"}]
├── processing_status (text)       -- pending/processing/completed/failed
└── confidence (numeric)           -- 整体置信度
```

---

## 四、数据流设计

### 4.1 事件驱动架构

```
用户输入
    │
    ▼
┌─────────────────┐
│   API Layer     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  pet_events     │────▶│  Trust Layer    │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Timeline       │────▶│  AI Pipeline    │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Analytics      │────▶│  Training Data  │
└─────────────────┘     └─────────────────┘
```

### 4.2 数据采集流程

1. **用户输入** → 通过表单/评价/日记采集
2. **AI抽取** → NLP模型从文本提取结构化数据
3. **系统生成** → 自动计算/触发的事件
4. **可信度计算** → 每条数据自动计算信任分数
5. **时间线关联** → 自动关联到宠物健康时间线
6. **长期追踪** → 触发追评提醒和状态更新

---

## 五、可信度系统

### 5.1 Trust Score 计算因子

| 因子 | 权重 | 说明 |
|------|------|------|
| 长期追评 | 高 | 有90天+追评数据 |
| 是否有图片 | 中 | 上传购买凭证/照片 |
| 是否连续记录 | 高 | 持续记录健康状态 |
| 是否异常文案 | 风险 | AI检测异常模式 |
| 是否广告化表达 | 风险 | 检测软广特征 |
| 是否复购 | 高 | 实际复购行为 |

### 5.2 可信度等级

| 等级 | 分数范围 | 说明 |
|------|----------|------|
| 高可信 | 80-100 | 长期追踪+完整数据 |
| 中可信 | 60-79 | 有一定历史记录 |
| 低可信 | 40-59 | 新用户/数据不完整 |
| 可疑 | 0-39 | 异常模式/风险标记 |

---

## 六、AI能力设计

### 6.1 NLP结构化抽取

**输入：** 用户自然语言文本

**输出：** 结构化JSON

```python
# 示例输入
"换粮三个月后开始软便，而且黑下巴严重"

# 示例输出
{
  "timeline": {
    "3_month": "negative"
  },
  "symptoms": [
    {"code": "soft_stool", "confidence": 0.9},
    {"code": "black_chin", "confidence": 0.85}
  ],
  "food_mention": null,
  "sentiment": "negative"
}
```

### 6.2 因果链推断

从事件序列中推断弱因果关系：

```
换粮 → 7天后软便 → 14天恢复 → 停粮改善
        ↓
    因果置信度: 0.75
```

### 6.3 长期风险预测

**输入：** 宠物画像 + 饮食历史 + 症状历史

**输出：**
- 风险概率（软便风险、黑下巴风险等）
- 适配度评分
- 长期稳定性预测

---

## 七、产品逻辑重构

### 7.1 旧逻辑（废弃）

```
用户发帖 → 社区互动 → 内容消费
```

### 7.2 新逻辑（Pet RWD）

```
用户行为 → 结构化数据 → Timeline → Longitudinal Data → AI训练
```

### 7.3 首页模块重构

| 模块 | 说明 |
|------|------|
| 长期稳定榜 | 连续6个月无问题的食品 |
| 翻车风险榜 | 近期风险上升的产品 |
| 近期风险波动 | 行业风险趋势 |
| 症状趋势分析 | 热门症状统计 |
| 类似宠物推荐 | 基于品种+画像匹配 |
| 长期复购榜 | 真实复购率排名 |

---

## 八、API设计示例

### 8.1 创建事件

```typescript
POST /api/events
{
  "pet_id": "uuid",
  "event_type": "symptom_observed",
  "symptom_code": "soft_stool",
  "severity": 3,
  "product_id": "uuid",
  "notes": "换粮2周后出现"
}
```

### 8.2 获取宠物时间线

```typescript
GET /api/pets/{petId}/timeline
Response: {
  "pet_info": {...},
  "timeline": [...],
  "food_periods": [...],
  "health_summary": {...}
}
```

### 8.3 获取产品风险分析

```typescript
GET /api/products/{productId}/risk-analysis
Response: {
  "total_users": 150,
  "symptom_rates": {
    "soft_stool": 12.5,
    "black_chin": 8.3
  },
  "life_stage_breakdown": {...}
}
```

---

## 九、数据迁移策略

### 9.1 现有数据迁移

1. **product_reviews** → 自动创建对应 pet_events
2. **review_followups** → 合并到 pet_events 时间线
3. **diet_logs** → 转换为 food_usage_periods + pet_events
4. **pet_weight_logs** → 转换为 health_records

### 9.2 迁移脚本

```sql
-- 示例：从现有review创建事件
INSERT INTO pet_events (pet_id, profile_id, event_type, event_time, product_id, review_id, metadata)
SELECT
  pet_id,
  profile_id,
  'review_posted',
  created_at,
  product_id,
  id,
  jsonb_build_object('usage_duration', usage_duration, 'overall_rating', overall_rating)
FROM product_reviews;
```

---

## 十、性能优化

### 10.1 索引策略

- pet_events: 复合索引 (pet_id, event_time DESC)
- 常用查询字段单独索引
- JSONB字段使用GIN索引

### 10.2 分区策略

当数据量达到百万级时，考虑按时间分区：

```sql
CREATE TABLE pet_events (
  ...
) PARTITION BY RANGE (event_time);
```

### 10.3 缓存策略

- 热门产品风险数据缓存
- 用户时间线缓存
- 症状统计数据缓存

---

## 十一、合规边界

### 11.1 医疗边界

平台**不做**：
- ❌ 医疗诊断
- ❌ 治疗建议
- ❌ 替代兽医
- ❌ 开具处方

平台**做**：
- ✅ 真实世界数据展示
- ✅ 健康趋势分析
- ✅ 风险概率预测
- ✅ 相似案例匹配
- ✅ 建议就医（不提供诊断）

### 11.2 数据安全

- 用户数据加密存储
- 遵守数据保护法规
- 用户可随时删除数据
- 匿名化用于AI训练

---

## 十二、未来扩展

### 12.1 环境数据扩展

- 基因数据（品种纯度、遗传风险）
- 医疗影像（X光、超声）
- 行为数据（活动量、睡眠）

### 12.2 AI能力扩展

- 图像识别（皮肤病、体态）
- 语音交互（用户口述记录）
- 预测模型（疾病风险、寿命预测）

### 12.3 B端服务扩展

- 食品公司：配方优化、翻车监控
- 医药公司：真实世界研究
- 保险公司：风险建模
- AI公司：训练数据授权

---

## 附录：术语表

| 术语 | 说明 |
|------|------|
| Pet RWD | Pet Real World Data，宠物真实世界数据 |
| Timeline | 宠物健康时间线 |
| Event Stream | 事件流 |
| Trust Score | 数据可信度评分 |
| Causal Chain | 因果事件链 |
| Stable Sample | 长期稳定样本 |
| Life Stage | 生命周期阶段 |
| Symptom Ontology | 症状标准化词典 |
