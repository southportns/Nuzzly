export type FeedbackEventTone = "accept" | "reject" | "neutral"

export function normalizeFeedbackEventType(eventType?: string | null): FeedbackEventTone {
  const value = eventType?.toLowerCase() ?? ""

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
      return "采纳推荐"
    case "reject":
      return "拒绝推荐"
    default:
      return "浏览"
  }
}

export function formatFeedbackDate(createdAt?: string | null): string {
  if (!createdAt) return "暂无时间"

  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return "暂无时间"
  }

  return date.toLocaleDateString("zh-CN")
}
