import { describe, it, expect } from "vitest"
import { ProductSchema } from "../product"

describe("ProductSchema", () => {
  it("validates a complete product", () => {
    const product = {
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
    expect(ProductSchema.parse(product)).toEqual(product)
  })

  it("rejects product without required fields", () => {
    expect(() => ProductSchema.parse({ name: "test" })).toThrow()
  })
})
