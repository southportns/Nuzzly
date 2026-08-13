// Content desensitization utility: strips profile sensitive info before sending to third-party audit APIs
// Compliance requirement: strip phone numbers, ID cards, emails, URLs, UUIDs

const PHONE_RE = /(?:\+?86)?1[3-9]\d{9}/g
const ID_CARD_RE = /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const URL_RE = /https?:\/\/[^\s<>"']+/g
const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g
const QQ_RE = /\bqq[::]?\s*\d{5,12}\b/gi
const WECHAT_RE = /\b(?:|wechat|wx|v|vx|v[::])[::]?\s*[a-zA-Z0-9_-]{5,20}\b/gi

const PLACEHOLDER = "[REDACTED]"

/**
* Desensitize text content: strips phone numbers / ID cards / emails / URLs / UUIDs / QQ / WeChat IDs
* Used for content preprocessing before third-party audit API calls
*/
export function desensitize(text: string): string {
if (!text) return text
return text.replace(ID_CARD_RE, PLACEHOLDER).replace(PHONE_RE, PLACEHOLDER).replace(EMAIL_RE, PLACEHOLDER).replace(URL_RE, PLACEHOLDER).replace(UUID_RE, PLACEHOLDER).replace(QQ_RE, PLACEHOLDER).replace(WECHAT_RE, PLACEHOLDER)
}

/**
* Compute SHA-256 hash, used for the request_payload_hash field in audit logs
* Consistent with PostgreSQL's encode(digest(content,'sha256'),'hex')
*/
export async function sha256Hex(text: string): Promise<string> {
const encoder = new TextEncoder()
const data = encoder.encode(text)
const hashBuffer = await crypto.subtle.digest("SHA-256", data)
return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")
}
