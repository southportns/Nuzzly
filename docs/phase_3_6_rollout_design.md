# Phase 3.6: Production Gradual Rollout Control System

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Request                           │
│                   (petId, userId, sessionId)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/recommend/shadow                        │
│                                                                 │
│  1. Run Review Pipeline (baseline)                              │
│  2. RolloutController.decideEngine()                            │
│     ├─ Check master flag (timeline_score_enabled)               │
│     ├─ Check auto-rollback triggers                             │
│     ├─ Evaluate rollout percentage (hash-based bucket)          │
│     ├─ Check A/B test mode                                      │
│     └─ Return: engine | timelineWeight | reviewWeight | abGroup │
│  3. Enrich with Timeline scores (parallel)                      │
│  4. RolloutController.calculateScore()                          │
│     ├─ "review"  → reviewScore                                  │
│     ├─ "timeline" → timelineScore (fallback: reviewScore)       │
│     └─ "blend"   → timelineScore * W1 + reviewScore * W2       │
│  5. Strip internal fields, return safe result                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Admin Control Layer                         │
│                                                                 │
│  GET  /api/admin/flags              — Read all feature flags    │
│  PUT  /api/admin/flags              — Update a feature flag     │
│  GET  /api/admin/rollout/status     — Full rollout dashboard    │
│  POST /api/admin/rollout/adjust     — Change rollout percentage │
│  POST /api/admin/rollout/rollback   — Instant rollback          │
│  GET  /api/admin/shadow-metrics     — Real-time observability   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Feature Flag Schema

| Flag Key | Type | Default | Description |
|----------|------|---------|-------------|
| `timeline_score_enabled` | `{ enabled: boolean }` | `false` | Master on/off switch |
| `timeline_score_rollout_percentage` | `{ percentage: number }` | `0` | Traffic % (0-100) |
| `shadow_mode_enabled` | `{ enabled: boolean }` | `true` | Dual-scoring comparison |
| `ab_test_timeline_enabled` | `{ enabled: boolean }` | `false` | A/B test mode |
| `ab_test_timeline_ratio` | `{ control: number, timeline: number }` | `{90, 10}` | A/B split ratio |
| `auto_rollback_enabled` | `{ enabled: boolean }` | `true` | Auto-rollback switch |
| `auto_rollback_thresholds` | `{ failure_rate_pct, latency_p95_ms, score_drift_threshold }` | `{5, 3000, 30}` | Trigger thresholds |
| `blend_weights` | `{ timeline: number, review: number }` | `{0.7, 0.3}` | Score blend weights |

### Flag Evaluation Flow

```
getFlag(key)
  ├─ Check local cache (30s TTL)
  ├─ Cache hit → return
  └─ Cache miss → query DB → cache → return
       └─ DB error → return safe default
```

## 3. A/B Assignment Algorithm (Deterministic)

```typescript
function getUserBucket(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 100  // 0-99
}

// Assignment:
//   bucket < percentage → Timeline group
//   bucket >= percentage → Review group (control)
//
// Properties:
//   - Same userId always gets same bucket (stable across sessions)
//   - Changing percentage only affects boundary users
//   - No user switching between groups
```

## 4. Rollback Decision Tree

```
Rollback Triggered?
  │
  ├─ Manual Rollback (Admin POST /api/admin/rollout/rollback)
  │   ├─ type: "full" → Disable Timeline, set traffic=0%, phase="rolled_back"
  │   └─ type: "partial" → Reduce traffic by 20% (min 10%)
  │
  └─ Auto Rollback (checked per-request in RolloutController)
      │
      ├─ failure_rate > 5%? → Full rollback
      │   (review_fallback_count / total > threshold)
      │
      ├─ P95 latency > 3000ms? → Full rollback
      │   (scoring_latency_ms.p95 > threshold)
      │
      └─ score_drift > 30? → Full rollback
          (avg |timeline_score - review_score| > threshold)
```

### Rollback Actions

1. Set `timeline_score_enabled = false`
2. Set `timeline_traffic_pct = 0`
3. Set `current_phase = "rolled_back"`
4. Pause all running A/B experiments
5. Clear RolloutController cache
6. Log event to `rollout_event_log`

## 5. API Endpoint Design

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/recommend/shadow` | None | Recommendation with rollout control |
| GET | `/api/admin/flags` | Admin | Read all feature flags |
| PUT | `/api/admin/flags` | Admin | Update a feature flag |
| GET | `/api/admin/rollout/status` | Admin | Full rollout dashboard data |
| POST | `/api/admin/rollout/adjust` | Admin | Change rollout percentage |
| POST | `/api/admin/rollout/rollback` | Admin | Instant rollback |
| GET | `/api/admin/shadow-metrics` | Admin | Real-time observability metrics |

### Client Response (never exposes flags)

```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "shadow_mode": {
      "enabled": true,
      "review_score": 78,
      "timeline_score": 82,
      "score_delta": 4,
      "used_timeline": true,
      "fallback_reason": null,
      "rollout_engine": "blend",
      "rollout_ab_group": null
    }
  }
}
```

## 6. Failure Mode Handling Strategy

| Failure Scenario | Behavior | Fallback |
|-----------------|----------|----------|
| Master flag disabled | All traffic → Review | Review Score |
| DB connection failure | Use cached flags (30s TTL) | Review Score |
| Timeline scoring error | `Promise.allSettled` catches | Review Score |
| Auto-rollback triggered | Disable Timeline, log event | Review Score |
| Flag cache stale | Refresh from DB | Use cached value |
| A/B experiment error | Disable A/B, use percentage | Percentage routing |
| Latency spike | Auto-rollback triggers | Review Score |
| Score anomaly detected | Auto-rollback triggers | Review Score |

**Core principle: Any failure defaults to Review Score.**

## 7. Migration Plan: Phase 3.5 → 3.6

### Step 1: Deploy Migration
```bash
supabase db push --include-all
# Applies: 20260613000000_rollout_control.sql
```

### Step 2: Deploy Code (no flag changes)
- All new files are additive
- Existing behavior unchanged (flags default to safe values)
- `timeline_score_enabled` defaults to `false` → all traffic stays on Review

### Step 3: Verify Admin Dashboard
- Check `/api/admin/rollout/status` returns correct initial state
- Verify all 8 feature flags are seeded

### Step 4: Enable Shadow Mode (0% Timeline)
- Set `shadow_mode_enabled = true` (already default)
- Set `timeline_score_rollout_percentage = 0`
- All traffic → Review Score, but dual scoring runs in background

### Step 5: Gradual Rollout
```
0%  → Shadow Mode (dual scoring, Review serves)
10% → A/B Test (10% Timeline, 90% Review)
25% → Partial Rollout
50% → Partial Rollout
75% → Partial Rollout
100% → Full Production (blend mode)
```

Each step:
1. Adjust percentage via `/api/admin/rollout/adjust`
2. Monitor metrics via `/api/admin/shadow-metrics`
3. Wait for statistical significance (min 1000 requests)
4. Check auto-rollback hasn't triggered
5. Proceed to next step

### Step 6: Rollback (if needed)
```bash
POST /api/admin/rollout/rollback
{ "reason": "Score anomaly detected", "type": "full" }
```

## 8. Database Schema

### New Tables
- `feature_flags` — Feature flag storage with environment support
- `rollout_state` — Current rollout phase and traffic percentage
- `ab_experiments` — A/B experiment definitions
- `ab_assignment_log` — User-to-group assignment audit trail
- `rollout_event_log` — All rollout/rollback/flag change events

### New Functions
- `get_feature_flag(key, environment)` — Read a flag
- `update_feature_flag(key, value, environment)` — Update a flag (auto-logs)
- `get_rollout_status()` — Full rollout dashboard data
- `execute_rollback(reason)` — Instant rollback (disables Timeline, pauses experiments)
- `update_rollout_percentage(percentage, reason)` — Adjust traffic % (auto-determines phase)

### RLS Policies
- `feature_flags`: SELECT for all (evaluated server-side)
- `rollout_state`: SELECT for all
- `ab_assignment_log`: INSERT only
- `rollout_event_log`: SELECT only

## 9. Observability Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| `shadow_mode_ratio` | `getShadowMetrics()` | Timeline usage ratio |
| `timeline_vs_review_delta` | `getShadowMetrics()` | Score difference distribution |
| `scoring_latency_ms` | `getShadowMetrics()` | P50/P95/P99 latency |
| `fallback_activation_count` | `getShadowMetrics()` | Review fallback count |
| `fallback_reasons` | `getShadowMetrics()` | Breakdown by reason |
| `rollout_engine` | Response metadata | Current engine per request |
| `ab_group` | Response metadata | A/B group assignment |
| `rollback_trigger_events` | `rollout_event_log` | Auto-rollback history |

## 10. Files Changed/Created

### Created
| File | Purpose |
|------|---------|
| `supabase/migrations/20260613000000_rollout_control.sql` | Database schema + functions |
| `web/lib/timeline/feature-flags.ts` | Feature flag service |
| `web/lib/timeline/rollout-controller.ts` | Central rollout decision engine |
| `web/lib/timeline/rollback-system.ts` | Rollback mechanism |
| `web/app/api/admin/flags/route.ts` | Flag management API |
| `web/app/api/admin/rollout/status/route.ts` | Rollout status API |
| `web/app/api/admin/rollout/rollback/route.ts` | Rollback API |
| `web/app/api/admin/rollout/adjust/route.ts` | Rollout adjustment API |

### Modified
| File | Change |
|------|--------|
| `web/lib/timeline/agent-migration.ts` | Integrated RolloutController, added userId/sessionId |
| `web/lib/timeline/index.ts` | Export new Phase 3.6 modules |
| `web/app/api/recommend/shadow/route.ts` | Pass userId/sessionId to pipeline |
