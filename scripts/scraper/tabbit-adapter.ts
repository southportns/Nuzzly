/**
 * Tabbit CDP 适配器 - 替代 Playwright
 * 提供与 Playwright 兼容的 API，底层使用 Tabbit Browser CDP
 *
 * 优势：
 * 1. 真实浏览器环境，反爬检测大幅降低
 * 2. 复用用户已登录的 Tabbit 浏览器
 * 3. 支持 AI 辅助数据提取
 * 4. Cookie/登录态自动复用
 */

import { createRequire } from "module"
const require = createRequire(import.meta.url)

const tabbitPath = "C:\\Users\\Galaxy\\tabbit-browser\\lib\\tabbit.js"
const { TabbitClient, TabbitBrowser } = require(tabbitPath)
import { readFileSync, writeFileSync, existsSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const COOKIES_DIR = path.join(__dirname, "cookies")

// ─── CDP 辅助函数 ────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

class CDPSessionWrapper {
  private wsUrl: string
  private ws: any = null
  private msgId = 0
  private handlers = new Map()

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl
  }

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
    await this.send("Runtime.enable")
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

  close() {
    if (this.ws) this.ws.close()
  }
}

// ─── Tabbit Page（兼容 Playwright Page API）──────────────

export class TabbitPage {
  private client: TabbitClient
  private session: CDPSessionWrapper | null = null
  private _url = ""

  constructor(client: TabbitClient) {
    this.client = client
  }

  get url() {
    return this._url
  }

  /** 连接到当前活跃页面 */
  async connect() {
    const targets = await this.client.getTargets()
    const page = targets.find((t: any) => t.type === "page")
    if (!page) throw new Error("No active page found")
    this._url = page.url
    this.session = new CDPSessionWrapper(page.webSocketDebuggerUrl)
    await this.session.connect()
    return this
  }

  /** 导航到 URL */
  async goto(url: string, options?: { waitUntil?: string; timeout?: number }) {
    if (!this.session) await this.connect()

    // 通过浏览器级 WebSocket 创建新标签页
    const version = await this.client.getVersion()
    const browserWs = new CDPSessionWrapper(version.webSocketDebuggerUrl)
    await browserWs.connect()

    await browserWs.send("Target.createTarget", { url })
    await sleep(2000)

    // 重新连接到新页面
    browserWs.close()
    await this.reconnectToPage(url)
  }

  /** 重新连接到匹配 URL 的页面 */
  private async reconnectToPage(urlPattern: string) {
    const targets = await this.client.getTargets()
    const page = targets.find(
      (t: any) => t.type === "page" && t.url.includes(urlPattern.split("?")[0])
    )
    if (!page) throw new Error(`Page not found: ${urlPattern}`)

    if (this.session) this.session.close()
    this.session = new CDPSessionWrapper(page.webSocketDebuggerUrl)
    await this.session.connect()
    this._url = page.url
  }

  /** 执行 JavaScript */
  async evaluate(fn: () => any): Promise<any> {
    if (!this.session) throw new Error("Not connected")
    const fnStr = fn.toString()
    const result = await this.session.send("Runtime.evaluate", {
      expression: `(${fnStr})()`,
      returnByValue: true,
      awaitPromise: true,
    })
    return result.result?.value
  }

  /** 执行字符串形式的 JS */
  async evaluateExpression(expr: string): Promise<any> {
    if (!this.session) throw new Error("Not connected")
    const result = await this.session.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    })
    return result.result?.value
  }

  /** 获取页面 HTML */
  async content(): Promise<string> {
    return this.evaluateExpression("document.documentElement.outerHTML")
  }

  /** 获取页面纯文本 */
  async textContent(): Promise<string> {
    return this.evaluateExpression("document.body?.innerText || ''")
  }

  /** 滚动页面 */
  async evaluateScroll(deltaY: number) {
    await this.evaluateExpression(`window.scrollBy(0, ${deltaY})`)
  }

  /** 等待 */
  async waitForTimeout(ms: number) {
    await sleep(ms)
  }

  /** 等待元素出现 */
  async waitForSelector(selector: string, timeout = 10000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const found = await this.evaluateExpression(
        `document.querySelector('${selector}') !== null`
      )
      if (found) return true
      await sleep(500)
    }
    return false
  }

  /** 输入文本 */
  async type(text: string) {
    if (!this.session) throw new Error("Not connected")
    await this.session.send("Input.insertText", { text })
  }

  /** 按键 */
  async press(key: string) {
    if (!this.session) throw new Error("Not connected")
    const keyMap: Record<string, number> = {
      Enter: 13, Tab: 9, Escape: 27, Backspace: 8,
    }
    const code = keyMap[key] || 0
    await this.session.send("Input.dispatchKeyEvent", {
      type: "keyDown", key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
    })
    await this.session.send("Input.dispatchKeyEvent", {
      type: "keyUp", key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
    })
  }

  /** 点击 */
  async click(selector: string) {
    const pos = await this.evaluateExpression(`(() => {
      const el = document.querySelector('${selector}')
      if (!el) return null
      const r = el.getBoundingClientRect()
      return JSON.stringify({ x: r.x + r.width/2, y: r.y + r.height/2 })
    })()`)
    if (!pos) throw new Error(`Element not found: ${selector}`)
    const { x, y } = JSON.parse(pos)
    if (!this.session) throw new Error("Not connected")
    await this.session.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
    await this.session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
  }

  /** 截图 */
  async screenshot(options?: { path?: string; fullPage?: boolean }) {
    if (!this.session) throw new Error("Not connected")
    const cap = new CaptureManager(this.session as any)
    return cap.screenshot({ format: "jpeg", quality: 70, outputPath: options?.path })
  }

  /** 获取所有 cookie */
  async cookies() {
    if (!this.session) throw new Error("Not connected")
    const result = await this.session.send("Network.getCookies", { urls: [this._url] })
    return result.cookies
  }

  /** 关闭 */
  async close() {
    if (this.session) this.session.close()
  }
}

// ─── Tabbit Browser（兼容 Playwright Browser API）────────

export class TabbitBrowserAdapter {
  private browser: TabbitBrowser
  private client: TabbitClient
  private pages: TabbitPage[] = []

  constructor() {
    this.browser = new TabbitBrowser({ port: 9222 })
    this.client = this.browser.client()
  }

  async init() {
    const running = await this.browser.isRunning()
    if (!running) {
      console.log("启动 Tabbit Browser...")
      await this.browser.launch()
    }
    console.log("Tabbit Browser 已连接")
  }

  async newPage(): Promise<TabbitPage> {
    const page = new TabbitPage(this.client)
    await page.connect()
    this.pages.push(page)
    return page
  }

  async close() {
    for (const page of this.pages) {
      await page.close()
    }
    await this.client.close()
  }

  /** 获取客户端（用于直接 CDP 操作） */
  getClient(): TabbitClient {
    return this.client
  }
}

// ─── 导出 ────────────────────────────────────────────────

export { TabbitClient, TabbitBrowser }
export type { TabbitPage as Page }
