// 内容脱敏工具:在发送到第三方审核 API 前剥离个人敏感信息
// 符合 project_memory 硬约束: strip phone numbers, ID cards, emails, URLs, UUIDs

const PHONE_RE = /(?:\+?86)?1[3-9]\d{9}/g
const ID_CARD_RE = /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const URL_RE = /https?:\/\/[^\s<>"']+/g
const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g
const QQ_RE = /\bqq[:：]?\s*\d{5,12}\b/gi
const WECHAT_RE = /\b(?:微信|wechat|wx|v信|vx|v[:：])[:：]?\s*[a-zA-Z0-9_-]{5,20}\b/gi

const PLACEHOLDER = "[REDACTED]"

/**
 * 脱敏文本内容,剥离手机号/身份证/邮箱/URL/UUID/QQ/微信号
 * 用于第三方审核 API 调用前的内容预处理
 */
export function desensitize(text: string): string {
  if (!text) return text
  return text
    .replace(ID_CARD_RE, PLACEHOLDER)
    .replace(PHONE_RE, PLACEHOLDER)
    .replace(EMAIL_RE, PLACEHOLDER)
    .replace(URL_RE, PLACEHOLDER)
    .replace(UUID_RE, PLACEHOLDER)
    .replace(QQ_RE, PLACEHOLDER)
    .replace(WECHAT_RE, PLACEHOLDER)
}

/**
 * 计算 SHA-256 哈希,用于审计日志的 request_payload_hash 字段
 * 与 PostgreSQL 中的 encode(digest(content, 'sha256'), 'hex') 一致
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}
