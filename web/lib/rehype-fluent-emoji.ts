import { getFluentEmojiByGlyph } from "./emoji"

const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/gu

interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function transformTextNodes(node: HastNode): HastNode | HastNode[] {
  if (node.type === "text" && node.value) {
    const text = node.value
    const emojis = text.match(EMOJI_PRESENTATION_REGEX)
    if (!emojis || emojis.length === 0) return node

    const parts = text.split(EMOJI_PRESENTATION_REGEX)
    const newNodes: HastNode[] = []

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        newNodes.push({ type: "text", value: parts[i] })
      }
      if (emojis[i]) {
        const emoji = getFluentEmojiByGlyph(emojis[i])
        if (emoji) {
          newNodes.push({
            type: "element",
            tagName: "img",
            properties: {
              src: encodeURI(emoji.url),
              alt: emoji.name,
              width: 16,
              height: 16,
              loading: "lazy",
              className: ["inline-block", "shrink-0", "object-contain", "align-text-bottom", "mx-0.5"],
            },
            children: [],
          })
        } else {
          newNodes.push({ type: "text", value: emojis[i] })
        }
      }
    }

    return newNodes
  }

  if (node.children && node.children.length > 0) {
    const newChildren: HastNode[] = []
    for (const child of node.children) {
      const transformed = transformTextNodes(child)
      if (Array.isArray(transformed)) {
        newChildren.push(...transformed)
      } else {
        newChildren.push(transformed)
      }
    }
    node.children = newChildren
  }

  return node
}

/** rehype 插件：把 HAST 文本节点中的 emoji 字符替换为 3D Fluent Emoji 图片 */
export function rehypeFluentEmoji() {
  console.log("[rehypeFluentEmoji] factory called")
  return (tree: HastNode) => {
    console.log("[rehypeFluentEmoji] running, tree type:", tree.type, "children:", tree.children?.length)
    transformTextNodes(tree)
  }
}
