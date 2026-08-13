export type FeedbackEventTone = "accept" | "reject" | "neutral"

export function normalizeFeedbackEventType(eventType?: string | null): FeedbackEventTone {
 const value = eventType?.toLowerCase()?? ""

 if (value.includes("accept") || value.includes("adopt") || value.includes("adopted")) {
 return "accept"
 }

 if (value.includes("reject") || value.includes("decline") || value.includes("dislike")) {
 return "reject"
 }

 return "neutral"
}

export function getFeedbackEventLabel(eventType?: string | null): string {
 switch (normalizeFeedbackEventType(eventType)) {
 case "accept":
 return "Accepted"
 case "reject":
 return "RejectRecommended"
 default:
 return "Browsed"
 }
}

export function formatFeedbackDate(createdAt?: string | null): string {
 if (!createdAt) return "NoTime"

 const date = new Date(createdAt)
 if (Number.isNaN(date.getTime())) {
 return "NoTime"
 }

 return date.toLocaleDateString("en-US")
}
