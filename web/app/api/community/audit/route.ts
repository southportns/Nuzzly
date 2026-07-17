// POST /api/community/audit — 内容安全审核（文本 + 图片）
// 对接阿里云/网易易盾第三方审核 API；本地词库兜底
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// 内置敏感词（与 iOS 端 content-filter.js 同步）
const BUILTIN_WORDS = [
  "颠覆国家", "分裂国家", "推翻政权", "反华", "反动",
  "色情", "裸体", "裸聊", "约炮", "招嫖", "卖淫",
  "恐怖袭击", "制造炸弹", "杀人", "自杀方法", "砍人",
  "加微信", "加VX", "加V", "私聊赚钱", "刷单", "兼职日结",
  "代开发票", "办证", "贷款秒批", "赌博网站",
  "转账汇款", "中奖通知", "账号冻结",
]

// 本地词库检测
function localWordCheck(text: string): string[] {
  const hits: string[] = []
  for (const word of BUILTIN_WORDS) {
    if (text.includes(word)) hits.push(word)
  }
  return hits
}

// 第三方文本审核（阿里云内容安全）
async function thirdPartyTextAudit(text: string): Promise<{ passed: boolean; reason?: string }> {
  // 生产环境：对接阿里云内容安全 / 网易易盾
  // 环境变量 ALIYUN_ACCESS_KEY / ALIYUN_SECRET_KEY 未配置时，降级为本地词库
  if (!process.env.ALIYUN_ACCESS_KEY || !process.env.ALIYUN_SECRET_KEY) {
    // 降级：仅本地词库
    const words = localWordCheck(text)
    if (words.length > 0) {
      return { passed: false, reason: `内容包含敏感词：${words.join("、")}` }
    }
    return { passed: true }
  }

  try {
    // 阿里云内容安全 API 调用
    // 文档：https://help.aliyun.com/document_detail/53427.html
    const response = await fetch("https://green.aliyuncs.com/green/text/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ACS ${process.env.ALIYUN_ACCESS_KEY}:${generateSignature()}`,
      },
      body: JSON.stringify({
        scenes: ["antispam"],
        tasks: [{ content: text }],
      }),
    })

    if (!response.ok) {
      console.warn("[community-audit] 阿里云 API 调用失败，降级为本地词库")
      const words = localWordCheck(text)
      if (words.length > 0) return { passed: false, reason: `内容包含敏感词` }
      return { passed: true }
    }

    const result = await response.json()
    const data = result?.data?.[0]
    if (data?.label === "spam" || data?.label === "politics" || data?.label === "abuse" || data?.label === "porn" || data?.label === "terrorism" || data?.label === "contraband") {
      return { passed: false, reason: `内容审核未通过：${data.label}` }
    }
    return { passed: true }
  } catch (err) {
    console.warn("[community-audit] 第三方审核异常，降级为本地词库:", err)
    const words = localWordCheck(text)
    if (words.length > 0) return { passed: false, reason: `内容包含敏感词` }
    return { passed: true }
  }
}

// 第三方图片审核
async function thirdPartyImageAudit(imageUrl: string): Promise<{ passed: boolean; reason?: string }> {
  // 环境变量未配置时，放行（后端兜底：人工审核 pending 状态的帖子）
  if (!process.env.ALIYUN_ACCESS_KEY || !process.env.ALIYUN_SECRET_KEY) {
    return { passed: true }
  }

  try {
    const response = await fetch("https://green.aliyuncs.com/green/image/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ACS ${process.env.ALIYUN_ACCESS_KEY}:${generateSignature()}`,
      },
      body: JSON.stringify({
        scenes: ["porn", "terrorism"],
        tasks: [{ url: imageUrl }],
      }),
    })

    if (!response.ok) return { passed: true }

    const result = await response.json()
    const data = result?.data?.[0]
    if (data?.label === "porn" || data?.label === "terrorism") {
      return { passed: false, reason: "图片审核未通过" }
    }
    return { passed: true }
  } catch {
    return { passed: true } // 降级放行
  }
}

// 简易签名生成（生产环境需使用阿里云 SDK）
function generateSignature(): string {
  // 此处为占位符，生产环境应使用 @alicloud/openapi-client SDK
  return "placeholder-signature"
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { content, imageUrl } = body

    // 至少提供一个
    if (!content && !imageUrl) {
      return NextResponse.json({ error: "content 或 imageUrl 必填" }, { status: 400 })
    }

    // 内容长度限制（防止超大文本耗尽第三方 API 配额 / DoS）
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

    // 文本审核
    if (content) {
      const result = await thirdPartyTextAudit(content)
      if (!result.passed) {
        // 记录审核日志到 user_behavior_log（不回显具体命中词，防止反向爬词库）
        const db = createAdminClient()
        await db.from("user_behavior_log").insert({
          profile_id: user.id,
          event_type: "community_post_rejected",
          context: { content_preview: content.slice(0, 100), reason: result.reason },
          severity: 1,
        })
        // 客户端只看到通用提示，不暴露具体命中的敏感词
        return NextResponse.json({ passed: false, reason: "内容审核未通过" })
      }
    }

    // 图片审核
    if (imageUrl) {
      const result = await thirdPartyImageAudit(imageUrl)
      if (!result.passed) {
        return NextResponse.json({ passed: false, reason: "图片审核未通过" })
      }
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
