<template>
  <div class="md-render" v-html="html"></div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: { type: String, default: '' }
})

// 配置 marked：关闭 mangle，开启换行转换，与 web 端 react-markdown 行为接近
marked.setOptions({
  breaks: true,
  gfm: true
})

// === 3D Fluent Emoji 加载 ===
// 与 web 端 rehype-fluent-emoji 行为对齐：把 emoji 字符替换为 3D PNG 图片
const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/gu
const emojiIndex = ref(null) // Map<glyph, item>
let indexLoading = false
let indexLoaded = false

async function loadEmojiIndex() {
  if (indexLoaded || indexLoading) return
  indexLoading = true
  try {
    const res = await fetch('/fluent-emoji-index.json')
    if (!res.ok) throw new Error(`emoji index ${res.status}`)
    const data = await res.json()
    const map = new Map()
    for (const item of data) map.set(item.glyph, item)
    emojiIndex.value = map
    indexLoaded = true
  } catch (e) {
    // 加载失败降级为系统 emoji 字体渲染（iOS Apple Color Emoji 本身也是 3D 风格）
    console.warn('[MarkdownRenderer] emoji index 加载失败，降级为系统字体', e)
    indexLoaded = true
  }
}

onMounted(() => { loadEmojiIndex() })

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function replaceEmojiInText(text) {
  if (!text) return ''
  // 未加载完时返回原始转义文本，由系统 emoji 字体兜底渲染
  if (!emojiIndex.value) return escapeHtml(text)
  const emojis = text.match(EMOJI_PRESENTATION_REGEX)
  if (!emojis || emojis.length === 0) return escapeHtml(text)
  const parts = text.split(EMOJI_PRESENTATION_REGEX)
  let out = ''
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) out += escapeHtml(parts[i])
    if (emojis[i]) {
      const item = emojiIndex.value.get(emojis[i])
      if (item) {
        out += `<img src="${encodeURI(item.url)}" alt="${escapeHtml(item.name)}" width="16" height="16" loading="lazy" class="md-emoji" />`
      } else {
        out += escapeHtml(emojis[i])
      }
    }
  }
  return out
}

// 用 renderer.text 拦截所有文本 token，替换 emoji 字符
marked.use({
  renderer: {
    text(token) {
      return replaceEmojiInText(token.text)
    }
  }
})

const html = computed(() => {
  // 依赖 emojiIndex.value 触发重渲染
  void emojiIndex.value
  if (!props.content) return ''
  try {
    return marked.parse(props.content)
  } catch {
    return props.content
  }
})
</script>

<style scoped>
/* 对齐 web 端 markdown-renderer.tsx 排版：橙红色作为强调色 */
.md-render { font-size: 14px; line-height: 1.7; color: #333333; word-break: break-word; }
.md-render :deep(h1) { font-size: 16px; font-weight: 700; color: #111111; margin: 16px 0 8px; line-height: 1.25; }
.md-render :deep(h2) { font-size: 15px; font-weight: 700; color: #111111; margin: 14px 0 8px; line-height: 1.25; }
.md-render :deep(h3) { font-size: 14px; font-weight: 600; color: #111111; margin: 12px 0 6px; line-height: 1.25; }
.md-render :deep(p) { margin: 0 0 10px; line-height: 1.7; }
.md-render :deep(p:last-child) { margin-bottom: 0; }
.md-render :deep(ul) { margin: 0 0 10px; padding-left: 18px; list-style: disc; }
.md-render :deep(ul) li::marker { color: #FF7A59; }
.md-render :deep(ol) { margin: 0 0 10px; padding-left: 18px; list-style: decimal; }
.md-render :deep(ol) li::marker { color: #6B6B6B; }
.md-render :deep(li) { margin: 4px 0; line-height: 1.65; }
.md-render :deep(strong) { font-weight: 600; color: #111111; }
.md-render :deep(em) { font-style: normal; font-weight: 500; color: #FF7A59; }
.md-render :deep(a) { color: #FF7A59; text-decoration: underline; }
.md-render :deep(blockquote) { border-left: 2px solid #FF7A59; padding: 2px 12px; margin: 8px 0; color: #6B6B6B; }
.md-render :deep(code) { background: #F0EFED; border-radius: 4px; padding: 1px 5px; font-size: 12px; color: #333333; font-family: monospace; }
.md-render :deep(pre) { background: #F0EFED; border-radius: 12px; padding: 12px; overflow-x: auto; margin: 8px 0; font-size: 12px; }
.md-render :deep(pre code) { background: transparent; padding: 0; }
.md-render :deep(hr) { border: none; border-top: 1px solid rgba(0,0,0,0.06); margin: 12px 0; }
.md-render :deep(img) { max-width: 100%; border-radius: 6px; }
/* Fluent Emoji 图片样式：与 web 端一致，inline-block + 文本底部对齐 */
.md-render :deep(.md-emoji) {
  display: inline-block;
  width: 16px;
  height: 16px;
  object-fit: contain;
  vertical-align: text-bottom;
  margin: 0 1px;
}
</style>
