import { supabase } from './supabase'

// 开发环境走 Vite proxy（相对路径 /api → localhost:3000），避免 CORS
// 生产环境通过 VITE_API_BASE_URL 指定后端地址
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function buildHeaders() {
  const { data: { session } = {} } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
  }
}

/**
 * 检测 LLM 输出循环：当末尾 80 字符内同一 token 连续出现 8+ 次，
 * 或 5-14 字符片段连续重复 5+ 次时，判定为循环
 * 与 web 端 ingredient-analysis.tsx 逻辑一致
 */
function detectLoop(summary) {
  if (!summary || summary.length <= 80) return false
  const tail = summary.slice(-80)
  const tokens = tail.split(/[,，;；、。\. ]/).filter((t) => t.trim().length > 0)
  if (tokens.length >= 8) {
    const lastToken = tokens[tokens.length - 1]
    let repeatCount = 0
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i] === lastToken) repeatCount++
      else break
    }
    if (repeatCount >= 8) return true
  }
  for (let fragLen = 5; fragLen <= 14; fragLen++) {
    const frag = tail.slice(-fragLen)
    if (frag.trim().length < fragLen) continue
    let count = 0
    let pos = 0
    while ((pos = tail.indexOf(frag, pos)) !== -1) {
      count++
      pos += Math.max(1, fragLen - 1)
    }
    if (count >= 5) return true
  }
  return false
}

/**
 * SSE 流式 POST 请求
 * @param {string} path API 路径
 * @param {object} body 请求体
 * @param {object} opts { onDelta, onDone, onError }
 * @param {boolean} [opts.loopGuard=false] 是否启用循环检测
 */
export async function ssePost(path, body, { onDelta, onDone, onError, loopGuard = false } = {}) {
  const headers = await buildHeaders()

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
  } catch (e) {
    onError?.(e)
    return
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}))
    onError?.(new Error(errJson.error || `请求失败 ${res.status}`))
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    onError?.(new Error('流式响应不可用'))
    return
  }

  const decoder = new TextDecoder()
  let full = ''
  let loopDetected = false

  try {
    while (!loopDetected) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '').trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const text = parsed.choices?.[0]?.delta?.content ?? ''
          if (text) {
            full += text
            onDelta?.(text, full)
            if (loopGuard && detectLoop(full)) {
              loopDetected = true
              console.warn('[sse] 检测到输出循环，主动截断')
              break
            }
          }
        } catch {
          // 解析失败忽略，避免中断流
        }
      }
    }
    if (loopDetected) {
      try { await reader.cancel() } catch {}
      full += '\n\n> ⚠️ AI 输出出现循环，已自动截断。可尝试重新分析或调整图片清晰度。'
    }
    onDone?.(full)
  } catch (e) {
    onError?.(e)
  }
}
