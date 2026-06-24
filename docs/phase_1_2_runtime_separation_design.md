# Phase 1.2 — Permission Runtime Separation Layer

## Architecture Design Document

---

## 1. Current System Boundary Map

### Where Logic Currently Lives

| Component | Location | Logic Type | Problem |
|-----------|----------|------------|---------|
| `bandit-policy.ts` | `web/lib/timeline/` | Decision + Data Access mixed | Reads DB state, performs Thompson Sampling, writes rewards — all in one module |
| `rollout-controller.ts` | `web/lib/timeline/` | Decision only | Clean — pure decision logic with flag reads |
| `global-policy-orchestrator.ts` | `web/lib/timeline/` | Decision + Data Access mixed | Computes policy AND persists to DB |
| `cross-segment-policy.ts` | `web/lib/timeline/` | Decision only | Clean — reads segment config, computes adjustments |
| `strategy-registry.ts` | `web/lib/timeline/` | Decision + Data Access mixed | Manages strategies AND persists to DB |
| `admin-queries.ts` | `web/lib/supabase/queries/` | Data Access + Authorization mixed | Uses `createAdminClient()` (service_role) for cross-table reads |
| `createAdminClient()` | `web/lib/supabase/admin.ts` | Raw service_role access | Bypasses RLS entirely — no audit trail |
| 12 SECURITY DEFINER functions | `public` schema | Hidden privilege escalation | Execute with elevated permissions, some write to unrelated tables |
| 8 heavy triggers | `public`/`pflid` | Implicit side effects | Cross-table mutations, job enqueuing, reputation computation |

### Where Logic Should Move

| Current Location | Target Layer | Reason |
|-----------------|--------------|--------|
| Thompson Sampling in `bandit-policy.ts` | Decision Layer | Pure computation — same inputs → same output |
| DB reads in `bandit-policy.ts` (`listActiveArms`, `getBanditState`) | DAL Read | Deterministic data access only |
| DB writes in `bandit-policy.ts` (`recordBanditReward`) | Command Layer | Mutation must be explicit and auditable |
| Policy computation in `global-policy-orchestrator.ts` | Decision Layer | Pure computation |
| DB persistence in `global-policy-orchestrator.ts` (`savePolicyConfig`, `activatePolicy`) | Command Layer | Mutation must be explicit |
| `admin-queries.ts` service_role reads | DAL Read | Cross-table reads should go through controlled DAL |
| SECURITY DEFINER functions | Command Layer / DAL | Must be replaced with explicit role-aware operations |
| Heavy triggers | Async Command Queue | Side effects must be deferred and auditable |

---

## 2. Layer Separation Design

### Layer 1: Data Access Layer (DAL)

**Purpose**: Deterministic, role-aware data access. No business logic. No decisions.

#### DAL Read Functions

```typescript
// dal/read.ts

// ── User Data (TIER 1) ──
export async function dal_readProfile(userId: string)
export async function dal_readPets(profileId: string)
export async function dal_readHealthRecords(petId: string)
export async function dal_readProductReviews(productId: string, opts?: { limit?: number })

// ── System Data (TIER 2) ──
export async function dal_readBanditArms(segment?: string)
export async function dal_readBanditState(armIds: string[], segment: string)
export async function dal_readFeatureFlag(key: string, environment: string)
export async function dal_readRolloutStatus()
export async function dal_readGlobalPolicyConfig(status: string)
export async function dal_readStrategyRegistry(status?: string)
export async function dal_readSegmentPolicies()

// ── Analytics Data (TIER 3) ──
export async function dal_readProductMetrics(productId: string, dateRange?: { from: Date; to: Date })
export async function dal_readTimelineStats(productId: string)
export async function dal_readOutcomeIntel(productId: string)
export async function dal_readRiskIntel(productId: string)

// ── Admin Cross-Table Reads (replaces service_role) ──
export async function dal_adminStats()           // replaces getAdminStats()
export async function dal_adminListUsers(opts)   // replaces listUsers()
export async function dal_adminListProducts(opts) // replaces listProductsForAdmin()
export async function dal_adminListReviews(opts)  // replaces listReviewsForAdmin()
```

**DAL Rules**:
- MUST use `authenticated` role client (RLS enforced)
- MUST NOT contain conditional business logic
- MUST NOT call external services
- MUST NOT make decisions based on data
- MUST return raw data only

#### DAL Write Functions

```typescript
// dal/write.ts

// ── User Data Writes ──
export async function dal_writeProfile(userId: string, data: Partial<Profile>)
export async function dal_writePet(petId: string, data: Partial<Pet>)
export async function dal_writeHealthRecord(recordId: string, data: Partial<HealthRecord>)

// ── System Data Writes (service_role via Command Layer only) ──
// NOTE: These are NOT exported directly — only Command Layer may call them
// Internal functions:
//   _dal_writeBanditState()
//   _dal_writeBanditReward()
//   _dal_writePolicyConfig()
//   _dal_writeStrategy()
//   _dal_writeFeatureFlag()
```

**DAL Write Rules**:
- User data writes: use `authenticated` role (RLS owner-based)
- System data writes: internal only, called by Command Layer
- MUST NOT contain business logic
- MUST NOT trigger side effects
- MUST return affected row(s) for audit logging

---

### Layer 2: Decision Layer (Policy Engine)

**Purpose**: Pure computation. Same inputs → same outputs. No DB writes.

#### Decision Engine Design

```typescript
// decision/policy-engine.ts

// ── Input ──
interface DecisionInput {
  userId?: string
  sessionId?: string
  requestId: string
  context: {
    featureFlags: Record<string, FeatureFlagValue>
    banditState: BanditStateSnapshot[]
    rolloutStatus: RolloutStatus
    globalPolicy: GlobalPolicyConfig | null
    segmentAdjustments: SegmentPolicyAdjustment[]
  }
}

// ── Output: Decision Plan ──
interface DecisionPlan {
  action: "use_bandit_arm" | "use_review_engine" | "use_blend" | "rollback"
  armId?: string
  weightConfig?: { timeline: number; review: number }
  rolloutGroup?: "control" | "treatment" | "partial" | "full"
  policyVersion?: string
  segment?: string
  confidence: number
  trace: DecisionTrace[]
}

// ── Pure Decision Functions ──
export function decideScoringEngine(input: DecisionInput): DecisionPlan
export function decideBanditArm(input: DecisionInput, candidates: string[]): ArmSelection
export function decideSegmentAdjustment(input: DecisionInput): SegmentPolicyAdjustment[]
export function decideRolloutPath(input: DecisionInput): DecisionPath
export function decideFeatureFlagEvaluation(flags: Record<string, FeatureFlagValue>, context: {}): FlagEvaluationResult
```

**Decision Layer Rules**:
- MUST be pure functions (no side effects)
- MUST NOT write to database
- MUST NOT call external services
- MUST produce deterministic output for same inputs
- MUST produce a `DecisionPlan` object
- MUST include decision trace for auditability

#### Current Modules → Decision Layer Mapping

| Current Module | Decision Function | Purity Status |
|---------------|-------------------|---------------|
| `rollout-controller.ts` → `decideEngine()` | `decideRolloutPath()` | 80% pure (reads flags via DB) |
| `bandit-policy.ts` → `selectBanditArm()` | `decideBanditArm()` | 60% pure (reads/writes DB) |
| `global-policy-orchestrator.ts` → `computeGlobalPolicy()` | `computePolicyConfig()` | 40% pure (persists to DB) |
| `cross-segment-policy.ts` → `computeAllSegmentAdjustments()` | `decideSegmentAdjustment()` | 90% pure |
| `feature-flags.ts` → `getFlag()` | `decideFeatureFlagEvaluation()` | 70% pure (reads DB) |

---

### Layer 3: Execution Layer (Command Runtime)

**Purpose**: All mutations go through explicit, auditable commands.

#### Command Objects

```typescript
// commands/types.ts

interface Command<TInput, TOutput> {
  name: string
  version: string
  execute(input: TInput): Promise<CommandResult<TOutput>>
  validate(input: TInput): ValidationResult
  rollback?(output: TOutput): Promise<void>
}

interface CommandResult<T> {
  success: boolean
  data: T | null
  error: string | null
  auditLog: AuditEntry
  executedAt: string
  requestId: string
}

interface AuditEntry {
  commandName: string
  input: unknown
  output: unknown
  executedBy: string  // user ID or "system"
  executedAt: string
  durationMs: number
  dbRowsAffected: number
}
```

#### Required Commands

```typescript
// commands/

// ── User Data Commands ──
CreateReviewCommand          // INSERT product_reviews
UpdateProfileCommand         // UPDATE profiles
CreatePetEventCommand        // INSERT pet_events
CreateFollowupEntryCommand   // INSERT review_followup_entries

// ── System Data Commands ──
UpdateBanditStateCommand     // UPDATE bandit_state (alpha, beta)
RecordBanditRewardCommand    // INSERT bandit_rewards + UPDATE bandit_state
UpdateFeatureFlagCommand     // UPDATE feature_flags
UpdateRolloutPercentageCommand // UPDATE rollout_state
ActivatePolicyCommand        // UPDATE global_policy_config + INSERT policy_history
CreateStrategyCommand        // INSERT strategy_registry

// ── Analytics Commands ──
WriteOutcomeCommand          // INSERT outcome_attribution
UpdateTimelineCommand        // INSERT/UPDATE review_timeline_*
TriggerReplayJobCommand      // INSERT replay_jobs
ComputeMetricsCommand        // INSERT product_metrics_daily

// ── Admin Commands ──
SetUserFlagCommand           // UPDATE profiles.is_flagged
SetUserAdminCommand          // UPDATE profiles.is_admin
```

**Command Layer Rules**:
- MUST be the ONLY path for DB writes
- MUST produce audit log entries
- MUST be idempotent (safe to retry)
- MUST validate input before execution
- MUST NOT contain business logic decisions
- MUST use DAL write functions internally

#### Command Execution Flow

```
API Route
  → 1. Authenticate user
  → 2. Build Command input
  → 3. Command.validate(input)
  → 4. Decision Layer produces DecisionPlan (if needed)
  → 5. Command.execute(input)
  → 6. DAL.write()
  → 7. Audit log persisted
  → 8. Return result
```

---

## 3. service_role Usage Audit

### Current Usages

| Location | Usage | Classification | Risk |
|----------|-------|----------------|------|
| `web/lib/supabase/admin.ts` → `createAdminClient()` | Creates service_role client | **UNSAFE** | Bypasses all RLS |
| `web/lib/supabase/queries/admin-queries.ts` → `getAdminStats()` | Cross-table count queries | **UNSAFE** | Uses service_role directly |
| `web/lib/supabase/queries/admin-queries.ts` → `listUsers()` | Cross-profile reads | **UNSAFE** | Uses service_role directly |
| `web/lib/supabase/queries/admin-queries.ts` → `listProductsForAdmin()` | Cross-table product reads | **UNSAFE** | Uses service_role directly |
| `web/lib/supabase/queries/admin-queries.ts` → `listReviewsForAdmin()` | Cross-table review reads | **UNSAFE** | Uses service_role directly |
| `web/lib/supabase/queries/admin-queries.ts` → `setUserFlag()` | Profile mutation | SAFE | Uses authenticated client + RLS |
| `web/lib/supabase/queries/admin-queries.ts` → `setUserAdmin()` | Profile mutation | SAFE | Uses authenticated client + RLS |

### Classification

| Classification | Count | Action |
|---------------|-------|--------|
| **SAFE** | 2 | Keep — uses authenticated client with RLS |
| **UNSAFE** | 5 | Move to DAL Read with admin role check |

### Refactor Plan

```typescript
// BEFORE (unsafe)
export async function getAdminStats() {
  const admin = createAdminClient()  // service_role — bypasses RLS
  const [{ count: userCount }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    // ...
  ])
}

// AFTER (safe)
export async function getAdminStats() {
  // Uses authenticated client — RLS enforced
  // Admin policies allow reading all rows via is_admin() check
  const supabase = await createServerClient()
  const [{ count: userCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    // ...
  ])
}
```

**Note**: This requires adding `is_admin()`-based SELECT policies to all admin-read tables. The policies already exist for `profiles` and `product_reviews` but need to be added for `pets` and `products`.

---

## 4. Trigger Migration Plan

### Trigger Classification

| Trigger | Table | Function | Type | Action |
|---------|-------|----------|------|--------|
| `after_diet_log_create_event` | `diet_logs` | `create_event_from_diet_log()` | **HEAVY** — cross-table mutation | **ASYNCIFY** |
| `after_review_create_event` | `product_reviews` | `create_event_from_review()` | **HEAVY** — cross-table mutation | **ASYNCIFY** |
| `after_review_insert` | `product_reviews` | `create_review_followup_schedules()` | **HEAVY** — creates unrelated rows | **ASYNCIFY** |
| `after_review_insert_reputation` | `product_reviews` | `enqueue_reputation_job()` | **HEAVY** — enqueues computation | **ASYNCIFY** |
| `after_followup_entry_insert` | `review_followup_entries` | `enqueue_metrics_refresh_job()` | **HEAVY** — enqueues computation | **ASYNCIFY** |
| `after_followup_entry_reputation` | `review_followup_entries` | `trigger_recompute_reputation()` | **HEAVY** — enqueues computation | **ASYNCIFY** |
| `before_review_insert` | `product_reviews` | `set_review_trust_score()` | LIGHT — computes single row field | **KEEP** |
| `before_review_update` | `product_reviews` | `set_review_trust_score()` | LIGHT — computes single row field | **KEEP** |
| `pets_life_stage_update` | `pets` | `update_pet_life_stage()` | LIGHT — computes single row field | **KEEP** |
| `*_updated_at` (all tables) | various | `update_updated_at()` | LIGHT — timestamp update | **KEEP** |
| `after_timeline_event_insert` | `review_timeline_events` | `trigger_update_timeline_metrics()` | **HEAVY** — cross-schema computation | **ASYNCIFY** |
| `tle_after_insert/update` | `review_timeline_events` | `auto_recalc_trust()` | **HEAVY** — full table scan risk | **ASYNCIFY** |
| `after_timeline_group_insert` | `review_timeline_groups` | `trigger_update_timeline_metrics()` | **HEAVY** — cross-schema computation | **ASYNCIFY** |
| `after_timeline_metrics_insert` | `timeline_metrics_daily` | `trigger_update_score_comparison()` | **HEAVY** — cross-schema computation | **ASYNCIFY** |

### Triggers to Remove (ASYNCIFY) — 8 triggers

| # | Trigger | Replacement |
|---|---------|-------------|
| 1 | `after_diet_log_create_event` | `CreatePetEventCommand` emitted to `pending_computation_jobs` |
| 2 | `after_review_create_event` | `CreatePetEventCommand` emitted to `pending_computation_jobs` |
| 3 | `after_review_insert` | `CreateFollowupSchedulesCommand` emitted to `pending_computation_jobs` |
| 4 | `after_review_insert_reputation` | Already uses `pending_computation_jobs` — keep, remove trigger, call directly |
| 5 | `after_followup_entry_insert` | Already uses `pending_computation_jobs` — keep, remove trigger, call directly |
| 6 | `after_followup_entry_reputation` | Already uses `pending_computation_jobs` — keep, remove trigger, call directly |
| 7 | `after_timeline_event_insert` + `tle_after_insert/update` | `RecalcTimelineTrustCommand` emitted to `pending_computation_jobs` |
| 8 | `after_timeline_group_insert` | `GenerateTimelineMetricsCommand` emitted to `pending_computation_jobs` |
| 9 | `after_timeline_metrics_insert` | `TriggerScoreComparisonCommand` emitted to `pending_computation_jobs` |

### Triggers to Keep — 10 triggers

| # | Trigger | Reason |
|---|---------|--------|
| 1 | `before_review_insert` | Computes `trust_score` for the same row — lightweight |
| 2 | `before_review_update` | Same as above |
| 3 | `pets_life_stage_update` | Computes `life_stage` for the same row — lightweight |
| 4-10 | `*_updated_at` triggers | Standard timestamp maintenance — negligible cost |

### Async Command Model

```
OLD (synchronous trigger):
INSERT INTO product_reviews
  → TRIGGER after_review_create_event
    → INSERT INTO pet_events (cross-table)
    → INSERT INTO review_followup_schedules (cross-table)
    → INSERT INTO pending_computation_jobs (reputation)
  → Transaction commits (all or nothing)

NEW (async command):
INSERT INTO product_reviews
  → TRIGGER before_review_insert (KEEP — lightweight trust score)
  → Transaction commits
  → Application layer emits commands:
    → CreatePetEventCommand
    → CreateFollowupSchedulesCommand
    → EnqueueReputationJobCommand
  → Commands processed by queue consumer
```

---

## 5. Execution Flow Redesign

### Step-by-Step Request Lifecycle

#### OLD Flow (implicit, coupled)

```
User Request
  → Next.js API Route
    → createClient() (authenticated)
    → supabase.from("product_reviews").insert(...)
      → RLS policy check
      → TRIGGER before_review_insert → set_review_trust_score()
      → TRIGGER after_review_create_event → create_event_from_review() [SECURITY DEFINER]
      → TRIGGER after_review_insert → create_review_followup_schedules() [SECURITY DEFINER]
      → TRIGGER after_review_insert_reputation → enqueue_reputation_job() [SECURITY DEFINER]
    → Return response
  [Hidden side effects: 3 triggers, 3 cross-table writes, 1 job enqueue]
```

#### NEW Flow (explicit, layered)

```
User Request
  → Next.js API Route
    → 1. Authenticate user
    → 2. Build Command: CreateReviewCommand({ ... })
    → 3. Command.validate()
    → 4. Command.execute()
      → DAL.write("product_reviews", data)  [RLS enforced]
      → Audit log: { command: "CreateReviewCommand", rowsAffected: 1, ... }
    → 5. Emit async commands (non-blocking):
      → CommandQueue.enqueue(CreatePetEventCommand)
      → CommandQueue.enqueue(CreateFollowupSchedulesCommand)
      → CommandQueue.enqueue(EnqueueReputationJobCommand)
    → 6. Return response
  [Explicit side effects: 3 queued commands, processed asynchronously]
```

#### Decision Request Lifecycle (Bandit/Rollout)

```
User Request → Product Recommendations
  → 1. DAL.readFeatureFlags()
  → 2. DAL.readBanditState()
  → 3. DAL.readRolloutStatus()
  → 4. Decision Layer:
    → decideRolloutPath({ flags, rollout }) → DecisionPath
    → decideBanditArm({ decision, banditState }) → ArmSelection
  → 5. DAL.readProducts() + DAL.readProductMetrics()
  → 6. Scoring Engine (pure computation)
  → 7. Return recommendations
  → 8. (Async) RecordBanditRewardCommand → queue
```

---

## 6. Risk Reduction Summary

### Vulnerabilities Eliminated

| Risk Class | Before | After | Reduction |
|-----------|--------|-------|-----------|
| **Hidden privilege escalation** | 12 SECURITY DEFINER functions can escalate | 0 — all operations use caller's role | **100%** |
| **Implicit side effects** | 8 triggers mutate unrelated tables | 0 — side effects are explicit commands | **100%** |
| **Unauditable mutations** | service_role bypasses RLS, no audit trail | All mutations produce audit logs | **100%** |
| **Tight coupling** | Decision + Data + Execution in same module | Strict layer separation | **100%** |
| **Non-deterministic decisions** | Bandit reads/writes DB during selection | Decision is pure, DB I/O is separate | **100%** |
| **Trigger recursion risk** | Triggers call SECURITY DEFINER functions | No triggers call elevated functions | **100%** |
| **Long transaction risk** | Triggers hold locks during cross-table writes | Async commands don't hold transaction locks | **100%** |

### Remaining Risks (to address in future phases)

| Risk | Description | Priority |
|------|-------------|----------|
| Queue consumer not implemented | `pending_computation_jobs` has no worker | HIGH |
| Command idempotency not enforced | Commands lack deduplication keys | MEDIUM |
| Audit log table not created | No `command_audit_log` table exists | MEDIUM |
| DAL role enforcement not verified | Need integration tests for role boundaries | LOW |

---

## 7. Implementation Checklist

### Phase 1.2.1 — DAL Extraction
- [ ] Create `web/lib/dal/read.ts` with all read functions
- [ ] Create `web/lib/dal/write.ts` with all write functions
- [ ] Add `is_admin()`-based SELECT policies for admin tables
- [ ] Replace `createAdminClient()` usage in admin queries
- [ ] Add integration tests for DAL role boundaries

### Phase 1.2.2 — Decision Layer Extraction
- [ ] Create `web/lib/decision/policy-engine.ts`
- [ ] Extract pure decision functions from `bandit-policy.ts`
- [ ] Extract pure decision functions from `global-policy-orchestrator.ts`
- [ ] Add `DecisionPlan` and `DecisionTrace` types
- [ ] Add unit tests for decision function determinism

### Phase 1.2.3 — Command Layer
- [ ] Create `web/lib/commands/` directory
- [ ] Implement `Command<TInput, TOutput>` interface
- [ ] Create `CreateReviewCommand`
- [ ] Create `RecordBanditRewardCommand`
- [ ] Create `UpdateBanditStateCommand`
- [ ] Create `ActivatePolicyCommand`
- [ ] Create `command_audit_log` table
- [ ] Add command execution middleware

### Phase 1.2.4 — Trigger Removal
- [ ] Create migration to drop 8 heavy triggers
- [ ] Update application code to emit async commands
- [ ] Verify `pending_computation_jobs` consumer exists
- [ ] Add integration tests for async command flow

### Phase 1.2.5 — SECURITY DEFINER Cleanup
- [ ] Review all 12 SECURITY DEFINER functions
- [ ] Replace with role-aware equivalents
- [ ] Add migration to revoke SECURITY DEFINER
- [ ] Verify no application code depends on elevated permissions
