import { describe, it, expect } from "vitest"
import { BoqiiScraper } from "../boqii"

describe("BoqiiScraper", () => {
  it("can be instantiated", () => {
    const scraper = new BoqiiScraper()
    expect(scraper).toBeDefined()
  })
})
