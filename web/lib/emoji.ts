import emojiIndex from "./fluent-emoji-index.json"

export type FluentEmojiItem = (typeof emojiIndex)[number]

const indexByName = new Map<string, FluentEmojiItem>()
const indexByGlyph = new Map<string, FluentEmojiItem>()
const indexByUnicode = new Map<string, FluentEmojiItem>()

for (const item of emojiIndex) {
  indexByName.set(item.name.toLowerCase(), item)
  indexByGlyph.set(item.glyph, item)
  indexByUnicode.set(item.unicode.toLowerCase(), item)
}

/** 根据 cldr 名称（如 "grinning face"）查找 3D emoji */
export function getFluentEmoji(name: string): FluentEmojiItem | undefined {
  return indexByName.get(name.toLowerCase())
}

/** 根据 emoji 字符（如 "😀"）查找 3D emoji */
export function getFluentEmojiByGlyph(glyph: string): FluentEmojiItem | undefined {
  return indexByGlyph.get(glyph)
}

/** 根据 unicode 码点（如 "1f600"）查找 3D emoji */
export function getFluentEmojiByUnicode(unicode: string): FluentEmojiItem | undefined {
  return indexByUnicode.get(unicode.toLowerCase())
}

/** 根据关键词搜索 emoji，返回匹配项 */
export function searchFluentEmojis(keyword: string): FluentEmojiItem[] {
  const q = keyword.toLowerCase().trim()
  if (!q) return []
  return emojiIndex.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}

/** 根据名称获取 3D PNG 的公开 URL */
export function getFluentEmojiUrl(name: string): string | undefined {
  return getFluentEmoji(name)?.url
}

/** 匹配应呈现为 emoji 的 Unicode 字符 */
export const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/gu
