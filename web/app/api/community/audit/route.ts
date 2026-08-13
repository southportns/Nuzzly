// POST /api/community/audit — 容SecurityReview(文本 + Images)
// for 接阿里云 容Security API;本地词库兜底;脱敏 after Send;写 third_party_audit_log
// DowngradeStrategy:第三方notConfiguration or Abnormal时,return pending(放行至Pending Review队列),not 直接通past
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { desensitize, sha256Hex } from "@/lib/desensitize"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// 置Sensitive词(and iOS 端 content-filter.js 同步)
const BUILTIN_WORDS = [
"", "", "", "", "",
"", "", "", "", "", "",
"", "", "", "", "",
"", "VX", "V", "", "", "",
"open ", "", " ", "",
" ", " Notifications", "Account",
]

function localWordCheck(text: string): string[] {
const hits: string[] = []
for (const word of BUILTIN_WORDS) {
if (text.includes(word)) hits.push(word)
}
return hits
}

interface AuditResult {
passed: boolean
label?: string
provider: string
/** Downgrade模式:本地词库not命,但nottrue正past 第三方Review,need to 人工 pending */
degraded: boolean
}

// 第三方文本Review(阿里云 容Security)
async function thirdPartyTextAudit(text: string): Promise<AuditResult> {
// 环境变量notConfiguration:Downgrade for 本地词库 + pending(not 直接 passed)
if (!process.env.ALIYUN_ACCESS_KEY ||!process.env.ALIYUN_SECRET_KEY) {
const words = localWordCheck(text)
if (words.length > 0) {
return { passed: false, label: "local_blocklist", provider: "local", degraded: false }
}
return { passed: true, provider: "local", degraded: true }
}

try {
// 阿里云 容Security API 调use
// Documents:https://help.aliyun.com/document_detail/53427.html
const body = JSON.stringify({
scenes: ["antispam"],
tasks: [{ content: text }],
})
const signature = await generateAliyunSignature("POST", "/green/text/scan", body)

const response = await fetch("https://green.cn-shanghai.aliyuncs.com/green/text/scan", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `acs ${process.env.ALIYUN_ACCESS_KEY}:${signature}`,
"X-acs-action": "TextScan",
"X-acs-version": "2022-03-02",
},
body,
})

if (!response.ok) {
console.warn("[community-audit] API use failed,Downgrade for:", response.status)
const words = localWordCheck(text)
if (words.length > 0) {
return { passed: false, label: "local_blocklist", provider: "local", degraded: false }
}
return { passed: true, provider: "local", degraded: true }
}

const result = await response.json()
const data = result?.data?.[0]
const blockedLabels = ["spam", "politics", "abuse", "porn", "terrorism", "contraband"]
if (data?.label && blockedLabels.includes(data.label)) {
return { passed: false, label: data.label, provider: "aliyun", degraded: false }
}
return { passed: true, label: data?.label, provider: "aliyun", degraded: false }
} catch (err) {
console.warn("[community-audit] ReviewAbnormal,Downgrade for:", err)
const words = localWordCheck(text)
if (words.length > 0) {
return { passed: false, label: "local_blocklist", provider: "local", degraded: false }
}
return { passed: true, provider: "local", degraded: true }
}
}

// 第三方ImagesReview
async function thirdPartyImageAudit(imageUrl: string): Promise<AuditResult> {
if (!process.env.ALIYUN_ACCESS_KEY ||!process.env.ALIYUN_SECRET_KEY) {
return { passed: true, provider: "local", degraded: true }
}

try {
const body = JSON.stringify({
scenes: ["porn", "terrorism"],
tasks: [{ url: imageUrl }],
})
const signature = await generateAliyunSignature("POST", "/green/image/scan", body)

const response = await fetch("https://green.cn-shanghai.aliyuncs.com/green/image/scan", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `acs ${process.env.ALIYUN_ACCESS_KEY}:${signature}`,
"X-acs-action": "ImageScan",
"X-acs-version": "2022-03-02",
},
body,
})

if (!response.ok) return { passed: true, provider: "local", degraded: true }

const result = await response.json()
const data = result?.data?.[0]
if (data?.label === "porn" || data?.label === "terrorism") {
return { passed: false, label: data.label, provider: "aliyun", degraded: false }
}
return { passed: true, label: data?.label, provider: "aliyun", degraded: false }
} catch {
return { passed: true, provider: "local", degraded: true }
}
}

// 阿里云 ROA 风格签名(HMAC-SHA1 + Base64)
async function generateAliyunSignature(method: string, resource: string, body: string): Promise<string> {
const crypto = await import("node:crypto")
const accessKeySecret = process.env.ALIYUN_SECRET_KEY!
const contentType = "application/json"
const date = new Date().toUTCString()
const md5 = crypto.createHash("md5").update(body).digest("base64")

const stringToSign = `${method}\n${contentType}\n${md5}\n${date}\n${resource}`
const signature = crypto.createHmac("sha1", accessKeySecret).update(stringToSign).digest("base64")
return signature
}

// 鉴权
async function getAuthUser(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
const auth = request.headers.get("authorization") || request.headers.get("Authorization")
const bearer = auth?.toLowerCase().startsWith("bearer ")? auth.slice(7).trim(): null
if (bearer) {
const r = await supabase.auth.getUser(bearer)
return { user: r.data?.user?? null, error: r.error?? null }
}
const r = await supabase.auth.getUser()
return { user: r.data?.user?? null, error: r.error?? null }
}

// from please求头获取客户端 IP
function getClientIp(request: Request): string | null {
const xff = request.headers.get("x-forwarded-for")
if (xff) {
const ip = xff.split(",")[0].trim()
if (ip) return ip
}
return request.headers.get("x-real-ip") || null
}

export async function POST(request: Request) {
try {
const supabase = await createClient()
const { user, error: userErr } = await getAuthUser(request, supabase)
if (userErr ||!user) {
return NextResponse.json({ error: "notSign In" }, { status: 401 })
}

const body = await request.json()
const { content, imageUrl } = body

if (!content &&!imageUrl) {
return NextResponse.json({ error: "content or imageUrl Required" }, { status: 400 })
}

const MAX_CONTENT_LENGTH = 2000
if (content && typeof content === "string" && content.length > MAX_CONTENT_LENGTH) {
return NextResponse.json({ error: ` Exceededlong Limit(max ${MAX_CONTENT_LENGTH} chars)` },
{ status: 400 },)
}
if (imageUrl && typeof imageUrl!== "string") {
return NextResponse.json({ error: "imageUrl must be chars" }, { status: 400 })
}

const clientIp = getClientIp(request)
const db = createAdminClient()

// 文本Review
if (content) {
// 1. 脱敏 after again Sendto 第三方
const sanitizedContent = desensitize(content)
// 2. 计算 hash(based on on原始 容, and RPC hash a致)
const payloadHash = await sha256Hex(content)
// 3. 调use Review
const result = await thirdPartyTextAudit(sanitizedContent)

// 4. 写 third_party_audit_log(used service_role,绕past RLS)
const { data: logRow, error: logErr } = await db.from("third_party_audit_log").insert({
profile_id: user.id,
audit_type: "text",
provider: result.provider,
request_payload_hash: payloadHash,
response_label: result.label?? null,
response_passed: result.passed,
}).select("id").single()

if (logErr) {
console.error("[community-audit] Logsfailed:", logErr.message)
}

if (!result.passed) {
// 同时RecordBehaviorLogs
await db.from("user_behavior_log").insert({
profile_id: user.id,
event_type: "community_post_rejected",
context: { content_preview: content.slice(0, 100), reason: "Reviewnotpast " },
severity: 1,
})
return NextResponse.json({
passed: false,
reason: " Reviewnotpast ",
audit_token: logRow?.id,
client_ip: clientIp,
})
}

return NextResponse.json({
passed: true,
audit_token: logRow?.id,
degraded: result.degraded,
client_ip: clientIp,
})
}

// ImagesReview
if (imageUrl) {
const result = await thirdPartyImageAudit(imageUrl)
const payloadHash = await sha256Hex(imageUrl)

const { data: logRow } = await db.from("third_party_audit_log").insert({
profile_id: user.id,
audit_type: "image",
provider: result.provider,
request_payload_hash: payloadHash,
response_label: result.label?? null,
response_passed: result.passed,
}).select("id").single()

if (!result.passed) {
return NextResponse.json({
passed: false,
reason: "ImagesReviewnotpast ",
audit_token: logRow?.id,
client_ip: clientIp,
})
}

return NextResponse.json({
passed: true,
audit_token: logRow?.id,
degraded: result.degraded,
client_ip: clientIp,
})
}

return NextResponse.json({ passed: true })
} catch (err) {
console.error("[community-audit] error:", err)
return NextResponse.json({ error: "ReviewAbnormal,please try again later" },
{ status: 500 },)
}
}
