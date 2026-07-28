// 可复用的 Markdown 渲染组件
// 抽自 ai-chat-new.tsx，保持样式一致
// 用于 AI 自由对话、成分分析等场景的 AI 输出渲染
"use client"

import ReactMarkdown from "react-markdown"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { rehypeFluentEmoji } from "@/lib/rehype-fluent-emoji"

// sanitize schema: 扩展 img 属性以支持 Fluent Emoji
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "width", "height", "loading", "className", "class"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["http", "https"],
    href: ["http", "https", "mailto", "tel"],
  },
}

// 自定义组件样式：与自由对话保持一致
const markdownComponents: import("react-markdown").Components = {
  h1: ({ children }) => (
    <h1 className="text-[16px] font-bold text-[#111111] mt-4 mb-2 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-bold text-[#111111] mt-3.5 mb-2 leading-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold text-[#111111] mt-3 mb-1.5 leading-tight">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2.5 last:mb-0 leading-[1.7]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2.5 pl-4 space-y-1 list-disc marker:text-[#FF7A59]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2.5 pl-4 space-y-1 list-decimal marker:text-[#6B6B6B]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.65]">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#111111]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="not-italic font-medium text-[#FF7A59]">{children}</em>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#FF7A59] underline">
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-[rgba(0,0,0,0.06)]" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#FF7A59] pl-3 py-0.5 my-2 text-[#6B6B6B]">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-[#F0EFED] rounded px-1 py-0.5 text-[12px] text-[#333333]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-[#F0EFED] rounded-xl p-3 overflow-x-auto text-[12px] my-2">{children}</pre>
  ),
  // 自定义 img：确保 rehypeFluentEmoji 替换的 emoji 图片正确显示
  img: ({ src, alt, width, height, className }) => {
    const rawClass = className as string | string[] | undefined
    const resolvedClass =
      typeof rawClass === "string"
        ? rawClass
        : Array.isArray(rawClass)
          ? rawClass.join(" ")
          : ""
    return (
      <img
        src={src}
        alt={alt ?? ""}
        width={width ?? 16}
        height={height ?? 16}
        loading="lazy"
        className={resolvedClass || "inline-block size-4 object-contain align-text-bottom mx-0.5"}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = "none"
        }}
      />
    )
  },
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={markdownComponents}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeFluentEmoji]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
