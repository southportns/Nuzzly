import emojiIndex from './fluent-emoji-index.json'

const indexByName = new Map()
const indexByGlyph = new Map()
const indexByUnicode = new Map()

for (const item of emojiIndex) {
  indexByName.set(item.name.toLowerCase(), item)
  indexByGlyph.set(item.glyph, item)
  indexByUnicode.set(item.unicode.toLowerCase(), item)
}

/** 根据 cldr 名称查找 emoji */
export function getFluentEmoji(name) {
  return indexByName.get(name.toLowerCase())
}

/** 根据 emoji 字符查找 */
export function getFluentEmojiByGlyph(glyph) {
  return indexByGlyph.get(glyph)
}

/** 根据 unicode 查找 */
export function getFluentEmojiByUnicode(unicode) {
  return indexByUnicode.get(unicode.toLowerCase())
}

/** 关键词搜索 */
export function searchFluentEmojis(keyword) {
  const q = keyword.toLowerCase().trim()
  if (!q) return []
  return emojiIndex.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}

/** 获取 3D PNG 的公开 URL。
 *  iOS 端默认走 GitHub raw，避免依赖 web 目录结构；
 *  后续若把资源复制到 public/fluentui-emoji，可改为本地路径。
 */
export function getFluentEmojiUrl(name) {
  const item = getFluentEmoji(name)
  if (!item) return undefined
  const fileName = item.url.split('/').pop()
  return `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/${item.name}/3D/${fileName}`
}

/** 匹配 emoji 呈现字符 */
export const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/gu

/** 将字符串中的 emoji 字符替换为 3D Fluent Emoji 图片标签 */
export function renderEmojiText(text, { size = 16, context = 'ios' } = {}) {
  if (!text) return ''
  return text.replace(EMOJI_PRESENTATION_REGEX, (match) => {
    const item = getFluentEmojiByGlyph(match)
    if (!item) return match
    const url = getFluentEmojiUrl(item.name)
    return `<img src="${url}" alt="${item.name}" width="${size}" height="${size}" class="inline-emoji" data-emoji-name="${item.name}" data-context="${context}" />`
  })
}
