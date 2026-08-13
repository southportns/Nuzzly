export interface FluentEmojiItem {
id: string
name: string
glyph: string
unicode: string
group: string
keywords: string[]
url: string
path: string
}

let emojiIndex: FluentEmojiItem[] | null = null
let loadPromise: Promise<FluentEmojiItem[]> | null = null

const indexByName = new Map<string, FluentEmojiItem>()
const indexByGlyph = new Map<string, FluentEmojiItem>()
const indexByUnicode = new Map<string, FluentEmojiItem>()

function buildIndexes(items: FluentEmojiItem[]) {
indexByName.clear()
indexByGlyph.clear()
indexByUnicode.clear()
for (const item of items) {
indexByName.set(item.name.toLowerCase(), item)
indexByGlyph.set(item.glyph, item)
indexByUnicode.set(item.unicode.toLowerCase(), item)
}
}

export async function loadEmojiIndex(): Promise<FluentEmojiItem[]> {
if (emojiIndex) return emojiIndex
if (loadPromise) return loadPromise

loadPromise = fetch("/fluent-emoji-index.json").then((res) => {
if (!res.ok) throw new Error(`failed to load emoji index: ${res.status}`)
return res.json()
}).then((data: FluentEmojiItem[]) => {
emojiIndex = data
buildIndexes(data)
return data
}).catch((err) => {
loadPromise = null
throw err
})

return loadPromise
}

function ensureLoaded(): FluentEmojiItem[] | null {
return emojiIndex
}

/** Find 3D emoji by CLDR name (e.g. "grinning face") */
export function getFluentEmoji(name: string): FluentEmojiItem | undefined {
return indexByName.get(name.toLowerCase())
}

/** Find 3D emoji by emoji glyph (e.g. "😀") */
export function getFluentEmojiByGlyph(glyph: string): FluentEmojiItem | undefined {
return indexByGlyph.get(glyph)
}

/** Find 3D emoji by Unicode codepoint (e.g. "1f600") */
export function getFluentEmojiByUnicode(unicode: string): FluentEmojiItem | undefined {
return indexByUnicode.get(unicode.toLowerCase())
}

/** Search emojis by keyword, returns matches (requires await loadEmojiIndex() first) */
export function searchFluentEmojis(keyword: string): FluentEmojiItem[] {
const q = keyword.toLowerCase().trim()
if (!q) return []
const index = ensureLoaded()
if (!index) return []
return index.filter((item) =>
item.name.toLowerCase().includes(q) ||
item.group.toLowerCase().includes(q) ||
item.keywords.some((k) => k.toLowerCase().includes(q)),)
}

/** 根据Name获取 3D PNG Maleopen URL(need to 先 await loadEmojiIndex()) */
export function getFluentEmojiUrl(name: string): string | undefined {
return getFluentEmoji(name)?.url
}

/** 匹配should呈现 for emoji Unicode chars符 */
export const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/gu
