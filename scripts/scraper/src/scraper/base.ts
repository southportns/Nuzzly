import { chromium, Browser, Page } from "playwright"
import { Product } from "../schemas/product"

export abstract class BaseScraper {
  protected browser: Browser | null = null
  protected page: Page | null = null
  protected platform: string
  protected delayMs = 1000

  constructor(platform: string) {
    this.platform = platform
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: true })
    this.page = await this.browser.newPage()
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  protected async delay(): Promise<void> {
    await new Promise((r) => setTimeout(r, this.delayMs))
  }

  abstract scrape(urls: string[]): Promise<Product[]>
  abstract parseProduct(html: string, url: string): Promise<Product | null>
}
