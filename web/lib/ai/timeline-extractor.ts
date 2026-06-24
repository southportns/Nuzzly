// Stub: AI timeline extractor
// TODO: Implement real AI-based timeline event extraction from review text

export interface TimelineEvent {
  day: string
  event_type: string
  status: string
  symptom: string | null
  severity: number | null
  sentiment: string | null
  sentiment_score: number | null
  confidence: number
  extracted_text: string | null
}

export interface TimelineExtraction {
  events: TimelineEvent[]
  model: string
}

export async function extractTimeline(_input: {
  review_text: string
  review_date: string
}): Promise<TimelineExtraction> {
  return { events: [], model: "stub" }
}
