// =============================================
// Timeline First Architecture — Unit Tests
// Tests for: metrics-engine, longitudinal-score, context-builder, outcome-recommendation
// =============================================

import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock supabase client
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

// Mock timeline extractor
vi.mock("@/lib/ai/timeline-extractor", () => ({
  extractTimeline: vi.fn(() => ({
    events: [
      { day: 1, event_type: "first_feed", status: "positive", sentiment: "positive", sentiment_score: 0.8, confidence: 0.9 },
      { day: 7, event_type: "stool_change", status: "negative", symptom: "soft_stool", severity: 0.6, sentiment: "negative", sentiment_score: -0.5, confidence: 0.85 },
      { day: 30, event_type: "adaptation", status: "positive", sentiment: "positive", sentiment_score: 0.7, confidence: 0.9 },
    ],
    model: "test-model",
  })),
}))

describe("Timeline Metrics Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate timeline metrics for a product", async () => {
    mockRpc.mockResolvedValue({
      data: {
        product_id: "test-product-id",
        stat_date: "2026-06-11",
        timeline_count: 15,
        day30_stability_rate: 72.5,
        day90_stability_rate: 68.3,
        day180_stability_rate: 65.1,
        soft_stool_rate: 12.5,
        vomiting_rate: 5.2,
        black_chin_rate: 3.1,
        repurchase_rate: 45.0,
        trust_weighted_score: 71.2,
      },
      error: null,
    })

    const { generateTimelineMetrics } = await import("../../../lib/timeline/metrics-engine")
    const result = await generateTimelineMetrics("test-product-id")

    expect(result).not.toBeNull()
    expect(result?.product_id).toBe("test-product-id")
    expect(result?.day30_stability_rate).toBe(72.5)
    expect(result?.timeline_count).toBe(15)
  })

  it("should return null when RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } })

    const { generateTimelineMetrics } = await import("../../../lib/timeline/metrics-engine")
    const result = await generateTimelineMetrics("test-product-id")

    expect(result).toBeNull()
  })

  it("should get latest timeline metrics", async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      order: mockOrder.mockReturnThis(),
      limit: mockLimit.mockReturnThis(),
      single: mockSingle.mockResolvedValue({
        data: {
          id: "test-id",
          product_id: "test-product-id",
          stat_date: "2026-06-11",
          timeline_count: 20,
          day30_stability_rate: 75.0,
          day90_stability_rate: 70.0,
          day180_stability_rate: 68.0,
          soft_stool_rate: 10.0,
          vomiting_rate: 4.0,
          black_chin_rate: 2.0,
          repurchase_rate: 50.0,
          trust_weighted_score: 73.0,
          created_at: "2026-06-11T00:00:00Z",
        },
        error: null,
      }),
    })

    const { getLatestTimelineMetrics } = await import("../../../lib/timeline/metrics-engine")
    const result = await getLatestTimelineMetrics("test-product-id")

    expect(result).not.toBeNull()
    expect(result?.timeline_count).toBe(20)
  })
})

describe("Longitudinal Score Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should calculate longitudinal score", async () => {
    mockRpc.mockResolvedValue({
      data: {
        product_id: "test-product-id",
        overall_score: 72.5,
        stability_score: 70.0,
        repurchase_score: 50.0,
        risk_score: 85.0,
        timeline_count: 25,
        decay_curve: { month_1: 75, month_3: 70, month_6: 68 },
        trust_weighted_score: 71.0,
        calculated_at: "2026-06-11T00:00:00Z",
      },
      error: null,
    })

    const { calculateLongitudinalScore } = await import("../../../lib/timeline/longitudinal-score")
    const result = await calculateLongitudinalScore("test-product-id")

    expect(result).not.toBeNull()
    expect(result?.overall_score).toBe(72.5)
    expect(result?.stability_score).toBe(70.0)
    expect(result?.risk_score).toBe(85.0)
  })

  it("should score product for pet with timeline method", async () => {
    mockRpc.mockResolvedValue({
      data: {
        product_id: "test-product-id",
        pet_id: "test-pet-id",
        score: 68.5,
        dimensions: {
          longitudinal_overall: 72.5,
          stability_score: 70.0,
          repurchase_score: 50.0,
          risk_score: 85.0,
          breed_match: 4.2,
          symptom_penalty: 2.5,
          day30_stability: 75.0,
          day90_soft_stool_rate: 12.5,
          day180_repurchase_rate: 45.0,
        },
        risk_count: 1,
        breed: "british_shorthair",
        stomach_health: "sensitive",
        scoring_method: "timeline_longitudinal",
      },
      error: null,
    })

    const { scoreProductForPetTimeline } = await import("../../../lib/timeline/longitudinal-score")
    const result = await scoreProductForPetTimeline("test-product-id", "test-pet-id")

    expect(result).not.toBeNull()
    expect(result?.scoring_method).toBe("timeline_longitudinal")
    expect(result?.score).toBe(68.5)
  })
})

describe("Timeline Context Builder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should build timeline context from review text", async () => {
    const { buildTimelineContext } = await import("../../../lib/timeline/context-builder")

    mockRpc.mockResolvedValue({
      data: { trust_score: 72 },
      error: null,
    })

    const result = await buildTimelineContext(
      "猫咪吃了两周后大便变软，但一个月后适应了，现在很好",
      "test-product-id",
      "test-pet-id"
    )

    expect(result).not.toBeNull()
    expect(result?.timeline_events.length).toBeGreaterThan(0)
    expect(result?.trust_score).toBe(72)
    expect(result?.product_id).toBe("test-product-id")
  })

  it("should convert timeline context to prompt format", async () => {
    const { buildTimelineContext, timelineContextToPrompt } = await import("../../../lib/timeline/context-builder")

    mockRpc.mockResolvedValue({
      data: { trust_score: 72 },
      error: null,
    })

    const context = await buildTimelineContext(
      "猫咪吃了两周后大便变软，但一个月后适应了",
      "test-product-id"
    )

    expect(context).not.toBeNull()
    const prompt = timelineContextToPrompt(context!)
    expect(prompt).toContain("Product Timeline Context")
    expect(prompt).toContain("Trust Score: 72")
    expect(prompt).toContain("Outcome Summary")
  })
})

describe("Outcome Recommendation Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should recommend food by outcome", async () => {
    mockRpc.mockResolvedValue({
      data: {
        pet_id: "test-pet-id",
        pet_profile: {
          breed: "british_shorthair",
          age: 2,
          sterilized: true,
          sensitive_gut: true,
        },
        recommendations: [
          {
            product_id: "product-1",
            product_name: "Test Food A",
            brand: "TestBrand",
            stability_rate: 72,
            soft_stool_risk: 18,
            black_chin_risk: 12,
            vomiting_risk: 8,
            repurchase_rate: 63,
            confidence: 85,
            matched_timelines: 25,
            decay_curve: { month_1: 75, month_3: 72, month_6: 68 },
            longitudinal_score: 72.5,
          },
        ],
        scoring_method: "outcome_recommendation",
        generated_at: "2026-06-11T00:00:00Z",
      },
      error: null,
    })

    const { recommendFoodByOutcome } = await import("../../../lib/timeline/outcome-recommendation")
    const result = await recommendFoodByOutcome("test-pet-id", 5)

    expect(result).not.toBeNull()
    expect(result?.recommendations.length).toBe(1)
    expect(result?.scoring_method).toBe("outcome_recommendation")
    expect(result?.recommendations[0].stability_rate).toBe(72)
    expect(result?.recommendations[0].soft_stool_risk).toBe(18)
  })

  it("should match outcome for pet profile", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          product_id: "product-1",
          product_name: "Test Food A",
          brand: "TestBrand",
          stability_rate: 72,
          soft_stool_risk: 18,
          black_chin_risk: 12,
          vomiting_risk: 8,
          repurchase_rate: 63,
          confidence: 85,
          matched_timelines: 25,
          decay_curve: { month_1: 75, month_3: 72, month_6: 68 },
          longitudinal_score: 72.5,
        },
      ],
      error: null,
    })

    const { matchOutcomeForPet } = await import("../../../lib/timeline/outcome-recommendation")
    const result = await matchOutcomeForPet({
      breed: "British Shorthair",
      age: 2,
      sterilized: true,
      sensitive_gut: true,
    })

    expect(result.length).toBe(1)
    expect(result[0].stability_rate).toBe(72)
    expect(result[0].soft_stool_risk).toBe(18)
  })
})
