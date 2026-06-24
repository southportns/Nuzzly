# Phase 1.2 — Permission Runtime Separation Layer (v2)

## Architecture Design Document — Complete Redesign

---

## 问题回顾（你指出的5个致命缺陷）

| # | 问题 | 根因 |
|---|------|------|
| 1 | DAL 是 CRUD Repository | 表级 DAL 必然导致 N+1 Query Hell |
| 2 | DecisionPlan 不够强 | 缺少 inputs/constraints/evaluations，Replay 无法重建决策 |
| 3 | Command 直接写 DB | 没有 Event Layer，Trigger 只是从 DB 搬到了代码 |
| 4 | Audit Log 太弱 | 应该用 Event Store 替代，直接服务 Replay/Causal/Counterfactual |
| 5 | Queue Consumer 没设计 | 删除 8 个 Trigger 前必须先有 Job Runtime，否则飞轮停掉 |

---

## 1. 正确架构：四层分离

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Route / Client                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Read Model DAL (Aggregate-level, NOT table-level)     │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ dal_readRecommend│ │ dal_readBandit   │ │ dal_readOutcome  │ │
│  │ ationContext()   │ │ Context()        │ │ Context()        │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│  每个 Read Model = 一个业务场景的完整数据图，不是单表查询         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Decision Engine (Pure, Deterministic)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DecisionSnapshot (NOT DecisionPlan)                      │   │
│  │  { inputs, policy, constraints, evaluations, outputs }   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  同输入 → 同输出，零副作用，支持 Replay/Causal/Counterfactual    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Command Layer (Intent, NOT Execution)                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ CreateReviewCmd  │ │ RecordRewardCmd  │ │ ActivatePolicyCmd│ │
│  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘ │
│           │                    │                    │            │
│           ▼                    ▼                    ▼            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Event Layer (Bridge between Command and Execution)      │   │
│  │  CreateReviewCmd → ReviewCreatedEvent → Handlers         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Execution Layer (Job Runtime + Event Handlers)        │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ Sync Handlers    │ │ Async Job Queue  │ │ Event Store      │ │
│  │ (immediate write)│ │ (deferred work)  │ │ (all events)     │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**关键区别**：
- Command 不写 DB → Command 产生 Event → Event 被 Handler 处理 → Handler 写 DB
- Event 同时写入 Event Store → 直接服务 Replay/Causal/Counterfactual

---

## 2. Read Model DAL（不是 CRUD DAL）

### 设计原则

| 错误做法（CRUD DAL） | 正确做法（Read Model DAL） |
|---------------------|---------------------------|
| `dal_readProducts()` | `dal_readRecommendationContext(petId)` |
| `dal_readBanditState()` | `dal_readBanditContext(segment)` |
| `dal_readProductMetrics()` | `dal_readOutcomeContext(productId)` |
| N 次查询拼上下文 | 1 次查询返回完整上下文 |

### Read Model 定义

```typescript
// dal/read-models.ts

// ── 推荐场景 ──
export interface RecommendationContext {
  pet: {
    id: string
    species: string
    breed: string
    age: number
    lifeStage: string
    healthFlags: string[]
  }
  petHistory: {
    dietLogs: DietLog[]          // last 30 days
    healthRecords: HealthRecord[] // last 90 days
    events: PetEvent[]           // last 90 days
    usagePeriods: FoodUsagePeriod[]
  }
  productCandidates: {
    product: Product
    currentMetrics: ProductMetricsDaily
    riskIntel: RiskIntel | null
    timelineStats: TimelineStats | null
    bookmarks: number
  }[]
  userPreferences: {
    brandPreferences: string[]
    priceRange: [number, number]
    excludedIngredients: string[]
  }
}

export async function dal_readRecommendationContext(input: {
  petId: string
  candidateProductIds?: string[]
  rangeDays?: number
}): Promise<RecommendationContext>

// ── Bandit 场景 ──
export interface BanditContext {
  arms: {
    armId: string
    armName: string
    scoringEngine: string
    weightConfig: Record<string, number>
    isActive: boolean
  }[]
  state: {
    armId: string
    segment: string
    alpha: number
    beta: number
    totalPulls: number
    totalReward: number
    meanReward: number
    lastPulledAt: string
  }[]
  forcedExploration: {
    armId: string
    segment: string
    currentExposurePct: number
    targetExposurePct: number
    isBelowQuota: boolean
  }[]
  featureFlags: Record<string, FeatureFlagValue>
  rolloutStatus: RolloutStatus
}

export async function dal_readBanditContext(input: {
  segment: string
  candidateArms?: string[]
}): Promise<BanditContext>

// ── Outcome 场景 ──
export interface OutcomeContext {
  product: {
    id: string
    name: string
    brand: string
  }
  outcomeAttribution: OutcomeAttribution[]
  longitudinalScores: LongitudinalScore[]
  healthBenchmarks: HealthBenchmark[]
  effectivenessScores: EffectivenessScore[]
  causalAnalysis: CausalAnalysisResult | null
  cohortIntelligence: CohortIntelligence | null
}

export async function dal_readOutcomeContext(input: {
  productId: string
}): Promise<OutcomeContext>

// ── Policy 场景 ──
export interface PolicyContext {
  globalPolicy: GlobalPolicyConfig | null
  segmentPolicies: SegmentPolicy[]
  activeStrategies: StrategyRecord[]
  constraintConfig: {
    hard: HardConstraints
    soft: SoftConstraints
  }
  objectiveWeights: ObjectiveWeights
  rollbackHistory: RollbackEvent[]
}

export async function dal_readPolicyContext(): Promise<PolicyContext>

// ── Admin 场景 ──
export interface AdminDashboardContext {
  stats: {
    userCount: number
    petCount: number
    productCount: number
    reviewCount: number
    reviewLast7d: number
    flaggedCount: number
  }
  recentReviews: ReviewSummary[]
  flaggedUsers: ProfileSummary[]
  systemHealth: {
    banditArmsActive: number
    activeStrategies: number
    pendingJobs: number
    lastPolicyCompute: string | null
  }
}

export async function dal_readAdminDashboardContext(): Promise<AdminDashboardContext>
```

### Read Model 实现策略

```typescript
// 每个 Read Model 使用 PostgreSQL 视图 + json_build_object 一次性返回

// 示例：recommendation_context 视图
// CREATE VIEW dal_recommendation_context AS
// SELECT
//   p.id as pet_id,
//   json_build_object(
//     'pet', json_build_object(...),
//     'petHistory', json_build_object(
//       'dietLogs', (SELECT json_agg(...) FROM diet_logs WHERE pet_id = p.id),
//       'healthRecords', (SELECT json_agg(...) FROM health_records WHERE pet_id = p.id),
//       ...
//     ),
//     'productCandidates', (
//       SELECT json_agg(json_build_object(
//         'product', to_json(pr),
//         'currentMetrics', (SELECT to_json(m) FROM product_metrics_daily m WHERE m.product_id = pr.id),
//         ...
//       ))
//       FROM products pr WHERE ...
//     )
//   ) as context
// FROM pets p WHERE p.id = $1;

// TypeScript 调用：
// const { data } = await supabase.rpc('dal_get_recommendation_context', { p_pet_id: petId })
// return data.context as RecommendationContext
```

**关键优势**：
- 1 次查询 = 完整业务上下文
- 0 次 N+1 查询
- Decision Layer 不需要拼数据，直接消费 Read Model

---

## 3. DecisionSnapshot（不是 DecisionPlan）

### 设计原则

DecisionSnapshot 必须支持：
- **Replay**：完全重建历史决策
- **Causal**：分析决策与结果的因果关系
- **Counterfactual**：回答"如果当时选了另一个 arm 会怎样"

### DecisionSnapshot 结构

```typescript
// decision/types.ts

export interface DecisionSnapshot {
  // ── 元数据 ──
  snapshot_id: string          // UUID
  correlation_id: string       // 跨事件关联（同一请求的所有事件共享）
  causation_id: string | null  // 因果链（如果是响应另一个事件）
  timestamp: string            // ISO 8601
  request_id: string

  // ── Inputs: 决策时的完整输入 ──
  inputs: {
    userId: string | null
    sessionId: string | null
    petId: string | null
    productId: string | null
    segment: string
    readModelVersion: string   // Read Model 的版本（用于 replay 时验证数据兼容性）
    readModelHash: string      // Read Model 内容的 hash（用于检测数据漂移）
  }

  // ── Policy: 决策时生效的策略 ──
  policy: {
    globalPolicyVersion: string | null
    activeStrategyId: string | null
    segmentPolicyVersion: string | null
    objectiveWeights: ObjectiveWeights
    featureFlags: Record<string, FeatureFlagValue>
    rolloutStatus: RolloutStatus
    banditEnabled: boolean
    abTestActive: boolean
    abGroup: "control" | "treatment" | null
  }

  // ── Constraints: 决策时的约束 ──
  constraints: {
    hardConstraints: HardConstraints
    softConstraints: SoftConstraints
    activeRollback: boolean
    rollbackReason: string | null
    safetyGates: {
      latencyBudgetMs: number
      minQualityScore: number
      diversityThreshold: number
    }
  }

  // ── Evaluations: 决策过程中的所有评估步骤 ──
  evaluations: {
    step: string               // "flag_evaluation" | "rollout_decision" | "bandit_selection" | ...
    input: unknown             // 该步骤的输入
    output: unknown            // 该步骤的输出
    duration_ms: number        // 该步骤耗时
    confidence: number         // 该步骤的置信度 (0-1)
    alternatives_considered: { // 考虑过的其他选项
      option: string
      score: number
      reason_rejected: string | null
    }[]
  }[]

  // ── Outputs: 最终决策结果 ──
  outputs: {
    action: string             // "use_bandit_arm" | "use_review_engine" | ...
    armId: string | null
    weightConfig: { timeline: number; review: number } | null
    scoringEngine: "review" | "timeline" | "blend"
    decisionPath: DecisionPath
    confidence: number
    latency_total_ms: number
  }

  // ── Fidelity: 用于 Replay 的保真度信息 ──
  fidelity: {
    level: "HIGH" | "MED" | "LOW"
    score: number              // 0-100
    completeInputs: boolean    // 所有输入是否完整
    completePolicy: boolean    // 策略快照是否完整
    completeEvaluations: boolean // 评估步骤是否完整
  }
}
```

### DecisionSnapshot 生成流程

```typescript
// decision/policy-engine.ts

export async function computeDecisionSnapshot(input: {
  requestId: string
  userId?: string
  petId?: string
  productId?: string
}): Promise<DecisionSnapshot> {
  const t0 = performance.now()
  const correlationId = generateCorrelationId(input.requestId)

  // 1. 读取 Read Models（一次性获取所有需要的数据）
  const [banditCtx, policyCtx] = await Promise.all([
    dal_readBanditContext({ segment: "global" }),
    dal_readPolicyContext(),
  ])

  // 2. 构建 inputs
  const inputs: DecisionSnapshot["inputs"] = {
    userId: input.userId ?? null,
    sessionId: null, // TODO: from request context
    petId: input.petId ?? null,
    productId: input.productId ?? null,
    segment: "global",
    readModelVersion: "1.0.0",
    readModelHash: hashReadModels(banditCtx, policyCtx),
  }

  // 3. 构建 policy snapshot
  const policy: DecisionSnapshot["policy"] = {
    globalPolicyVersion: policyCtx.globalPolicy?.version ?? null,
    activeStrategyId: policyCtx.activeStrategies[0]?.strategy_id ?? null,
    segmentPolicyVersion: null,
    objectiveWeights: policyCtx.objectiveWeights,
    featureFlags: banditCtx.featureFlags,
    rolloutStatus: banditCtx.rolloutStatus,
    banditEnabled: banditCtx.featureFlags["bandit_enabled"]?.enabled ?? false,
    abTestActive: banditCtx.featureFlags["ab_test_enabled"]?.enabled ?? false,
    abGroup: null, // computed below
  }

  // 4. 构建 constraints
  const constraints: DecisionSnapshot["constraints"] = {
    hardConstraints: policyCtx.constraintConfig.hard,
    softConstraints: policyCtx.constraintConfig.soft,
    activeRollback: policyCtx.rollbackHistory.length > 0,
    rollbackReason: policyCtx.rollbackHistory[0]?.reason ?? null,
    safetyGates: { ... },
  }

  // 5. 执行决策步骤（记录每个步骤的 evaluation）
  const evaluations: DecisionSnapshot["evaluations"] = []

  // Step 5a: Flag evaluation
  const flagEval = evaluateFlags(banditCtx.featureFlags)
  evaluations.push(flagEval)

  // Step 5b: Rollout decision
  const rolloutEval = evaluateRollout(flagEval.output, inputs.userId)
  evaluations.push(rolloutEval)

  // Step 5c: Bandit selection (if applicable)
  let banditEval: Evaluation | null = null
  if (rolloutEval.output.engine === "blend" && policy.banditEnabled) {
    banditEval = evaluateBanditSelection(banditCtx, rolloutEval.output)
    evaluations.push(banditEval)
  }

  // 6. 构建 outputs
  const finalEval = evaluations[evaluations.length - 1]
  const outputs: DecisionSnapshot["outputs"] = {
    action: determineAction(finalEval.output),
    armId: banditEval?.output.armId ?? null,
    weightConfig: banditEval?.output.weightConfig ?? null,
    scoringEngine: finalEval.output.engine,
    decisionPath: finalEval.output.decisionPath,
    confidence: computeConfidence(evaluations),
    latency_total_ms: performance.now() - t0,
  }

  // 7. 构建 fidelity
  const fidelity = computeFidelity(inputs, policy, constraints, evaluations)

  return {
    snapshot_id: generateUUID(),
    correlation_id: correlationId,
    causation_id: null,
    timestamp: new Date().toISOString(),
    request_id: input.requestId,
    inputs,
    policy,
    constraints,
    evaluations,
    outputs,
    fidelity,
  }
}
```

### DecisionSnapshot 与 Replay 的关系

```
DecisionSnapshot 写入 Event Store
  ↓
Replay Engine 读取 Event Store
  ↓
重建完整决策过程：
  - inputs → 可以用当时的数据重建
  - policy → 可以用当时的策略重建
  - evaluations → 可以逐步重放
  - outputs → 可以对比差异

Counterfactual 分析：
  - 修改 inputs 中的一个值
  - 重放 evaluations
  - 对比 outputs 差异
  → "如果 bandit 选了另一个 arm，结果会怎样？"
```

---

## 4. Event Layer（Command 和 Execution 之间的桥梁）

### 设计原则

```
Command 不写 DB
Command 产生 Event
Event 被 Handler 处理
Handler 写 DB
Event 同时写入 Event Store
```

### Event 定义

```typescript
// events/types.ts

export interface DomainEvent {
  event_id: string             // UUID
  event_type: string           // "ReviewCreated" | "BanditRewardRecorded" | ...
  aggregate_id: string         // 聚合根 ID（如 review_id, arm_id）
  aggregate_type: string       // "Review" | "BanditArm" | ...
  payload: Record<string, unknown>  // 事件数据
  metadata: {
    correlation_id: string     // 跨事件关联
    causation_id: string | null // 因果链
    decision_id: string | null  // 关联的 DecisionSnapshot ID
    user_id: string | null
    request_id: string
    timestamp: string
    version: number            // 聚合版本
  }
}
```

### Command → Event → Handler 流程

```typescript
// commands/create-review-command.ts

export class CreateReviewCommand {
  async execute(input: CreateReviewInput): Promise<CommandResult> {
    // 1. Validate
    this.validate(input)

    // 2. 产生 Event（不写 DB）
    const event: DomainEvent = {
      event_id: generateUUID(),
      event_type: "ReviewCreated",
      aggregate_id: input.reviewId,
      aggregate_type: "Review",
      payload: {
        productId: input.productId,
        authorId: input.authorId,
        overallRating: input.overallRating,
        reviewText: input.reviewText,
        usageDuration: input.usageDuration,
      },
      metadata: {
        correlation_id: input.correlationId,
        causation_id: null,
        decision_id: input.decisionId ?? null,
        user_id: input.authorId,
        request_id: input.requestId,
        timestamp: new Date().toISOString(),
        version: 1,
      },
    }

    // 3. 发布 Event
    await eventBus.publish(event)

    return { success: true, eventId: event.event_id }
  }
}

// events/handlers/review-created-handler.ts

export class ReviewCreatedHandler {
  // 同步 Handler：立即写 DB
  async handleSync(event: DomainEvent): Promise<void> {
    await dal_writeReview({
      id: event.aggregate_id,
      product_id: event.payload.productId,
      author_id: event.payload.authorId,
      overall_rating: event.payload.overallRating,
      review_text: event.payload.reviewText,
      usage_duration: event.payload.usageDuration,
    })
  }

  // 异步 Handler：加入 Job Queue
  async handleAsync(event: DomainEvent): Promise<void> {
    await jobQueue.enqueue({
      jobType: "create_pet_event_from_review",
      aggregateId: event.aggregate_id,
      payload: event.payload,
      metadata: event.metadata,
      priority: 5,
      maxRetries: 3,
    })

    await jobQueue.enqueue({
      jobType: "create_followup_schedules",
      aggregateId: event.aggregate_id,
      payload: event.payload,
      metadata: event.metadata,
      priority: 5,
      maxRetries: 3,
    })

    await jobQueue.enqueue({
      jobType: "enqueue_reputation_job",
      aggregateId: event.aggregate_id,
      payload: { authorId: event.payload.authorId },
      metadata: event.metadata,
      priority: 3,
      maxRetries: 3,
    })
  }
}
```

### Event Bus

```typescript
// events/event-bus.ts

interface EventHandler {
  eventType: string
  handler: (event: DomainEvent) => Promise<void>
  mode: "sync" | "async"
}

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map()

  register(handler: EventHandler): void {
    const list = this.handlers.get(handler.eventType) ?? []
    list.push(handler)
    this.handlers.set(handler.eventType, list)
  }

  async publish(event: DomainEvent): Promise<void> {
    // 1. 写入 Event Store（所有事件持久化）
    await eventStore.append(event)

    // 2. 执行 sync handlers（立即）
    const syncHandlers = this.handlers.get(event.event_type)?.filter(h => h.mode === "sync") ?? []
    await Promise.all(syncHandlers.map(h => h.handler(event)))

    // 3. 调度 async handlers（加入队列）
    const asyncHandlers = this.handlers.get(event.event_type)?.filter(h => h.mode === "async") ?? []
    for (const handler of asyncHandlers) {
      await jobQueue.enqueue({
        jobType: `handle_${event.event_type}`,
        aggregateId: event.aggregate_id,
        payload: event.payload,
        metadata: event.metadata,
        handlerId: handler.handler.name,
      })
    }
  }
}
```

---

## 5. Event Store（替代 command_audit_log）

### 数据库设计

```sql
-- Event Store 表（替代 audit log）
-- 这个表直接服务 Replay / Causal / Counterfactual

CREATE TABLE IF NOT EXISTS public.event_store (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  aggregate_id    uuid NOT NULL,
  aggregate_type  text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  metadata        jsonb NOT NULL DEFAULT '{}',
  -- 因果链
  causation_id    uuid,                    -- 哪个事件导致了这个事件
  correlation_id  uuid NOT NULL,           -- 同一请求的所有事件共享
  decision_id     uuid,                    -- 关联的 DecisionSnapshot
  -- 排序
  stream_version  integer NOT NULL,        -- 聚合内版本号
  global_sequence bigint NOT NULL DEFAULT nextval('event_store_seq'),
  -- 时间
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- 约束
  UNIQUE(aggregate_type, aggregate_id, stream_version)
);

CREATE SEQUENCE IF NOT EXISTS event_store_seq;

-- 索引
CREATE INDEX idx_event_store_correlation ON public.event_store(correlation_id);
CREATE INDEX idx_event_store_causation ON public.event_store(causation_id);
CREATE INDEX idx_event_store_decision ON public.event_store(decision_id);
CREATE INDEX idx_event_store_aggregate ON public.event_store(aggregate_type, aggregate_id, stream_version);
CREATE INDEX idx_event_store_type ON public.event_store(event_type);
CREATE INDEX idx_event_store_created ON public.event_store(created_at DESC);
```

### Event Store 与 Replay 的关系

```
event_store 表
  ↓
Replay Engine 查询：
  SELECT * FROM event_store
  WHERE correlation_id = ?
  ORDER BY global_sequence

  → 重建完整请求生命周期
  → 对比原始决策 vs 重放决策
  → 检测 divergence

Causal Analysis 查询：
  SELECT * FROM event_store
  WHERE causation_id = ?

  → 追踪事件因果链
  → "这个 ReviewCreated 导致了哪些后续事件？"

Counterfactual 查询：
  SELECT * FROM event_store
  WHERE decision_id = ?

  → "如果当时选了另一个 arm，会产生什么事件？"
```

### DecisionSnapshot 写入 Event Store

```typescript
// 每次决策产生一个 DecisionSnapshot 事件

const snapshot = await computeDecisionSnapshot(input)

const decisionEvent: DomainEvent = {
  event_id: snapshot.snapshot_id,
  event_type: "DecisionSnapshotCreated",
  aggregate_id: snapshot.request_id,
  aggregate_type: "Decision",
  payload: {
    inputs: snapshot.inputs,
    policy: snapshot.policy,
    constraints: snapshot.constraints,
    evaluations: snapshot.evaluations,
    outputs: snapshot.outputs,
    fidelity: snapshot.fidelity,
  },
  metadata: {
    correlation_id: snapshot.correlation_id,
    causation_id: null,
    decision_id: snapshot.snapshot_id,
    user_id: snapshot.inputs.userId,
    request_id: snapshot.request_id,
    timestamp: snapshot.timestamp,
    version: 1,
  },
}

await eventBus.publish(decisionEvent)
```

---

## 6. Job Runtime（Phase 1.2 的第一优先级）

### 为什么这是第一优先级

```
当前状态：
  8 个 Trigger 在生产运行
  pending_computation_jobs 表存在但无消费者

如果先删除 Trigger：
  ❌ Followup 不生成
  ❌ Metrics 不刷新
  ❌ Bandit 不学习
  ❌ Outcome 不计算
  ❌ 整个飞轮停掉

正确顺序：
  1. 实现 Job Runtime（消费者）
  2. 验证消费者正常工作
  3. 迁移 Trigger → Event → Job
  4. 删除 Trigger
```

### Job Runtime 设计

```typescript
// jobs/runtime.ts

interface JobDefinition {
  jobType: string
  handler: (job: JobRecord) => Promise<void>
  concurrency: number        // 最大并发
  retryPolicy: {
    maxRetries: number
    backoffMs: number
    backoffMultiplier: number
  }
  timeoutMs: number
}

interface JobRecord {
  id: string
  jobType: string
  aggregateId: string | null
  payload: Record<string, unknown>
  metadata: {
    correlation_id: string
    causation_id: string | null
    decision_id: string | null
    user_id: string | null
    request_id: string
  }
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter"
  priority: number           // 1-10, 1 = highest
  retryCount: number
  maxRetries: number
  error: string | null
  createdAt: string
  processedAt: string | null
  completedAt: string | null
}

class JobRuntime {
  private registry: Map<string, JobDefinition> = new Map()
  private running = false

  register(def: JobDefinition): void {
    this.registry.set(def.jobType, def)
  }

  async start(): Promise<void> {
    this.running = true
    while (this.running) {
      await this.processNextBatch()
      await sleep(100) // 避免空转
    }
  }

  async stop(): Promise<void> {
    this.running = false
  }

  private async processNextBatch(): Promise<void> {
    // 1. 获取待处理任务（按优先级排序）
    const jobs = await this.fetchPendingJobs(10)

    // 2. 按类型分组，限制并发
    const byType = new Map<string, JobRecord[]>()
    for (const job of jobs) {
      const list = byType.get(job.jobType) ?? []
      list.push(job)
      byType.set(job.jobType, list)
    }

    // 3. 并行处理
    const promises: Promise<void>[] = []
    for (const [jobType, jobList] of byType) {
      const def = this.registry.get(jobType)
      if (!def) {
        console.error(`[JobRuntime] No handler for job type: ${jobType}`)
        await this.markDeadLetter(jobList[0].id, `No handler for ${jobType}`)
        continue
      }

      const concurrency = Math.min(jobList.length, def.concurrency)
      for (let i = 0; i < concurrency; i++) {
        const job = jobList[i]
        promises.push(this.executeJob(job, def))
      }
    }

    await Promise.allSettled(promises)
  }

  private async executeJob(job: JobRecord, def: JobDefinition): Promise<void> {
    const t0 = performance.now()

    try {
      // 标记为 processing
      await this.markProcessing(job.id)

      // 执行（带超时）
      await Promise.race([
        def.handler(job),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Job timeout")), def.timeoutMs)
        ),
      ])

      // 标记为 completed
      await this.markCompleted(job.id, performance.now() - t0)

    } catch (error) {
      const errorMessage = (error as Error).message

      if (job.retryCount < job.maxRetries) {
        // 重试（指数退避）
        const backoffMs = def.retryPolicy.backoffMs *
          Math.pow(def.retryPolicy.backoffMultiplier, job.retryCount)
        await this.scheduleRetry(job.id, errorMessage, backoffMs)
      } else {
        // 进入死信队列
        await this.markDeadLetter(job.id, errorMessage)
      }
    }
  }

  // DB 操作
  private async fetchPendingJobs(limit: number): Promise<JobRecord[]> { ... }
  private async markProcessing(jobId: string): Promise<void> { ... }
  private async markCompleted(jobId: string, durationMs: number): Promise<void> { ... }
  private async scheduleRetry(jobId: string, error: string, backoffMs: number): Promise<void> { ... }
  private async markDeadLetter(jobId: string, error: string): Promise<void> { ... }
}
```

### Job 注册（替代 Trigger）

```typescript
// jobs/registry.ts

const jobRuntime = new JobRuntime()

// 替代 after_review_create_event trigger
jobRuntime.register({
  jobType: "create_pet_event_from_review",
  handler: async (job: JobRecord) => {
    const { productId, authorId, reviewText } = job.payload
    await createPetEventFromReview({ productId, authorId, reviewText })
  },
  concurrency: 5,
  retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
  timeoutMs: 30_000,
})

// 替代 after_review_insert trigger
jobRuntime.register({
  jobType: "create_followup_schedules",
  handler: async (job: JobRecord) => {
    const { reviewId, productId } = job.payload
    await createFollowupSchedules({ reviewId, productId })
  },
  concurrency: 5,
  retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
  timeoutMs: 15_000,
})

// 替代 after_review_insert_reputation trigger
jobRuntime.register({
  jobType: "enqueue_reputation_job",
  handler: async (job: JobRecord) => {
    const { authorId } = job.payload
    await enqueueReputationJob(authorId)
  },
  concurrency: 2,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

// 替代 after_followup_entry_insert trigger
jobRuntime.register({
  jobType: "enqueue_metrics_refresh_job",
  handler: async (job: JobRecord) => {
    const { productId } = job.payload
    await enqueueMetricsRefreshJob(productId)
  },
  concurrency: 2,
  retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
  timeoutMs: 60_000,
})

// 替代 after_timeline_event_insert + tle_after_insert/update triggers
jobRuntime.register({
  jobType: "recalc_timeline_trust",
  handler: async (job: JobRecord) => {
    const { timelineGroupId } = job.payload
    await recalcTimelineTrust(timelineGroupId)
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
  timeoutMs: 120_000,
})

// 替代 after_timeline_group_insert trigger
jobRuntime.register({
  jobType: "generate_timeline_metrics",
  handler: async (job: JobRecord) => {
    const { productId } = job.payload
    await generateTimelineMetrics(productId)
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
  timeoutMs: 120_000,
})

// 替代 after_timeline_metrics_insert trigger
jobRuntime.register({
  jobType: "trigger_score_comparison",
  handler: async (job: JobRecord) => {
    const { productId } = job.payload
    await triggerScoreComparison(productId)
  },
  concurrency: 1,
  retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
  timeoutMs: 120_000,
})

export { jobRuntime }
```

### Job Runtime 部署方式

```
开发环境：
  - Next.js API route 启动时初始化 Job Runtime
  - 同一进程内运行

生产环境（推荐）：
  - 独立的 Edge Function / Worker
  - 从 pending_computation_jobs 表拉取任务
  - 水平扩展（多实例竞争消费）

过渡方案（当前）：
  - Next.js serverless function 作为 cron trigger
  - 每 30 秒调用一次 /api/jobs/process
  - 每次处理最多 10 个任务
```

### 过渡方案实现

```typescript
// app/api/jobs/process/route.ts

import { NextResponse } from "next/server"
import { jobRuntime } from "@/jobs/registry"

// 由 cron job 每 30 秒调用
export async function POST() {
  // 启动 runtime（处理一批后停止）
  const startPromise = jobRuntime.start()

  // 等待 25 秒后停止
  setTimeout(() => jobRuntime.stop(), 25_000)

  await startPromise

  return NextResponse.json({ status: "ok" })
}
```

---

## 7. 完整实施顺序

### Phase 1.2.1 — Event Store + Job Runtime（第一优先级）

| 步骤 | 内容 | 验证 |
|------|------|------|
| 1 | 创建 `event_store` 表 | 表创建成功，索引正常 |
| 2 | 创建 `event_store_seq` 序列 | 序列正常递增 |
| 3 | 实现 `EventBus` + `EventStore` | 事件可写入，可查询 |
| 4 | 实现 `JobRuntime` | 任务可注册、可执行、可重试 |
| 5 | 注册 7 个 Job Handler | 所有 handler 注册成功 |
| 6 | 实现 `/api/jobs/process` cron | cron 可触发，任务可处理 |
| 7 | 集成测试：手动触发 Job | Job 执行成功，结果正确 |

### Phase 1.2.2 — Read Model DAL

| 步骤 | 内容 | 验证 |
|------|------|------|
| 1 | 创建 `dal_recommendation_context` 视图 | 视图返回完整上下文 |
| 2 | 创建 `dal_bandit_context` 视图 | 视图返回完整 bandit 状态 |
| 3 | 创建 `dal_outcome_context` 视图 | 视图返回完整 outcome 数据 |
| 4 | 创建 `dal_policy_context` 视图 | 视图返回完整 policy 配置 |
| 5 | 创建 `dal_admin_dashboard_context` 视图 | 视图返回完整 admin 数据 |
| 6 | 替换现有 N+1 查询 | 查询次数从 N 降到 1 |

### Phase 1.2.3 — DecisionSnapshot + Event Layer

| 步骤 | 内容 | 验证 |
|------|------|------|
| 1 | 实现 `DecisionSnapshot` 类型 | 类型完整，包含 inputs/policy/constraints/evaluations/outputs |
| 2 | 实现 `computeDecisionSnapshot()` | 快照可生成，fidelity 正确 |
| 3 | 实现 `Command → Event → Handler` 流程 | Command 产生 Event，Handler 处理 |
| 4 | 实现 `DecisionSnapshotCreated` 事件 | 每次决策写入 Event Store |
| 5 | 集成测试：完整请求生命周期 | 从 API → Decision → Command → Event → Handler → DB |

### Phase 1.2.4 — Trigger 迁移到 Event

| 步骤 | 内容 | 验证 |
|------|------|------|
| 1 | 验证 Job Runtime 正常运行 | 生产环境稳定运行 24 小时 |
| 2 | 迁移 `after_review_create_event` → Event | Followup 正常生成 |
| 3 | 迁移 `after_review_insert` → Event | Metrics 正常刷新 |
| 4 | 迁移 `after_review_insert_reputation` → Event | Bandit 正常学习 |
| 5 | 迁移 `after_followup_entry_insert` → Event | Outcome 正常计算 |
| 6 | 迁移 timeline triggers → Event | Timeline trust 正常计算 |
| 7 | 删除 8 个 Trigger | 所有功能正常，无回归 |

### Phase 1.2.5 — SECURITY DEFINER 清理

| 步骤 | 内容 | 验证 |
|------|------|------|
| 1 | 审查 12 个 SECURITY DEFINER 函数 | 分类：保留/替换/删除 |
| 2 | 替换为 role-aware 函数 | 功能不变，权限正确 |
| 3 | 迁移删除 SECURITY DEFINER | 无应用代码依赖提权 |
| 4 | 集成测试 | 所有功能正常 |

---

## 8. 风险降低总结

### 消除的漏洞类别

| 风险类别 | 消除方式 |
|---------|---------|
| N+1 Query Hell | Read Model DAL（1 次查询 = 完整上下文） |
| Replay 信息不足 | DecisionSnapshot（完整 inputs/policy/constraints/evaluations/outputs） |
| Trigger 副作用 | Event Layer + Job Runtime（显式、可审计、可重试） |
| 不可审计变更 | Event Store（所有事件持久化，支持因果链追踪） |
| Job 队列无消费者 | Job Runtime（第一优先级实施） |
| 隐藏提权路径 | SECURITY DEFINER 清理（最后实施） |

### 剩余风险

| 风险 | 描述 | 缓解 |
|------|------|------|
| Job Runtime 单点 | 过渡方案是 cron trigger | 生产环境迁移到独立 Worker |
| Event Store 增长 | 事件表会快速增长 | 定期归档旧事件到冷存储 |
| Read Model 视图性能 | 复杂视图可能慢 | 添加物化视图 + 定期刷新 |

---

## 9. 关键设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| DAL 设计 | Read Model（非 CRUD） | 避免 N+1，支持复杂业务场景 |
| 决策输出 | DecisionSnapshot（非 DecisionPlan） | 支持 Replay/Causal/Counterfactual |
| Command 执行 | Event Layer（非直接写 DB） | 避免 Trigger 搬移到代码 |
| 审计存储 | Event Store（非 audit_log） | 直接服务 Replay/Causal |
| 实施顺序 | Job Runtime 第一 | 删除 Trigger 前必须有消费者 |
