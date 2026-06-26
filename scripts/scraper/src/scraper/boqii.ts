import { BaseScraper } from "./base"
import { Product } from "../schemas/product"
import * as cheerio from "cheerio"

export class BoqiiScraper extends BaseScraper {
  constructor() {
    super("boqii")
  }

  async scrape(urls: string[]): Promise<Product[]> {
    if (!this.page) await this.init()
    const products: Product[] = []

    for (const url of urls) {
      try {
        await this.page!.goto(url, { waitUntil: "domcontentloaded" })
        const html = await this.page!.content()
        const product = await this.parseProduct(html, url)
        if (product) products.push(product)
        await this.delay()
      } catch (e) {
        console.error(`Failed to scrape ${url}:`, e)
      }
    }

    return products
  }

  async parseProduct(html: string, url: string): Promise<Product | null> {
    const $ = cheerio.load(html)

    const name = $(".product-name").text().trim()
    const brand = $(".brand-name").text().trim()
    const priceText = $(".price").text().trim()
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ""))

    if (!name || !brand || isNaN(price)) return null

    return {
      name,
      brand,
      price,
      weight: $(".weight").text().trim() || "未知",
      sourceUrl: url,
      sourcePlatform: this.platform,
    }
  }
}
