import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export async function api(path, options = {}) {
  const { data: { session } = {} } = await supabase.auth.getSession()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json.error || `请求失败 ${res.status}`)
  }
  return json
}

export { API_BASE }
