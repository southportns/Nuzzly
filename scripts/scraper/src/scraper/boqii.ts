import { BaseScraper } from "./base"
import { Product } from "../schemas/product"
import * as cheerio from "cheerio"
import { extractDetailedInfo } from "../ocr"

export class BoqiiScraper extends BaseScraper {
  constructor() {
    super("boqii")
  }

  async scrape(urls: string[]): Promise<Product[]> {
    if (!this.page) await this.init()
    const products: Product[] = []

    for (const url of urls) {
      try {
        await this.page!.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
        await this.page!.waitForTimeout(3000)
        const html = await this.page!.content()
        const product = await this.parseProduct(html, url, this.page)
        if (product) products.push(product)
        await this.delay()
      } catch (e) {
        console.error(`Failed to scrape ${url}:`, e)
      }
    }

    return products
  }

  async scrapeListPage(listUrl: string, limit = 10): Promise<Product[]> {
    if (!this.page) await this.init()
    const products: Product[] = []

    try {
      await this.page!.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 15000 })
      const html = await this.page!.content()
      const $ = cheerio.load(html)

      const productLinks: string[] = []
      $('a[href*="product-"]').each((_, el) => {
        const href = $(el).attr("href")
        if (href && href.includes("product-") && !href.includes("#")) {
          const baseUrl = href.split("#")[0]
          if (!productLinks.includes(baseUrl)) {
            productLinks.push(baseUrl)
          }
        }
      })

      const uniqueLinks = productLinks.slice(0, limit)
      console.log(`Found ${uniqueLinks.length} product links`)

      for (const link of uniqueLinks) {
        try {
          const fullUrl = link.startsWith("http") ? link : link.startsWith("//") ? `https:${link}` : `https://shop.boqii.com${link}`
          await this.page!.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 })
          await this.page!.waitForTimeout(3000)
          const productHtml = await this.page!.content()
          const product = await this.parseProduct(productHtml, fullUrl, this.page)
          if (product) products.push(product)
          await this.delay()
        } catch (e) {
          console.error(`Failed to scrape product:`, e)
        }
      }
    } catch (e) {
      console.error(`Failed to scrape list page:`, e)
    }

    return products
  }

  async parseProduct(html: string, url: string, page?: any): Promise<Product | null> {
    const $ = cheerio.load(html)

    const title = $("title").text().replace(/【.*】_波奇商城$/, "").trim()
    const breadcrumb = $(".breadcrumb a").last().prev().text().trim()
    const name = title || breadcrumb || ""

    const brand = this.extractBrandFromName(name)

    const priceText = $("dt:contains('波 奇 价')").next("dd").text().trim() ||
                      $(".product-info .price").first().text().trim() ||
                      ""
    const priceMatch = priceText.match(/¥(\d+\.?\d*)/)
    const price = priceMatch ? parseFloat(priceMatch[1]) : NaN

    if (!name || isNaN(price)) return null

    const weightMatch = name.match(/(\d+\.?\d*\s*(?:kg|g|斤))/i) ||
                        html.match(/重量[：:]\s*(\d+\.?\d*\s*(?:kg|g|KG))/i)
    const weight = weightMatch ? weightMatch[1] : "未知"

    const manufacturer = this.extractManufacturer(html, brand)
    const catFoodType = this.extractCatFoodType(name, html)

    let images: string[] = []
    if (page) {
      try {
        images = await page.evaluate(() => {
          const imgs: string[] = []
          document.querySelectorAll('img').forEach((img: any) => {
            const src = img.getAttribute('data-original') ||
                       img.getAttribute('data-src') ||
                       img.src
            if (src && !src.includes('load.gif') && !imgs.includes(src)) {
              if (src.includes('shoppicpath') || src.includes('shopimgFile')) {
                imgs.push(src)
              }
            }
          })
          return imgs
        })
      } catch (e) {
        console.error("Failed to extract images:", e)
      }
    }

    let ingredientList: string[] = []
    let proteinPercent: number | undefined
    let fatPercent: number | undefined
    let fiberPercent: number | undefined
    let ashPercent: number | undefined
    let moisturePercent: number | undefined

    const pageText = $.text()

    const ingredientMatch = pageText.match(/主要原料[：:]\s*([^\t\n]+)/)
    if (ingredientMatch) {
      ingredientList = ingredientMatch[1]
        .split(/[,，、]/)
        .map(s => s.trim())
        .filter(s => s.length > 1)
    }

    const proteinMatch = pageText.match(/粗蛋白[≥>]\s*(\d+\.?\d*)\s*%/)
    if (proteinMatch) proteinPercent = parseFloat(proteinMatch[1])

    const fatMatch = pageText.match(/粗脂肪[≥>]\s*(\d+\.?\d*)\s*%/)
    if (fatMatch) fatPercent = parseFloat(fatMatch[1])

    const fiberMatch = pageText.match(/粗纤维[≤<]\s*(\d+\.?\d*)\s*%/)
    if (fiberMatch) fiberPercent = parseFloat(fiberMatch[1])

    const ashMatch = pageText.match(/粗灰分[≤<]\s*(\d+\.?\d*)\s*%/)
    if (ashMatch) ashPercent = parseFloat(ashMatch[1])

    const moistureMatch = pageText.match(/水分[≤<]\s*(\d+\.?\d*)\s*%/)
    if (moistureMatch) moisturePercent = parseFloat(moistureMatch[1])

    return {
      name,
      brand: brand || "未知",
      manufacturer: manufacturer || undefined,
      catFoodType: catFoodType || undefined,
      price,
      weight,
      images: images.length > 0 ? images : undefined,
      ingredientList: ingredientList.length > 0 ? ingredientList : undefined,
      proteinPercent,
      fatPercent,
      fiberPercent,
      ashPercent,
      moisturePercent,
      sourceUrl: url,
      sourcePlatform: this.platform,
    }
  }

  private extractManufacturer(html: string, brand: string): string {
    const mfgMatch = html.match(/生产企业[：:]\s*([^\n<]+)/)
    if (mfgMatch) return mfgMatch[1].trim()

    const companyMatch = html.match(/生产厂家[：:]\s*([^\n<]+)/)
    if (companyMatch) return companyMatch[1].trim()

    const brandMap: Record<string, string> = {
      "怡亲": "乖宝宠物食品集团",
      "优倍滋": "山东汉欧生物科技有限公司",
      "皇家": "皇家宠物食品（中国）有限公司",
      "冠能": "雀巢普瑞纳宠物食品有限公司",
      "伟嘉": "玛氏食品（中国）有限公司",
      "比瑞吉": "上海比瑞吉宠物食品有限公司",
      "网易严选": "网易严选",
      "高爷家": "杭州高爷家宠物用品有限公司",
      "渴望": "加拿大渴望宠物食品公司",
      "爱肯拿": "加拿大冠军宠物食品公司",
    }
    return brandMap[brand] || brand
  }

  private extractCatFoodType(name: string, html: string): string {
    if (name.includes("幼猫") || name.includes("Kitten")) return "幼猫粮"
    if (name.includes("成猫") || name.includes("全期")) return "全期猫粮"
    if (name.includes("老猫") || name.includes("老年")) return "老年猫粮"
    if (name.includes("处方")) return "处方粮"
    if (name.includes("冻干")) return "冻干猫粮"
    if (name.includes("湿粮") || name.includes("罐头")) return "湿粮"

    const typeMatch = html.match(/产品类型[：:]\s*([^\n<]+)/)
    if (typeMatch) return typeMatch[1].trim()

    return "全期猫粮"
  }

  private extractBrandFromName(name: string): string {
    const brandPatterns = [
      /^(皇家|Royal\s*Canin)/i,
      /^(怡亲|Yoken)/i,
      /^(优倍滋)/i,
      /^(伟嘉|Whiskas)/i,
      /^(冠能|Pro\s*Plan)/i,
      /^(渴望|Orijen)/i,
      /^(爱肯拿|Acana)/i,
      /^(纽顿|Nutrience)/i,
      /^(比瑞吉|Nature\s*Bridge)/i,
      /^(网易严选)/i,
      /^(高爷家)/i,
      /^(Go!)/i,
      /^(巅峰|Ziwi)/i,
    ]

    for (const pattern of brandPatterns) {
      const match = name.match(pattern)
      if (match) return match[1]
    }

    return ""
  }
}
