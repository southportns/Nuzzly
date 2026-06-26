import { describe, it, expect } from "vitest"
import { BaseScraper } from "../base"
import { Product } from "../../schemas/product"

class TestScraper extends BaseScraper {
  async scrape(urls: string[]): Promise<Product[]> {
    return []
  }

  async parseProduct(html: string, url: string): Promise<Product | null> {
    return null
  }
}

describe("BaseScraper", () => {
  it("has required methods", () => {
    const scraper = new TestScraper("test")
    expect(typeof scraper.scrape).toBe("function")
    expect(typeof scraper.parseProduct).toBe("function")
    expect(typeof scraper.close).toBe("function")
  })
})
