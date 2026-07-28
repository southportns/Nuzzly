import { supabase } from './supabase'

// 开发环境走 Vite proxy（相对路径 /api → localhost:3000），避免 CORS
// 生产环境通过 VITE_API_BASE_URL 指定后端地址
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function api(path, options = {}) {
  const { data: { session } = {} } = await supabase.auth.getSession()
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {}),
    ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
  }

  // 15s 超时，防止请求无限挂起导致 UI 卡死
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') throw new Error('请求超时，请稍后重试')
    throw e
  }
  clearTimeout(timeoutId)

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json.error || `请求失败 ${res.status}`)
  }
  return json
}

export { API_BASE }
