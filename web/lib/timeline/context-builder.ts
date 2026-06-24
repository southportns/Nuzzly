// =============================================
// AI Context Migration — Timeline Context Layer
// Timeline First Architecture: AI consumes Timeline, not raw review_text
// =============================================
// Old: review_text → LLM
// New: review_text → extractTimeline() → timeline_events → timeline_context → LLM

import { createClient } from "@/lib/supabase/server"
import { extractTimeline, type ExtractedTimelineEvent } from "@/lib/ai/timeline-extractor"

export interface TimelineContext {
  timeline_events: ExtractedTimelineEvent[]
  symptom_progression: {
    symptom: string
    first_seen_day: number
    last_seen_day: number
    frequency: number
    trend: "improving" | "stable" | "worsening"
  }[]
  outcome_summary: {
    total_events: number
    positive_events: number
    negative_events: number
    neutral_events: number
    stability_rate: number
    repurchase_signals: number
    avg_sentiment: number
  }
  trust_score: number
  product_id: string
  pet_id?: string
}

export interface ReviewWithContext {
  review_id: string
  review_text: string
  timeline_context: TimelineContext
}

// Build TimelineContext from raw review text
export async function buildTimelineContext(
  reviewText: string,
  productId: string,
  petId?: string
): Promise<TimelineContext | null> {
  // Step 1: Extract timeline events from review text
  const events = await extractTimeline(reviewText)
  if (!events || events.length === 0) return null

  // Step 2: Compute symptom progression
  const symptomProgression = computeSymptomProgression(events)

  // Step 3: Compute outcome summary
  const outcomeSummary = computeOutcomeSummary(events)

  // Step 4: Get trust score from timeline
  const trustScore = await getTimelineTrustScore(productId)

  return {
    timeline_events: events,
    symptom_progression: symptomProgression,
    outcome_summary: outcomeSummary,
    trust_score: trustScore,
    product_id: productId,
    pet_id: petId,
  }
}

// Build TimelineContext from existing timeline events (DB)
export async function buildTimelineContextFromDB(
  productId: string,
  petId?: string
): Promise<TimelineContext | null> {
  const supabase = await createClient()

  // Get timeline groups for this product
  const { data: groups } = await supabase
    .from("review_timeline_groups")
    .select("id, timeline_score, review_count")
    .eq("product_id", productId)
    .eq("is_active", true)
    .limit(10)

  if (!groups || groups.length === 0) return null

  // Get events from these groups
  const groupIds = groups.map((g) => g.id)
  const { data: events } = await supabase
    .from("review_timeline_events")
    .select("*")
    .in("timeline_group_id", groupIds)
    .order("event_day", { ascending: true })
    .limit(200)

  if (!events || events.length === 0) return null

  const typedEvents = events as unknown as ExtractedTimelineEvent[]
  const symptomProgression = computeSymptomProgression(typedEvents)
  const outcomeSummary = computeOutcomeSummary(typedEvents)

  // Weighted trust score
  const trustScore = groups.reduce(
    (sum, g) => sum + (g.timeline_score ?? 50) * g.review_count,
    0
  ) / groups.reduce((sum, g) => sum + g.review_count, 0)

  return {
    timeline_events: typedEvents,
    symptom_progression: symptomProgression,
    outcome_summary: outcomeSummary,
    trust_score: Math.round(trustScore),
    product_id: productId,
    pet_id: petId,
  }
}

// Compute symptom progression from timeline events
function computeSymptomProgression(events: ExtractedTimelineEvent[]): TimelineContext["symptom_progression"] {
  const symptomMap = new Map<string, { days: number[] }>()

  for (const event of events) {
    if (event.symptom) {
      if (!symptomMap.has(event.symptom)) {
        symptomMap.set(event.symptom, { days: [] })
      }
      symptomMap.get(event.symptom)!.days.push(event.event_day)
    }
  }

  const progression: TimelineContext["symptom_progression"] = []

  for (const [symptom, data] of symptomMap) {
    const sortedDays = data.days.sort((a, b) => a - b)
    const firstSeen = sortedDays[0]
    const lastSeen = sortedDays[sortedDays.length - 1]
    const frequency = sortedDays.length

    // Trend: compare early vs late occurrence rate
    const midPoint = (firstSeen + lastSeen) / 2
    const earlyCount = sortedDays.filter((d) => d <= midPoint).length
    const lateCount = sortedDays.filter((d) > midPoint).length
    const earlyRate = earlyCount / Math.max(1, midPoint)
    const lateRate = lateCount / Math.max(1, lastSeen - midPoint)

    const trend: "improving" | "stable" | "worsening" =
      lateRate < earlyRate * 0.8 ? "improving" :
      lateRate > earlyRate * 1.2 ? "worsening" :
      "stable"

    progression.push({
      symptom,
      first_seen_day: firstSeen,
      last_seen_day: lastSeen,
      frequency,
      trend,
    })
  }

  return progression.sort((a, b) => b.frequency - a.frequency)
}

// Compute outcome summary from timeline events
function computeOutcomeSummary(events: ExtractedTimelineEvent[]): TimelineContext["outcome_summary"] {
  const total = events.length
  const positive = events.filter((e) => e.status === "positive").length
  const negative = events.filter((e) => e.status === "negative" || e.status === "mixed").length
  const neutral = events.filter((e) => e.status === "neutral").length
  const repurchase = events.filter((e) => e.event_type === "repurchase").length
  const avgSentiment = events.reduce((sum, e) => sum + (e.sentiment_score ?? 0), 0) / Math.max(1, total)

  return {
    total_events: total,
    positive_events: positive,
    negative_events: negative,
    neutral_events: neutral,
    stability_rate: total > 0 ? Math.round((positive / total) * 100) : 0,
    repurchase_signals: repurchase,
    avg_sentiment: Math.round(avgSentiment * 100) / 100,
  }
}

// Get timeline trust score for a product
async function getTimelineTrustScore(productId: string): Promise<number> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pflid.get_product_timeline_stats", {
    p_product_id: productId,
  })
  if (error || !data) return 50

  // Extract trust score from timeline stats
  const stats = data as Record<string, unknown>
  return Math.round((stats.trust_score as number) ?? 50)
}

// Convert TimelineContext to LLM-friendly prompt format
export function timelineContextToPrompt(context: TimelineContext): string {
  const lines: string[] = []

  lines.push(`## Product Timeline Context (Product: ${context.product_id})`)
  lines.push(``)
  lines.push(`### Trust Score: ${context.trust_score}/100`)
  lines.push(``)

  lines.push(`### Outcome Summary`)
  lines.push(`- Total events: ${context.outcome_summary.total_events}`)
  lines.push(`- Stability rate: ${context.outcome_summary.stability_rate}%`)
  lines.push(`- Positive: ${context.outcome_summary.positive_events} | Negative: ${context.outcome_summary.negative_events} | Neutral: ${context.outcome_summary.neutral_events}`)
  lines.push(`- Repurchase signals: ${context.outcome_summary.repurchase_signals}`)
  lines.push(`- Avg sentiment: ${context.outcome_summary.avg_sentiment}`)
  lines.push(``)

  if (context.symptom_progression.length > 0) {
    lines.push(`### Symptom Progression`)
    for (const s of context.symptom_progression) {
      lines.push(`- ${s.symptom}: day ${s.first_seen_day} → day ${s.last_seen_day}, frequency=${s.frequency}, trend=${s.trend}`)
    }
    lines.push(``)
  }

  lines.push(`### Timeline Events (sample)`)
  const sample = context.timeline_events.slice(0, 10)
  for (const e of sample) {
    lines.push(`- Day ${e.day}: ${e.status} | ${e.event_type}${e.symptom ? ` | symptom: ${e.symptom}` : ""}${e.extracted_text ? ` | ${e.extracted_text}` : ""}`)
  }

  return lines.join("\n")
}
