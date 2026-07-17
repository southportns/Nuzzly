/**
 * 小红书产品评价爬虫
 * 用于从淘宝产品名称搜索小红书相关帖子，提取用户反馈
 */

import { chromium } from "playwright"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const COOKIES_FILE = path.join(__dirname, "xhs_cookies.json")
const OUTPUT_DIR = path.join(__dirname, "output")

mkdirSync(OUTPUT_DIR, { recursive: true })

export interface XhsPost {
  title: string
  content: string
  author: string
  likes: number
  collects: number
  comments: number
  url: string
  images: string[]
  publishDate: string
}

export class XiaohongshuScraper {
  private browser: any = null
  private context: any = null
  private page: any = null

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

    if (existsSync(COOKIES_FILE)) {
      const cookies = JSON.parse(readFileSync(COOKIES_FILE, "utf-8"))
      await this.context.addCookies(cookies)
      console.log("Loaded existing cookies\n")
    }

    this.page = await this.context.newPage()
  }

  async close() {
    if (this.browser) {
      const cookies = await this.context.cookies()
      writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2))
      await this.browser.close()
    }
  }

  async login() {
    console.log("\n=== Xiaohongshu Login ===")
    console.log("A browser window will open.")
    console.log("Please log in to Xiaohongshu manually.")
    console.log("After logging in, press Enter here to continue.\n")

    await this.page.goto("https://www.xiaohongshu.com", { waitUntil: "domcontentloaded", timeout: 30000 })

    await new Promise<void>((resolve) => {
      process.stdin.resume()
      process.stdin.once("data", () => resolve())
    })

    const cookies = await this.context.cookies()
    writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2))
    console.log("Cookies saved!")
  }

  async searchPosts(keyword: string, limit: number = 20): Promise<XhsPost[]> {
    console.log(`\nSearching Xiaohongshu: "${keyword}"`)
    console.log(`Target: ${limit} posts\n`)

    const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes`

    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
    console.log("Waiting 10s for page load...")
    await this.page.waitForTimeout(10000)

    // 检查是否需要登录
    const needLogin = await this.page.evaluate(() => {
      return document.body?.innerText?.includes("手机号登录") || false
    })

    if (needLogin) {
      console.log("\n*** Login required ***")
      console.log("Please complete login in the browser window.")
      console.log("Press Enter here when done.")
      await new Promise<void>((resolve) => {
        process.stdin.resume()
        process.stdin.once("data", () => resolve())
      })
      await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
      await this.page.waitForTimeout(5000)
    }

    // 滚动加载更多
    for (let i = 0; i < 10; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 500))
      await this.page.waitForTimeout(1500)
    }

    // 提取帖子链接
    const postLinks = await this.page.evaluate(() => {
      const links: string[] = []
      document.querySelectorAll("a").forEach(a => {
        const href = a.href || ""
        if (href.includes("/explore/") || href.includes("/search_result/")) {
          if (!links.includes(href)) links.push(href)
        }
      })
      return links.slice(0, 20)
    })

    console.log(`Found ${postLinks.length} post links`)

    // 逐个访问帖子提取内容
    const posts: XhsPost[] = []
    for (const link of postLinks) {
      if (posts.length >= limit) break

      try {
        const post = await this.scrapePost(link)
        if (post) {
          posts.push(post)
          console.log(`  ✓ ${post.title.substring(0, 30)}...`)
        }
      } catch (e) {
        console.error(`  ✗ Failed: ${link.substring(0, 50)}`)
      }

      await this.page.waitForTimeout(2000)
    }

    return posts
  }

  private async scrapePost(url: string): Promise<XhsPost | null> {
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })
    await this.page.waitForTimeout(3000)

    const data = await this.page.evaluate(() => {
      const title = document.querySelector("[class*='title']")?.textContent?.trim() || ""
      const content = document.querySelector("[class*='content'], [class*='desc']")?.textContent?.trim() || ""
      const author = document.querySelector("[class*='author'] a, [class*='name']")?.textContent?.trim() || ""

      const allText = document.body?.innerText || ""
      const likesMatch = allText.match(/(\d+)\s*(?:赞|喜欢|点赞)/)
      const collectsMatch = allText.match(/(\d+)\s*(?:收藏|收)/)
      const commentsMatch = allText.match(/(\d+)\s*(?:评论|条)/)

      const images: string[] = []
      document.querySelectorAll("[class*='slide'] img, [class*='carousel'] img").forEach((img: any) => {
        const src = img.src || img.getAttribute("data-src")
        if (src && !images.includes(src)) images.push(src)
      })

      const dateMatch = allText.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
      const publishDate = dateMatch ? dateMatch[1] : ""

      return {
        title, content, author,
        likes: likesMatch ? parseInt(likesMatch[1]) : 0,
        collects: collectsMatch ? parseInt(collectsMatch[1]) : 0,
        comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
        images: images.slice(0, 5),
        publishDate,
      }
    })

    if (!data.title && !data.content) return null

    return {
      title: data.title,
      content: data.content.substring(0, 500),
      author: data.author,
      likes: data.likes,
      collects: data.collects,
      comments: data.comments,
      url,
      images: data.images,
      publishDate: data.publishDate,
    }
  }

  savePosts(posts: XhsPost[], filename: string) {
    const outputPath = path.join(OUTPUT_DIR, filename)
    writeFileSync(outputPath, JSON.stringify(posts, null, 2))
    console.log(`\nSaved ${posts.length} posts to ${outputPath}`)
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || "search"

  if (command === "login") {
    const scraper = new XiaohongshuScraper()
    await scraper.init(false)
    await scraper.login()
    await scraper.close()
    return
  }

  const keyword = args[0] || "鲜朗猫粮"
  const limit = parseInt(args[1]) || 10

  console.log("========================================")
  console.log("   Xiaohongshu Product Review Scraper")
  console.log("========================================\n")

  const scraper = new XiaohongshuScraper()

  try {
    await scraper.init(false)
    const posts = await scraper.searchPosts(keyword, limit)

    console.log(`\n=== Results: ${posts.length} posts ===\n`)
    posts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title}`)
      console.log(`   Author: ${p.author} | Likes: ${p.likes} | Collects: ${p.collects}`)
      console.log(`   Content: ${p.content.substring(0, 80)}...`)
      console.log("")
    })

    scraper.savePosts(posts, `xhs_${keyword}_posts.json`)
    console.log("Done!")
  } finally {
    await scraper.close()
  }
}

main()
