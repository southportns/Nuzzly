import { describe, expect, it } from "vitest"
import { formatFeedbackDate, getFeedbackEventLabel, normalizeFeedbackEventType } from "@/lib/dashboard/feedback"

describe("dashboard feedback helpers", () => {
  it("normalizes accept-like events", () => {
    expect(normalizeFeedbackEventType("recommendation_accept")).toBe("accept")
    expect(normalizeFeedbackEventType("accept")).toBe("accept")
  })

  it("normalizes reject-like events", () => {
    expect(normalizeFeedbackEventType("recommendation_reject")).toBe("reject")
    expect(normalizeFeedbackEventType("decline")).toBe("reject")
  })

  it("returns a label for feedback events", () => {
    expect(getFeedbackEventLabel("recommendation_accept")).toBe("采纳推荐")
    expect(getFeedbackEventLabel("recommendation_reject")).toBe("拒绝推荐")
    expect(getFeedbackEventLabel("product_view")).toBe("浏览")
  })

  it("formats feedback dates safely", () => {
    expect(formatFeedbackDate("2024-05-01T00:00:00.000Z")).toMatch(/2024/)
    expect(formatFeedbackDate("not-a-date")).toBe("暂无时间")
    expect(formatFeedbackDate(null)).toBe("暂无时间")
  })
})
