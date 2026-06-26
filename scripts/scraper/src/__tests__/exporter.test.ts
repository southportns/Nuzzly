import { describe, it, expect } from "vitest"
import { exportToJSON, exportToCSV } from "../exporter"
import { Product } from "../schemas/product"

const mockProduct: Product = {
  name: "皇家猫粮成猫粮",
  brand: "皇家",
  price: 299,
  weight: "2kg",
  proteinPercent: 32.5,
  fatPercent: 18.2,
  fiberPercent: 4.5,
  ashPercent: 7.8,
  moisturePercent: 8.0,
  carbohydrateEst: 29.0,
  ingredientList: ["鸡肉", "鱼粉", "玉米"],
  lifeStage: "adult",
  applicableSpecies: ["cats"],
  grainFree: false,
  countryOfOrigin: "中国",
  sourceUrl: "https://example.com/product/123",
  sourcePlatform: "boqii",
}

describe("exportToJSON", () => {
  it("exports products to formatted JSON string", () => {
    const result = exportToJSON([mockProduct])
    const parsed = JSON.parse(result)
    expect(parsed).toEqual([mockProduct])
    expect(result).toBe(JSON.stringify([mockProduct], null, 2))
  })

  it("returns empty array JSON for empty input", () => {
    const result = exportToJSON([])
    expect(result).toBe("[]")
  })
})

describe("exportToCSV", () => {
  it("exports products to CSV with headers", () => {
    const result = exportToCSV([mockProduct])
    const lines = result.split("\n")
    expect(lines[0]).toContain("name")
    expect(lines[0]).toContain("brand")
    expect(lines[1]).toContain("皇家猫粮成猫粮")
    expect(lines[1]).toContain("皇家")
  })

  it("returns empty string for empty input", () => {
    expect(exportToCSV([])).toBe("")
  })

  it("handles array fields with semicolons", () => {
    const result = exportToCSV([mockProduct])
    expect(result).toContain("鸡肉; 鱼粉; 玉米")
  })

  it("handles boolean fields", () => {
    const result = exportToCSV([mockProduct])
    expect(result).toContain("No")
  })
})
