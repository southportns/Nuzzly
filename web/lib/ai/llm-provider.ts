// =============================================
// LLM Provider Abstraction Layer
// Supports: OpenAI (primary, Singapore market) / DeepSeek (fallback, China market)
// Switch via LLM_PROVIDER env var: "openai" | "deepseek"
// =============================================

export type LLMProvider = "openai" | "deepseek"

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_call_id?: string
  tool_calls?: any[]
}

export interface LLMStreamOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  tools?: any[]
}

export interface LLMProviderConfig {
  provider: LLMProvider
  baseURL: string
  apiKey: string
  model: string
}

export function getLLMConfig(): LLMProviderConfig {
  const provider = (process.env.LLM_PROVIDER || "openai") as LLMProvider

  if (provider === "deepseek") {
    // DeepSeek — works from China without VPN (fallback for China market)
    return {
      provider: "deepseek",
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      model: "deepseek-chat",
    }
  }

  // Default: OpenAI (primary for Singapore market, works globally)
  return {
    provider: "openai",
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o",
  }
}

/**
 * Call LLM chat completions API (non-streaming).
 * Works with both OpenAI and DeepSeek (both use OpenAI-compatible API format).
 */
export async function callLLM(
  messages: LLMMessage[],
  options?: LLMStreamOptions
): Promise<string> {
  const config = getLLMConfig()

  if (!config.apiKey) {
    throw new Error(`[llm-provider] Missing API key for provider: ${config.provider}`)
  }

  const body: Record<string, any> = {
    model: options?.model || config.model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 4096,
    stream: false,
  }

  if (options?.tools) {
    body.tools = options.tools
  }

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[llm-provider] ${config.provider} API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

/**
 * Call LLM chat completions API with full response (for tool calling).
 */
export async function callLLMWithTools(
  messages: LLMMessage[],
  options?: LLMStreamOptions
): Promise<{
  content: string | null
  tool_calls?: any[]
}> {
  const config = getLLMConfig()

  if (!config.apiKey) {
    throw new Error(`[llm-provider] Missing API key for provider: ${config.provider}`)
  }

  const body: Record<string, any> = {
    model: options?.model || config.model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 4096,
    stream: false,
  }

  if (options?.tools) {
    body.tools = options.tools
  }

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[llm-provider] ${config.provider} API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const message = data.choices[0]?.message
  return {
    content: message?.content || null,
    tool_calls: message?.tool_calls,
  }
}

/**
 * Create a streaming response from the LLM.
 * Returns a ReadableStream for SSE.
 */
export async function streamLLM(
  messages: LLMMessage[],
  options?: LLMStreamOptions
): Promise<ReadableStream<Uint8Array>> {
  const config = getLLMConfig()

  if (!config.apiKey) {
    throw new Error(`[llm-provider] Missing API key for provider: ${config.provider}`)
  }

  const body: Record<string, any> = {
    model: options?.model || config.model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 4096,
    stream: true,
  }

  if (options?.tools) {
    body.tools = options.tools
  }

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[llm-provider] ${config.provider} API error ${response.status}: ${errorText}`)
  }

  return response.body!
}
