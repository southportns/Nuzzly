// POST /api/community/audit — 内容安全审核(文本 + 图片)
// 对接阿里云内容安全 API;本地词库兜底;脱敏后发送;写入 third_party_audit_log
// 降级策略:第三方未配置或异常时,返回 pending(放行至待审核队列),不直接通过
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { desensitize, sha256Hex } from "@/lib/desensitize"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// 内置敏感词(与 iOS 端 content-filter.js 同步)
const BUILTIN_WORDS = [
  "颠覆国家", "分裂国家", "推翻政权", "反华", "反动",
  "色情", "裸体", "裸聊", "约炮", "招嫖", "卖淫",
  "恐怖袭击", "制造炸弹", "杀人", "自杀方法", "砍人",
  "加微信", "加VX", "加V", "私聊赚钱", "刷单", "兼职日结",
  "代开发票", "办证", "贷款秒批", "赌博网站",
  "转账汇款", "中奖通知", "账号冻结",
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
  /** 降级模式:本地词库未命中,但未真正过第三方审核,需要人工 pending */
  degraded: boolean
}

// 第三方文本审核(阿里云内容安全)
async function thirdPartyTextAudit(text: string): Promise<AuditResult> {
  // 环境变量未配置:降级为本地词库 + pending(不直接 passed)
  if (!process.env.ALIYUN_ACCESS_KEY || !process.env.ALIYUN_SECRET_KEY) {
    const words = localWordCheck(text)
    if (words.length > 0) {
      return { passed: false, label: "local_blocklist", provider: "local", degraded: false }
    }
    return { passed: true, provider: "local", degraded: true }
  }

  try {
    // 阿里云内容安全 API 调用
    // 文档:https://help.aliyun.com/document_detail/53427.html
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
      console.warn("[community-audit] 阿里云 API 调用失败,降级为本地词库:", response.status)
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
    console.warn("[community-audit] 第三方审核异常,降级为本地词库:", err)
    const words = localWordCheck(text)
    if (words.length > 0) {
      return { passed: false, label: "local_blocklist", provider: "local", degraded: false }
    }
    return { passed: true, provider: "local", degraded: true }
  }
}

// 第三方图片审核
async function thirdPartyImageAudit(imageUrl: string): Promise<AuditResult> {
  if (!process.env.ALIYUN_ACCESS_KEY || !process.env.ALIYUN_SECRET_KEY) {
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
  const signature = crypto.createHmac("sha1", accessKeySecret)
    .update(stringToSign)
    .digest("base64")
  return signature
}

// 鉴权
async function getAuthUser(request: Request, supabase: Awaited<ReturnType<typeof createClient>>) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null
  if (bearer) {
    const r = await supabase.auth.getUser(bearer)
    return { user: r.data?.user ?? null, error: r.error ?? null }
  }
  const r = await supabase.auth.getUser()
  return { user: r.data?.user ?? null, error: r.error ?? null }
}

// 从请求头获取客户端 IP
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
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { content, imageUrl } = body

    if (!content && !imageUrl) {
      return NextResponse.json({ error: "content 或 imageUrl 必填" }, { status: 400 })
    }

    const MAX_CONTENT_LENGTH = 2000
    if (content && typeof content === "string" && content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `内容超出长度限制（最多 ${MAX_CONTENT_LENGTH} 字）` },
        { status: 400 },
      )
    }
    if (imageUrl && typeof imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl 必须为字符串" }, { status: 400 })
    }

    const clientIp = getClientIp(request)
    const db = createAdminClient()

    // 文本审核
    if (content) {
      // 1. 脱敏后再发送给第三方
      const sanitizedContent = desensitize(content)
      // 2. 计算 hash(基于原始内容,与 RPC 内的 hash 一致)
      const payloadHash = await sha256Hex(content)
      // 3. 调用审核
      const result = await thirdPartyTextAudit(sanitizedContent)

      // 4. 写入 third_party_audit_log(使用 service_role,绕过 RLS)
      const { data: logRow, error: logErr } = await db
        .from("third_party_audit_log")
        .insert({
          profile_id: user.id,
          audit_type: "text",
          provider: result.provider,
          request_payload_hash: payloadHash,
          response_label: result.label ?? null,
          response_passed: result.passed,
        })
        .select("id")
        .single()

      if (logErr) {
        console.error("[community-audit] 写入审计日志失败:", logErr.message)
      }

      if (!result.passed) {
        // 同时记录行为日志
        await db.from("user_behavior_log").insert({
          profile_id: user.id,
          event_type: "community_post_rejected",
          context: { content_preview: content.slice(0, 100), reason: "审核未通过" },
          severity: 1,
        })
        return NextResponse.json({
          passed: false,
          reason: "内容审核未通过",
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

    // 图片审核
    if (imageUrl) {
      const result = await thirdPartyImageAudit(imageUrl)
      const payloadHash = await sha256Hex(imageUrl)

      const { data: logRow } = await db
        .from("third_party_audit_log")
        .insert({
          profile_id: user.id,
          audit_type: "image",
          provider: result.provider,
          request_payload_hash: payloadHash,
          response_label: result.label ?? null,
          response_passed: result.passed,
        })
        .select("id")
        .single()

      if (!result.passed) {
        return NextResponse.json({
          passed: false,
          reason: "图片审核未通过",
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
    return NextResponse.json(
      { error: "审核服务异常，请稍后再试" },
      { status: 500 },
    )
  }
}
