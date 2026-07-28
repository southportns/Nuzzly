// POST /api/ai/ingredient-vision — 成分分析图片识别（多模态视觉理解，流式）
// 接收: { image: string (base64 data URL), note?: string, petId?: string }
// 流程: 鉴权 → (可选)查询宠物信息 → 构建 system prompt → 调用 Vision LLM 流式 API → SSE 推送
//
// Provider 通过环境变量 VISION_PROVIDER 切换:
//   - "glm"         (默认, 测试阶段, GLM-4V-Flash 免费)
//   - "volcengine"  (上线后切换, doubao-seed-1.6-vision)
// 切换只需改环境变量, 代码无需改动
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============== Provider 配置 ==============
type VisionProvider = "glm" | "volcengine"

interface ProviderConfig {
  baseURL: string
  model: string
  apiKeyEnv: string
  modelEnv: string
  defaultModel: string
  label: string
}

const PROVIDERS: Record<VisionProvider, ProviderConfig> = {
  // 智谱 GLM-4V-Flash（测试阶段，免费）
  glm: {
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: "",
    apiKeyEnv: "ZHIPU_API_KEY",
    modelEnv: "ZHIPU_VL_MODEL",
    defaultModel: "glm-4v-flash",
    label: "智谱 GLM-4V-Flash",
  },
  // 火山方舟 doubao-seed-1.6-vision（上线后）
  volcengine: {
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    model: "",
    apiKeyEnv: "VOLCENGINE_ARK_API_KEY",
    modelEnv: "VOLCENGINE_VL_MODEL",
    defaultModel: "doubao-seed-1.6-vision",
    label: "火山方舟 doubao-seed-1.6-vision",
  },
}

function getProvider(): VisionProvider {
  const raw = (process.env.VISION_PROVIDER || "glm").toLowerCase().trim()
  return raw === "volcengine" ? "volcengine" : "glm"
}

function resolveProviderConfig() {
  const key = getProvider()
  const cfg = { ...PROVIDERS[key] }
  cfg.model = process.env[cfg.modelEnv] || cfg.defaultModel
  return { key, cfg }
}

const BASE_SYSTEM_PROMPT = `你是"球球"🐱，毛球镇的超级可爱智能宠物顾问，现在专注于宠物食品成分分析。

## 你的任务
用户会上传猫粮/狗粮包装上的成分表图片，图片中通常包含"原料组成""添加剂组成""成分分析保证值"三部分。你需要识别其中的关键信息并给出结构化分析。

## 输出模板（必须严格按以下章节输出）

喵~ 球球来帮你分析这份成分表啦 🐾

### 1. 配方总览
用 2-3 句话概括：主要成分类别、蛋白来源质量、谷物/碳水情况、添加剂是否安全。

### 2. 主要原料分析
按原料在配料表中的真实顺序，分为以下 4 类列出（不要逐字罗列所有微量元素，按类别归纳）：

**动物蛋白来源**（配料表前 5 位中的肉类/肉粉/鱼粉等）：
- **成分名**：作用与评价（风险等级：**低/中/高**）

**谷物/碳水来源**（如碎米、小麦粉、玉米等，若没有则写"无明显谷物来源"）：
- **成分名**：作用与评价（风险等级）

**脂肪与油脂来源**（如鸡油、鱼油、牛油等）：
- **成分名**：作用与评价（风险等级）

**功能性添加剂**（如益生元、酵母、纤维素、牛磺酸等，可合并归纳，不要逐个列出维生素和矿物质）：
- **类别名**：作用与评价（风险等级）

### 3. 营养指标评价
根据图片中的"成分分析保证值"评价：
- 粗蛋白是否达标（猫粮≥30% 优质，≥25% 合格；狗粮≥25% 优质）
- 粗脂肪是否合适（猫 10-25%，狗 10-20%）
- 粗纤维、钙磷比等是否健康

### 4. 适合对象
- 适合：生命阶段、品种、特殊需求（如幼猫、成猫、老年猫、肠胃敏感猫咪等）
- 不太适合：哪些情况不建议选

### 5. 注意事项
仅列出真正需要警惕的成分或情况（最多 3 条），如无则写"未发现明显风险成分"。

## 严格规则（必须遵守）
1. **分组归纳**：维生素和矿物质统一合并成一条"维生素与矿物质预混料"，不要逐个列出（这是防止重复循环的关键）
2. **不重复**：每个成分只出现一次，绝不重复
3. **不编造**：识别不清的成分直接跳过，不要用"***"或"未知成分"占位
4. **简洁**：每个 bullet 不超过 30 字
5. **使用中文**：成分名优先用中文
6. **格式**：用 Markdown，加粗风险等级，开头加"喵~"或"汪~"，适当 emoji`

// 构建宠物上下文文本（用于注入 system prompt）
// 注意：所有字段都会进入 LLM 上下文，敏感信息需脱敏
function buildPetContext(pet: {
  name: string
  breed: string | null
  species: string
  stomach_health: string
  age_years: number | null
  weight_kg: number | null
  life_stage: string | null
  disease_history: string | null
}): string {
  const parts: string[] = [`姓名：${pet.name}`]

  // 种类映射为中文
  const speciesMap: Record<string, string> = {
    cat: "猫",
    dog: "狗",
  }
  parts.push(`种类：${speciesMap[pet.species] ?? pet.species}`)
  parts.push(`品种：${pet.breed ?? "未知"}`)

  if (pet.life_stage) {
    const lifeStageMap: Record<string, string> = {
      puppy: "幼犬",
      kitten: "幼猫",
      adult: "成年",
      senior: "老年",
    }
    parts.push(`生命阶段：${lifeStageMap[pet.life_stage] ?? pet.life_stage}`)
  }

  if (pet.age_years != null) {
    parts.push(`年龄：约 ${pet.age_years} 岁`)
  }

  if (pet.weight_kg != null) {
    parts.push(`体重：${pet.weight_kg} kg`)
  }

  // 肠胃状况
  const stomachMap: Record<string, string> = {
    sensitive: "敏感（需低敏配方、易消化蛋白）",
    normal: "正常",
    fragile: "脆弱（需特别护理）",
  }
  if (pet.stomach_health) {
    parts.push(`肠胃状况：${stomachMap[pet.stomach_health] ?? pet.stomach_health}`)
  }

  // 病史（截断防止 prompt 过长）
  if (pet.disease_history && pet.disease_history.trim()) {
    const history = pet.disease_history.trim().slice(0, 500)
    parts.push(`病史记录：${history}`)
  }

  return parts.join("；")
}

// 鉴权 helper（复用 chat/route.ts 的逻辑）
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

const MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8MB base64 字符串上限
const MAX_NOTE_LENGTH = 1000

export async function POST(request: Request) {
  try {
    const { image, note, petId } = (await request.json().catch(() => ({}))) as {
      image?: string
      note?: string
      petId?: string
    }

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "image 必填（base64 data URL）" }, { status: 400 })
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ error: "image 必须是 data URL 格式" }, { status: 400 })
    }

    if (image.length > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "图片过大，请压缩后上传" }, { status: 400 })
    }

    if (note && typeof note === "string" && note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: "补充说明过长" }, { status: 400 })
    }

    if (petId && typeof petId !== "string") {
      return NextResponse.json({ error: "petId 格式错误" }, { status: 400 })
    }

    // 鉴权
    const supabase = await createClient()
    const { user, error: userErr } = await getAuthUser(request, supabase)
    if (userErr || !user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 解析 provider 配置
    const { key, cfg } = resolveProviderConfig()
    const apiKey = process.env[cfg.apiKeyEnv]
    if (!apiKey) {
      console.error(`[ai/ingredient-vision] 环境变量 ${cfg.apiKeyEnv} 未配置 (provider=${key})`)
      return NextResponse.json(
        { error: `Vision 服务未配置（${cfg.label}）` },
        { status: 503 },
      )
    }

    // 查询宠物信息（如果传了 petId）
    // 用 service_role client 绕过 RLS, 因为已通过鉴权确保是用户自己的宠物
    let petContextText = ""
    if (petId) {
      const { data: petData, error: petErr } = await supabase
        .from("pets")
        .select("id,name,breed,species,stomach_health,age_years,weight_kg,life_stage,disease_history,profile_id")
        .eq("id", petId)
        .eq("is_active", true)
        .single()

      if (petErr || !petData) {
        return NextResponse.json({ error: "宠物信息查询失败" }, { status: 404 })
      }

      // 安全校验: 确保是当前登录用户自己的宠物
      if (petData.profile_id !== user.id) {
        return NextResponse.json({ error: "无权访问该宠物" }, { status: 403 })
      }

      petContextText = buildPetContext(petData)
    }

    // 根据是否有宠物信息, 定制 system prompt
    const systemPrompt = petContextText
      ? `${BASE_SYSTEM_PROMPT}\n\n## 当前分析目标宠物\n${petContextText}\n\n请基于这只宠物的具体情况（品种、年龄、肠胃状况、病史等）进行针对性分析，特别关注：\n- 是否适合该品种的营养需求\n- 是否会加重现有肠胃问题\n- 是否与病史有冲突（如过敏原）\n- 给出针对这只宠物的具体建议`
      : BASE_SYSTEM_PROMPT

    // 构建消息（OpenAI vision 格式，两家均兼容）
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: "text",
        text:
          note && note.trim()
            ? `请分析这张宠物食品成分表图片。用户补充说明：${note.trim()}`
            : "请分析这张宠物食品成分表图片，识别所有成分并给出风险评估。",
      },
      { type: "image_url", image_url: { url: image } },
    ]

    const apiMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]

    // 调用 Vision 流式 API（OpenAI 兼容格式）
    const response = await fetch(`${cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: apiMessages,
        stream: true,
        // 调参说明：GLM-4V-Flash 在成分表很长时容易陷入"重复循环"
        // - temperature 0.5 平衡稳定性与避免循环
        // - top_p 0.82 限制候选 token 范围，降低低质量 token 概率
        // - frequency_penalty 0.5 强力惩罚重复 token
        // - presence_penalty 0.4 鼓励引入新主题
        // 注意: 火山方舟 doubao-seed-1.6-vision 同样支持这些参数
        temperature: 0.5,
        top_p: 0.82,
        frequency_penalty: 0.5,
        presence_penalty: 0.4,
        // GLM-4V-Flash 上限 1024，火山方舟 doubao-seed-1.6-vision 上限远大于此
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[ai/ingredient-vision] ${cfg.label} error:`, err)
      return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 })
    }

    // 流式转发 SSE（与 chat/route.ts 逻辑一致）
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n").filter((l) => l.trim())
            for (const line of lines) {
              controller.enqueue(encoder.encode(`${line}\n`))
            }
          }
        } catch (e) {
          console.error(`[ai/ingredient-vision] ${cfg.label} stream error:`, e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    console.error("[ai/ingredient-vision POST] unhandled:", err)
    return NextResponse.json(
      { error: "服务异常，请稍后再试" },
      { status: 500 },
    )
  }
}
