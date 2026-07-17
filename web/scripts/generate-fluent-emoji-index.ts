/**
 * 扫描 fluentui-emoji submodule，生成 web/lib/fluent-emoji-index.json
 * 用法: npx tsx scripts/generate-fluent-emoji-index.ts
 */
import * as fs from "node:fs"
import * as path from "node:path"

const ASSETS_DIR = path.resolve(__dirname, "../public/fluentui-emoji/assets")
const OUTPUT_FILE = path.resolve(__dirname, "../lib/fluent-emoji-index.json")
const IOS_OUTPUT_FILE = path.resolve(__dirname, "../../ios-app-frontend/src/lib/fluent-emoji-index.json")

interface FluentEmojiMetadata {
  cldr: string
  fromVersion: string
  glyph: string
  glyphAsUtfInEmoticons?: string[]
  group: string
  keywords: string[]
  mappedToEmoticons?: string[]
  tts: string
  unicode: string
}

interface FluentEmojiIndexItem {
  id: string
  name: string
  glyph: string
  unicode: string
  group: string
  keywords: string[]
  url: string
  path: string
}

function toSnakeCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function find3dFile(emojiDir: string, baseName: string): string | null {
  const dir3d = path.join(emojiDir, "3D")
  if (!fs.existsSync(dir3d)) return null

  const candidates = [
    `${baseName}_3d.png`,
    `${baseName}.png`,
  ]

  for (const candidate of candidates) {
    const fullPath = path.join(dir3d, candidate)
    if (fs.existsSync(fullPath)) return candidate
  }

  // 如果还是找不到，列出 3D 目录里的第一个 png
  const files = fs.readdirSync(dir3d).filter((f) => f.endsWith(".png"))
  return files.length > 0 ? files[0] : null
}

function generateIndex(): FluentEmojiIndexItem[] {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(`Assets directory not found: ${ASSETS_DIR}. Did you forget to init the submodule?`)
  }

  const index: FluentEmojiIndexItem[] = []
  const entries = fs.readdirSync(ASSETS_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const emojiDir = path.join(ASSETS_DIR, entry.name)
    const metadataPath = path.join(emojiDir, "metadata.json")
    if (!fs.existsSync(metadataPath)) continue

    try {
      const metadata: FluentEmojiMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
      const baseName = toSnakeCase(metadata.cldr)
      const fileName = find3dFile(emojiDir, baseName)
      if (!fileName) {
        console.warn(`[fluent-emoji] 3D asset not found: ${entry.name}`)
        continue
      }

      const relativePath = `/fluentui-emoji/assets/${entry.name}/3D/${fileName}`
      index.push({
        id: metadata.unicode,
        name: metadata.cldr,
        glyph: metadata.glyph,
        unicode: metadata.unicode,
        group: metadata.group,
        keywords: metadata.keywords ?? [],
        url: relativePath,
        path: relativePath,
      })
    } catch (err) {
      console.warn(`[fluent-emoji] failed to parse metadata for ${entry.name}:`, err)
    }
  }

  return index.sort((a, b) => a.name.localeCompare(b.name))
}

function main() {
  console.log("[fluent-emoji] generating index...")
  const index = generateIndex()

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2))
  console.log(`[fluent-emoji] generated ${index.length} entries -> ${path.relative(process.cwd(), OUTPUT_FILE)}`)

  // 同步输出一份给 iOS 前端使用
  const iosDir = path.dirname(IOS_OUTPUT_FILE)
  if (!fs.existsSync(iosDir)) {
    fs.mkdirSync(iosDir, { recursive: true })
  }
  fs.writeFileSync(IOS_OUTPUT_FILE, JSON.stringify(index, null, 2))
  console.log(`[fluent-emoji] synced ${index.length} entries -> ${path.relative(process.cwd(), IOS_OUTPUT_FILE)}`)
}

main()
