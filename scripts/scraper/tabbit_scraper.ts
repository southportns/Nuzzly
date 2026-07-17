/**
 * Tabbit Browser 爬虫 - 替代 Playwright
 *
 * 优势：
 * 1. 真实浏览器环境，反爬检测大幅降低
 * 2. 复用用户已登录的 Tabbit 浏览器（Cookie/登录态）
 * 3. 支持 AI 辅助数据提取
 * 4. 多标签并行抓取
 *
 * 用法：
 *   npx tsx tabbit_scraper.ts taobao 猫粮 50
 *   npx tsx tabbit_scraper.ts boqii 猫粮 50
 */

import { createRequire } from "module"
const require = createRequire(import.meta.url)

// 动态加载 tabbit-browser 模块
const tabbitPath = "C:\\Users\\Galaxy\\tabbit-browser\\lib\\tabbit.js"
const { TabbitClient, TabbitBrowser } = require(tabbitPath)
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
const OUTPUT_DIR = path.join(__dirname, "output")

mkdirSync(OUTPUT_DIR, { recursive: true })

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── CDP Session ─────────────────────────────────────────

class CDP {
  private ws: any = null
  private msgId = 0
  private handlers = new Map()

  constructor(private wsUrl: string, private isBrowserLevel = false) {}

  async connect() {
    const { WebSocket } = await import("ws")
    this.ws = new WebSocket(this.wsUrl)
    await new Promise((r: any, j: any) => {
      this.ws.on("open", r)
      this.ws.on("error", j)
    })
    this.ws.on("message", (raw: any) => {
      const msg = JSON.parse(raw.toString())
      if (msg.id !== undefined && this.handlers.has(msg.id)) {
        const { resolve, reject, timer } = this.handlers.get(msg.id)
        clearTimeout(timer)
        this.handlers.delete(msg.id)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    })
    // 浏览器级 WebSocket 不支持 Runtime.enable
    if (!this.isBrowserLevel) {
      await this.send("Runtime.enable")
    }
    return this
  }

  send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId
      const timer = setTimeout(() => {
        this.handlers.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }, 30000)
      this.handlers.set(id, { resolve, reject, timer })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async eval(expr: string): Promise<any> {
    const r = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    })
    return r.result?.value
  }

  close() {
    if (this.ws) this.ws.close()
  }
}

// ─── Tabbit 爬虫基类 ─────────────────────────────────────

export class TabbitBaseScraper {
  protected platform: string
  protected client!: TabbitClient
  protected browser!: TabbitBrowser
  protected activeTab: CDP | null = null

  constructor(platform: string) {
    this.platform = platform
  }

  async init() {
    this.browser = new TabbitBrowser({ port: 9222 })
    this.client = this.browser.client()

    const running = await this.browser.isRunning()
    if (!running) {
      console.log("启动 Tabbit Browser...")
      await this.browser.launch()
    }
    console.log("Tabbit Browser 已连接\n")
  }

  async close() {
    if (this.activeTab) this.activeTab.close()
    await this.client.close()
  }

  /** 打开新标签页并连接 */
  protected async openTab(url: string): Promise<CDP> {
    const version = await this.client.getVersion()
    const browserWs = new CDP(version.webSocketDebuggerUrl, true)
    await browserWs.connect()

    await browserWs.send("Target.createTarget", { url })
    await sleep(2000)
    browserWs.close()

    // 找到新页面
    const targets = await this.client.getTargets()
    const page = targets.find(
      (t: any) => t.type === "page" && t.url.includes(url.split("?")[0].split("//")[1])
    )
    if (!page) throw new Error(`Failed to open: ${url}`)

    const cdp = new CDP(page.webSocketDebuggerUrl)
    await cdp.connect()

    // 反检测：注入脚本隐藏自动化标记
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        // 隐藏 webdriver 标记
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // 移除 Chrome DevTools Protocol 检测
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        // 覆盖 chrome.runtime 检测
        if (window.chrome) {
          window.chrome.runtime = window.chrome.runtime || {};
        }
        // 覆盖权限查询
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      `
    })

    this.activeTab = cdp
    return cdp
  }

  /** 连接到当前活跃页面 */
  protected async connectToActive(): Promise<CDP> {
    const targets = await this.client.getTargets()
    const page = targets.find((t: any) => t.type === "page")
    if (!page) throw new Error("No active page")

    if (this.activeTab) this.activeTab.close()
    const cdp = new CDP(page.webSocketDebuggerUrl)
    await cdp.connect()
    this.activeTab = cdp
    return cdp
  }

  /** 等待页面加载 */
  protected async waitForContent(cdp: CDP, selector: string, timeout = 15000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const found = await cdp.eval(`document.querySelector('${selector}') !== null`)
      if (found) return true
      await sleep(500)
    }
    return false
  }

  /** 滚动页面触发懒加载 */
  protected async autoScroll(cdp: CDP, times = 15, delay = 1000) {
    for (let i = 0; i < times; i++) {
      // 随机滚动距离和间隔，模拟人类
      const scrollY = 200 + Math.floor(Math.random() * 400)
      await cdp.eval(`window.scrollBy(0, ${scrollY})`)
      await sleep(delay + Math.random() * 500)
    }
  }

  /** 保存产品数据 */
  async saveProducts(products: PetFoodProduct[], filename?: string) {
    const name = filename || `${this.platform}_tabbit_products.json`
    const outputPath = path.join(OUTPUT_DIR, name)
    writeFileSync(outputPath, JSON.stringify(products, null, 2))
    console.log(`\nSaved ${products.length} products to ${outputPath}`)
  }

  /** 搜索（子类实现） */
  async search(keyword: string, limit: number): Promise<PetFoodProduct[]> {
    throw new Error("search() must be implemented by subclass")
  }

  protected toStandardProduct(raw: any): PetFoodProduct {
    const title = raw.name || raw.title || ""
    const weight = extractWeight(title)
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
}

// ─── 淘宝 Tabbit 爬虫 ────────────────────────────────────

export class TaobaoTabbitScraper extends TabbitBaseScraper {
  constructor() {
    super("taobao")
  }

  async search(keyword: string, limit: number = 50): Promise<PetFoodProduct[]> {
    console.log(`\n[Tabbit] Searching Taobao: "${keyword}"`)
    console.log(`Target: ${limit} products\n`)

    // 模拟人类行为：先访问首页，再搜索
    console.log("1. 访问淘宝首页...")
    const homeCdp = await this.openTab("https://www.taobao.com")
    await sleep(2000 + Math.random() * 2000)

    // 模拟浏览行为
    await homeCdp.eval("window.scrollBy(0, 300)")
    await sleep(1000)
    homeCdp.close()

    // 再打开搜索页
    console.log("2. 执行搜索...")
    const url = `https://s.taobao.com/search?q=${encodeURIComponent(keyword)}&sort=sale-desc`
    const cdp = await this.openTab(url)

    // 随机等待，模拟人类反应
    const waitTime = 3000 + Math.random() * 3000
    console.log(`等待页面加载 (${Math.round(waitTime/1000)}s)...`)
    await sleep(waitTime)

    // 检查是否需要登录/验证码
    const pageText = await cdp.eval("document.body?.innerText || ''")
    if (pageText.includes("验证码") || pageText.includes("请登录")) {
      console.log("⚠️  检测到验证码/登录页面，请在 Tabbit 中手动完成验证...")
      console.log("   完成后按 Enter 继续")
      // 等待用户手动操作
      await new Promise((r) => {
        process.stdin.once("data", r)
      })
    }

    // 滚动加载
    console.log("滚动加载商品...")
    await this.autoScroll(cdp, 20, 800)

    // 提取商品数据
    console.log("提取商品数据...")
    const rawProducts = await cdp.eval(`(() => {
      const items = []
      const seen = new Set()

      document.querySelectorAll("a").forEach(a => {
        const href = a.href || ""
        if (!href.includes("item.taobao.com") && !href.includes("detail.tmall.com")) return

        const title = a.textContent?.trim() || ""
        if (!title || title.length < 10 || title.length > 200) return
        if (seen.has(title)) return
        seen.add(title)

        let card = a.parentElement
        for (let i = 0; i < 5; i++) {
          if (card && card.querySelector("img")) break
          card = card?.parentElement || null
        }
        if (!card) return

        const imgUrls = []
        card.querySelectorAll("img").forEach(img => {
          const src = img.getAttribute("data-src") || img.getAttribute("src") || ""
          if (src && !imgUrls.includes(src) && imgUrls.length < 3) {
            imgUrls.push(src.startsWith("//") ? "https:" + src : src)
          }
        })

        const allText = card.textContent || ""
        const priceMatch = allText.match(/[¥￥]\\s*(\\d+\\.?\\d*)/)
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0

        const salesMatch = allText.match(/(\\d+[\\+]?\\s*(?:人付款|人收货))/)
        const sales = salesMatch ? salesMatch[1] : ""

        const mfgMatch = allText.match(/([\\u4e00-\\u9fa5]{4,20}(?:有限公司|工厂|厂|实业))/)
        const manufacturer = mfgMatch ? mfgMatch[1] : ""

        items.push({
          name: title.substring(0, 200),
          url: href,
          price,
          images: imgUrls,
          sales,
          manufacturer,
        })
      })

      return JSON.stringify(items)
    })()`)

    const raw = JSON.parse(rawProducts || "[]")
    console.log(`提取到 ${raw.length} 个商品`)

    const products = raw.slice(0, limit).map((r: any) => this.toStandardProduct(r))
    return products
  }
}

// ─── 波奇 Tabbit 爬虫 ────────────────────────────────────

export class BoqiiTabbitScraper extends TabbitBaseScraper {
  constructor() {
    super("boqii")
  }

  async search(keyword: string, limit: number = 50): Promise<PetFoodProduct[]> {
    console.log(`\n[Tabbit] Searching Boqii: "${keyword}"`)
    console.log(`Target: ${limit} products\n`)

    const url = `https://www.boqii.com/search?q=${encodeURIComponent(keyword)}`
    const cdp = await this.openTab(url)

    console.log("等待页面加载...")
    await sleep(5000)

    // 提取搜索结果链接
    const linksJson = await cdp.eval(`(() => {
      const links = []
      document.querySelectorAll('a[href*="product-"]').forEach(a => {
        const href = a.href || ""
        if (href.includes("product-") && !links.includes(href)) {
          links.push(href.split("#")[0])
        }
      })
      return JSON.stringify(links.slice(0, ${limit}))
    })()`)

    const links = JSON.parse(linksJson || "[]")
    console.log(`找到 ${links.length} 个商品链接`)

    const products: PetFoodProduct[] = []

    for (const link of links) {
      try {
        console.log(`  抓取: ${link.substring(0, 60)}...`)
        await cdp.eval(`location.href = "${link}"`)
        await sleep(3000)

        const data = await cdp.eval(`(() => {
          const title = document.querySelector("h1")?.textContent?.trim() || ""
          const priceEl = document.querySelector(".price, [class*='price']")
          const price = priceEl ? parseFloat(priceEl.textContent?.replace(/[^\\d.]/g, "") || "0") : 0

          const imgs = []
          document.querySelectorAll("img").forEach(img => {
            const src = img.src || ""
            if (src && !src.includes("logo") && !src.includes("icon") && imgs.length < 3) {
              imgs.push(src)
            }
          })

          const text = document.body?.innerText || ""
          const weightMatch = text.match(/(\\d+\\.?\\d*)\\s*(?:kg|g|斤|磅)/i)
          const weight = weightMatch ? weightMatch[0] : ""

          const brandEl = document.querySelector("[class*='brand'], [class*='manufacturer']")
          const brand = brandEl?.textContent?.trim() || ""

          const mfgMatch = text.match(/([\\u4e00-\\u9fa5]{4,20}(?:有限公司|工厂|厂|实业))/)
          const manufacturer = mfgMatch ? mfgMatch[1] : ""

          const salesMatch = text.match(/已售\\s*(\\d+)/)
          const sales = salesMatch ? "已售" + salesMatch[1] : ""

          return JSON.stringify({ name: title, price, images: imgs, brand, manufacturer, sales, weight, url: location.href })
        })()`)

        if (data) {
          const parsed = JSON.parse(data)
          if (parsed.name) {
            products.push(this.toStandardProduct(parsed))
          }
        }

        await sleep(1000 + Math.random() * 2000)
      } catch (e: any) {
        console.error(`  失败: ${e.message}`)
      }
    }

    return products
  }
}

// ─── 京东 Tabbit 爬虫 ────────────────────────────────────

export class JDTabbitScraper extends TabbitBaseScraper {
  constructor() {
    super("jd")
  }

  async search(keyword: string, limit: number = 50): Promise<PetFoodProduct[]> {
    console.log(`\n[Tabbit] Searching JD: "${keyword}"`)
    console.log(`Target: ${limit} products\n`)

    // 1. 先访问京东首页（建立 session）
    console.log("1. 访问京东首页...")
    const homeCdp = await this.openTab("https://www.jd.com")
    await sleep(2000 + Math.random() * 2000)
    homeCdp.close()

    // 2. 导航到搜索页
    console.log("2. 执行搜索...")
    const targets = await this.client.getTargets()
    const page = targets.find((t: any) => t.type === "page" && t.url.includes("jd.com"))
    if (!page) throw new Error("京东页面未找到")

    const cdp = new CDP(page.webSocketDebuggerUrl)
    await cdp.connect()

    // 反检测
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `Object.defineProperty(navigator, 'webdriver', { get: () => undefined });`
    })

    await cdp.eval(`location.href = "https://search.jd.com/Search?keyword=${encodeURIComponent(keyword)}&enc=utf-8"`)

    const waitTime = 3000 + Math.random() * 3000
    console.log(`等待搜索结果 (${Math.round(waitTime / 1000)}s)...`)
    await sleep(waitTime)

    // 3. 检查是否被拦截
    const currentUrl = await cdp.eval("location.href")
    if (currentUrl.includes("risk_handler") || currentUrl.includes("passport")) {
      console.log("⚠️  被风控/登录拦截，请在 Tabbit 中手动完成验证后按 Enter")
      await new Promise((r) => process.stdin.once("data", r))
      await sleep(3000)
    }

    // 4. 滚动加载
    console.log("3. 滚动加载商品...")
    await this.autoScroll(cdp, 15, 800)

    // 5. 提取商品数据
    console.log("4. 提取商品数据...")
    const rawProducts = await cdp.eval(`(() => {
      const items = []
      const cards = document.querySelectorAll("div[class*='_card_']")

      cards.forEach(card => {
        // 标题
        const titleEl = card.querySelector("div[class*='_goods_title_container_'] span[class*='_newStyle_']")
        const title = titleEl?.textContent?.trim() || ""
        if (!title) return

        // 价格
        const priceEl = card.querySelector("span[class*='_price_']")
        const priceText = priceEl?.textContent?.trim() || ""
        const price = parseFloat(priceText.replace(/[^\\d.]/g, "")) || 0

        // 销量
        const volumeEl = card.querySelector("span[class*='_goods_volume_']")
        const sales = volumeEl?.textContent?.trim() || ""

        // 图片
        const imgEl = card.querySelector("img[data-src], img[class*='_img_']")
        const img = imgEl?.getAttribute("data-src") || imgEl?.src || ""
        const imageUrl = img.startsWith("//") ? "https:" + img : img

        // 标签（自营、京东京造等）
        const tagEls = card.querySelectorAll("div[class*='_tag_'] img, div[class*='_imgTag_'] img")
        const tags = [...tagEls].map(e => e.alt || "").filter(Boolean).join(", ")

        // 店铺
        const shopEls = card.querySelectorAll("div[class*='_shop_'], span[class*='_shop_']")
        const shop = shopEls[0]?.textContent?.trim() || ""

        items.push({
          name: title.substring(0, 200),
          price,
          images: imageUrl ? [imageUrl] : [],
          sales,
          tags,
          shop,
        })
      })

      return JSON.stringify(items)
    })()`)

    const raw = JSON.parse(rawProducts || "[]")
    console.log(`提取到 ${raw.length} 个商品`)

    const products = raw.slice(0, limit).map((r: any) => {
      const base = this.toStandardProduct(r)
      // 京东特色：从销量中提取数字
      if (r.sales) {
        base.sales = r.sales
      }
      return base
    })

    cdp.close()
    return products
  }
}

// ─── 小红书 Tabbit 爬虫 ────────────────────────────────────

export class XhsTabbitScraper extends TabbitBaseScraper {
  constructor() {
    super("xhs")
  }

  async search(keyword: string, limit: number = 50): Promise<any[]> {
    console.log(`\n[Tabbit] Searching Xiaohongshu: "${keyword}"`)
    console.log(`Target: ${limit} notes\n`)

    // 1. 找到或打开小红书
    let targets = await this.client.getTargets()
    let page = targets.find((t: any) => t.type === "page" && t.url.includes("xiaohongshu.com"))

    if (!page) {
      console.log("打开小红书首页...")
      const version = await this.client.getVersion()
      const browserWs = new CDP(version.webSocketDebuggerUrl, true)
      await browserWs.connect()
      await browserWs.send("Target.createTarget", { url: "https://www.xiaohongshu.com" })
      await sleep(3000)
      browserWs.close()

      targets = await this.client.getTargets()
      page = targets.find((t: any) => t.type === "page" && t.url.includes("xiaohongshu.com"))
    }

    if (!page) throw new Error("小红书页面未找到")

    // 2. 连接并注入反检测
    const cdp = new CDP(page.webSocketDebuggerUrl)
    await cdp.connect()
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `Object.defineProperty(navigator,'webdriver',{get:()=>undefined});`
    })

    // 3. 导航到搜索页
    console.log("导航到搜索页...")
    await cdp.eval(`location.href = "https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes"`)
    await sleep(5000)

    // 4. 滚动加载
    console.log("滚动加载笔记...")
    for (let i = 0; i < 10; i++) {
      await cdp.eval("window.scrollBy(0, 500)")
      await sleep(800 + Math.random() * 400)
    }

    // 5. 提取笔记
    console.log("提取笔记数据...")
    const rawNotes = await cdp.eval(`JSON.stringify((() => {
      const items = []
      const seen = new Set()

      document.querySelectorAll("section, [class*='note'], [class*='card'], [class*='feed']").forEach(el => {
        const title = (el.querySelector("[class*='title'], [class*='desc'], h3") || {}).textContent?.trim() || ""
        const author = (el.querySelector("[class*='author'], [class*='name'], [class*='nickname']") || {}).textContent?.trim() || ""
        const likes = (el.querySelector("[class*='like'], [class*='count']") || {}).textContent?.trim() || ""

        if (title && title.length > 3 && title.length < 100 && !seen.has(title)) {
          seen.add(title)
          items.push({ title: title.substring(0, 100), author, likes })
        }
      })

      return items.slice(0, ${limit})
    })())`)

    const notes = JSON.parse(rawNotes || "[]")
    console.log(`提取到 ${notes.length} 条笔记`)

    cdp.close()
    return notes
  }
}

// ─── 主入口 ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const platform = args[0] || "taobao"
  const keyword = args[1] || "猫粮"
  const limit = parseInt(args[2]) || 50

  console.log("========================================")
  console.log("  Pet Food Scraper - Tabbit Browser")
  console.log("========================================")
  console.log(`Platform: ${platform}`)
  console.log(`Keyword: ${keyword}`)
  console.log(`Limit: ${limit}`)
  console.log("========================================\n")

  let scraper
  switch (platform) {
    case "taobao":
      scraper = new TaobaoTabbitScraper()
      break
    case "boqii":
      scraper = new BoqiiTabbitScraper()
      break
    case "jd":
      scraper = new JDTabbitScraper()
      break
    case "xhs":
    case "xiaohongshu":
      scraper = new XhsTabbitScraper()
      break
    default:
      console.error(`Unknown platform: ${platform}`)
      console.error("Supported: taobao, boqii, jd, xhs")
      process.exit(1)
  }

  try {
    await scraper.init()
    const results = await scraper.search(keyword, limit)

    // 小红书输出格式不同
    if (platform === "xhs" || platform === "xiaohongshu") {
      console.log(`\n=== Results: ${results.length} notes ===\n`)
      results.slice(0, 10).forEach((n: any, i: number) => {
        console.log(`${i + 1}. ${n.title}`)
        console.log(`   Author: ${n.author || "N/A"} | Likes: ${n.likes || "N/A"}`)
        console.log("")
      })
      // 保存
      const outputPath = path.join(OUTPUT_DIR, "xhs_tabbit_notes.json")
      writeFileSync(outputPath, JSON.stringify(results, null, 2))
      console.log(`Saved ${results.length} notes to ${outputPath}`)
    } else {
      console.log(`\n=== Results: ${results.length} products ===\n`)
      results.slice(0, 10).forEach((p: any, i: number) => {
        console.log(`${i + 1}. ${p.name}`)
        console.log(`   Brand: ${p.brand} | Price: ¥${p.price} | Weight: ${p.weight || "N/A"}`)
        console.log(`   Price/kg: ¥${p.pricePerKg}/kg | Mfg: ${p.manufacturer || "N/A"}`)
        console.log(`   Images: ${p.images.length} | Sales: ${p.sales || "N/A"}`)
        console.log("")
      })

      const withIngredients = results.filter((p: any) => p.ingredients).length
      const withImages = results.filter((p: any) => p.images.length > 0).length
      console.log("=== Statistics ===")
      console.log(`Total: ${results.length}`)
      console.log(`With ingredients: ${withIngredients}`)
      console.log(`With images: ${withImages}`)

      await scraper.saveProducts(results)
    }
    console.log("\nDone!")
  } finally {
    await scraper.close()
  }
}

main().catch(console.error)
