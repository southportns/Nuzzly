/**
 * 标准化宠物食品爬虫
 * 所有平台统一输出格式
 *
 * 数据字段：
 * 1. 产品名称 (name)
 * 2. 品牌 (brand)
 * 3. 生产厂家 (manufacturer)
 * 4. 价格 (price)
 * 5. 重量 (weight)
 * 6. 单价/kg (pricePerKg)
 * 7. 配料表 (ingredients)
 * 8. 产品图片3张 (images)
 * 9. 月销量 (sales)
 * 10. 产品链接 (sourceUrl)
 */

import { chromium } from "playwright"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import {
  PetFoodProduct,
  extractBrand,
  extractWeight,
  cleanTitle,
} from "./schema"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const COOKIES_DIR = path.join(__dirname, "cookies")
const OUTPUT_DIR = path.join(__dirname, "output")

mkdirSync(COOKIES_DIR, { recursive: true })
mkdirSync(OUTPUT_DIR, { recursive: true })

export class StandardScraper {
  protected platform: string
  protected browser: any = null
  protected context: any = null
  protected page: any = null

  constructor(platform: string) {
    this.platform = platform
  }

  async init(headless = true) {
    this.browser = await chromium.launch({
      headless,
      args: ["--disable-blink-features=AutomationControlled"],
    })
    this.context = await this.browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "zh-CN",
    })
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false })
    })
    await this.loadCookies()
    this.page = await this.context.newPage()
  }

  async close() {
    if (this.browser) {
      await this.saveCookies()
      await this.browser.close()
    }
  }

  protected getCookiePath(): string {
    return path.join(COOKIES_DIR, `${this.platform}_cookies.json`)
  }

  async loadCookies() {
    const cookiePath = this.getCookiePath()
    if (existsSync(cookiePath)) {
      const cookies = JSON.parse(readFileSync(cookiePath, "utf-8"))
      await this.context.addCookies(cookies)
    }
  }

  async saveCookies() {
    const cookies = await this.context.cookies()
    writeFileSync(this.getCookiePath(), JSON.stringify(cookies, null, 2))
  }

  protected toStandardProduct(raw: any): PetFoodProduct {
    const title = raw.name || raw.title || ""
    const weight = extractWeight(title)

    // 图片最多3张
    const allImages = raw.images || []
    const images = allImages.slice(0, 3)

    return {
      name: cleanTitle(title),
      brand: raw.brand || extractBrand(title),
      manufacturer: raw.manufacturer || "",
      price: raw.price || 0,
      weight: raw.weight || weight.text,
      pricePerKg: weight.kg > 0 ? Math.round((raw.price / weight.kg) * 100) / 100 : 0,
      ingredients: raw.ingredients || "",
      images,
      sales: raw.sales || "",
      sourceUrl: raw.url || raw.sourceUrl || "",
    }
  }

  async saveProducts(products: PetFoodProduct[], filename?: string) {
    const name = filename || `${this.platform}_products.json`
    const outputPath = path.join(OUTPUT_DIR, name)
    writeFileSync(outputPath, JSON.stringify(products, null, 2))
    console.log(`Saved ${products.length} products to ${outputPath}`)
  }

  async search(keyword: string, limit: number): Promise<PetFoodProduct[]> {
    throw new Error("search() must be implemented by subclass")
  }
}

// 淘宝爬虫
export class TaobaoScraper extends StandardScraper {
  constructor() {
    super("taobao")
  }

  async search(keyword: string, limit: number = 50): Promise<PetFoodProduct[]> {
    console.log(`\nSearching Taobao: "${keyword}"`)
    console.log(`Target: ${limit} products\n`)

    const url = `https://s.taobao.com/search?q=${encodeURIComponent(keyword)}&sort=sale-desc`
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })

    console.log("Waiting 90s for content/CAPTCHA...")
    await this.page.waitForTimeout(90000)

    for (let i = 0; i < 15; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 400))
      await this.page.waitForTimeout(1000)
    }

    const rawProducts = await this.page.evaluate(() => {
      const items: any[] = []
      const seen = new Set<string>()

      document.querySelectorAll("a").forEach((a: any) => {
        const href = a.href || ""
        if (!href.includes("item.taobao.com") && !href.includes("detail.tmall.com")) return

        const title = a.textContent?.trim() || ""
        if (!title || title.length < 10 || title.length > 200) return

        let card = a.parentElement
        for (let i = 0; i < 5; i++) {
          if (card && card.querySelector("img")) break
          card = card?.parentElement || null
        }
        if (!card) return

        // 提取图片（最多3张）
        const imgUrls: string[] = []
        card.querySelectorAll("img").forEach((img: any) => {
          const src = img.getAttribute("data-src") || img.getAttribute("src") || ""
          if (src && !imgUrls.includes(src) && imgUrls.length < 3) {
            imgUrls.push(src.startsWith("//") ? `https:${src}` : src)
          }
        })

        const allText = card.textContent || ""
        const priceMatch = allText.match(/[¥￥]\s*(\d+\.?\d*)/)
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0

        const salesMatch = allText.match(/(\d+[\+]?\s*(?:人付款|人收货))/)
        const sales = salesMatch ? salesMatch[1] : ""

        // 提取生产厂家
        const mfgMatch = allText.match(/([\u4e00-\u9fa5]{4,20}(?:有限公司|工厂|厂|实业))/)
        const manufacturer = mfgMatch ? mfgMatch[1] : ""

        const key = title.substring(0, 30)
        if (price > 0 && !seen.has(key)) {
          seen.add(key)
          items.push({
            name: title,
            price,
            sales,
            manufacturer,
            images: imgUrls,
            url: href.startsWith("//") ? `https:${href}` : href,
          })
        }
      })

      return items
    })

    return rawProducts.slice(0, limit).map(p => this.toStandardProduct(p))
  }
}

// 波奇网爬虫
export class BoqiiScraper extends StandardScraper {
  constructor() {
    super("boqii")
  }

  async search(keyword: string, limit: number = 50): Promise<PetFoodProduct[]> {
    console.log(`\nSearching Boqii: "${keyword}"`)
    console.log(`Target: ${limit} products\n`)

    const products: PetFoodProduct[] = []
    const seenUrls = new Set<string>()

    for (let page = 1; products.length < limit && page <= 5; page++) {
      const url = `https://shop.boqii.com/cat/list-576-0-0-0-0-${page}.html`
      console.log(`Fetching page ${page}...`)

      await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })
      const html = await this.page.content()

      const links: string[] = []
      const linkMatches = html.match(/href="(\/\/shop\.boqii\.com\/product-\d+\.html)"/g) || []
      for (const match of linkMatches) {
        const link = match.match(/href="([^"]+)"/)?.[1] || ""
        if (link && !links.includes(link)) links.push(link)
      }

      for (const link of links) {
        if (products.length >= limit) break

        const fullUrl = link.startsWith("//") ? `https:${link}` : link
        if (seenUrls.has(fullUrl)) continue
        seenUrls.add(fullUrl)

        try {
          await this.page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 15000 })
          await this.page.waitForTimeout(2000)

          const rawProduct = await this.page.evaluate(() => {
            const title = document.querySelector("title")?.textContent?.replace(/【.*】_波奇商城$/, "").trim() || ""
            const priceText = document.querySelector("dt:contains('波 奇 价')")?.nextElementSibling?.textContent || ""
            const priceMatch = priceText.match(/¥(\d+\.?\d*)/)
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0

            // 提取图片（最多3张）
            const imgUrls: string[] = []
            document.querySelectorAll("img").forEach((img: any) => {
              const src = img.getAttribute("data-original") || img.getAttribute("data-src") || img.src
              if (src && (src.includes("shoppicpath") || src.includes("shopimgFile"))) {
                if (!imgUrls.includes(src) && imgUrls.length < 3) {
                  imgUrls.push(src)
                }
              }
            })

            const bodyText = document.body?.innerText || ""
            const ingredientMatch = bodyText.match(/主要原料[：:]\s*([^\t\n]+)/)
            const ingredients = ingredientMatch ? ingredientMatch[1] : ""

            // 提取生产厂家
            const mfgMatch = bodyText.match(/(?:生产企业|生产厂家|制造商)[：:]\s*([^\n]+)/)
            const manufacturer = mfgMatch ? mfgMatch[1].trim() : ""

            return {
              name: title,
              price,
              images: imgUrls,
              ingredients,
              manufacturer,
            }
          })

          if (rawProduct.name && rawProduct.price > 0) {
            products.push(this.toStandardProduct({
              ...rawProduct,
              url: fullUrl,
            }))
          }
        } catch (e) {
          console.error(`Failed: ${fullUrl}`)
        }
      }
    }

    return products
  }
}

export { PetFoodProduct }
