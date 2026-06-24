// =============================================
// Shadow Mode Observability
// Phase 3.5: Metrics tracking for gradual rollout validation
// =============================================

interface ShadowMetrics {
  // Count of recommendations using timeline vs review
  timeline_used_count: number
  review_fallback_count: number

  // Score delta distribution tracking
  delta_sum: number
  delta_count: number
  delta_max: number
  delta_min: number

  // Latency tracking (ms)
  scoring_latency_samples: number[]

  // Fallback activation tracking
  fallback_reasons: Record<string, number>

  // Session start time
  started_at: number
}

let metrics: ShadowMetrics = {
  timeline_used_count: 0,
  review_fallback_count: 0,
  delta_sum: 0,
  delta_count: 0,
  delta_max: -Infinity,
  delta_min: Infinity,
  scoring_latency_samples: [],
  fallback_reasons: {},
  started_at: Date.now(),
}

// Record a shadow mode scoring event
export function recordShadowEvent(event: {
  usedTimeline: boolean
  timelineScore: number
  reviewScore: number
  latencyMs: number
  fallbackReason?: string | null
}): void {
  if (event.usedTimeline) {
    metrics.timeline_used_count++
  } else {
    metrics.review_fallback_count++
    if (event.fallbackReason) {
      metrics.fallback_reasons[event.fallbackReason] =
        (metrics.fallback_reasons[event.fallbackReason] ?? 0) + 1
    }
  }

  const delta = event.timelineScore - event.reviewScore
  metrics.delta_sum += delta
  metrics.delta_count++
  metrics.delta_max = Math.max(metrics.delta_max, delta)
  metrics.delta_min = Math.min(metrics.delta_min, delta)

  metrics.scoring_latency_samples.push(event.latencyMs)

  // Keep only last 1000 samples to avoid memory growth
  if (metrics.scoring_latency_samples.length > 1000) {
    metrics.scoring_latency_samples = metrics.scoring_latency_samples.slice(-1000)
  }
}

// Get current metrics snapshot
export function getShadowMetrics() {
  const total = metrics.timeline_used_count + metrics.review_fallback_count
  const timelineRatio = total > 0 ? metrics.timeline_used_count / total : 0
  const avgDelta = metrics.delta_count > 0 ? metrics.delta_sum / metrics.delta_count : 0
  const latencies = metrics.scoring_latency_samples
  const p50 = latencies.length > 0 ? sortedPercentile(latencies, 50) : 0
  const p95 = latencies.length > 0 ? sortedPercentile(latencies, 95) : 0
  const p99 = latencies.length > 0 ? sortedPercentile(latencies, 99) : 0

  return {
    shadow_mode_ratio: timelineRatio,
    timeline_used_count: metrics.timeline_used_count,
    review_fallback_count: metrics.review_fallback_count,
    timeline_vs_review_delta: {
      avg: round2(avgDelta),
      max: metrics.delta_max === -Infinity ? null : round2(metrics.delta_max),
      min: metrics.delta_min === Infinity ? null : round2(metrics.delta_min),
    },
    scoring_latency_ms: {
      p50: round2(p50),
      p95: round2(p95),
      p99: round2(p99),
      sample_count: latencies.length,
    },
    fallback_activation_count: metrics.review_fallback_count,
    fallback_reasons: metrics.fallback_reasons,
    uptime_seconds: Math.round((Date.now() - metrics.started_at) / 1000),
  }
}

// Reset metrics (for testing or periodic flush)
export function resetShadowMetrics(): void {
  metrics = {
    timeline_used_count: 0,
    review_fallback_count: 0,
    delta_sum: 0,
    delta_count: 0,
    delta_max: -Infinity,
    delta_min: Infinity,
    scoring_latency_samples: [],
    fallback_reasons: {},
    started_at: Date.now(),
  }
}

function sortedPercentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
