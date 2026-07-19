import { supabase } from './supabase'

const GATEWAY_BASE = import.meta.env.VITE_API_BASE || ''

/**
 * 调用 /api/gateway/write 写入数据。
 * - 服务端会自动注入 profile_id（覆盖客户端值）
 * - 服务端会自动生成 idempotency_key（基于 type + payload SHA-256）
 * - 重复请求会返回 status: "duplicate"，需上层根据业务判断是否视为成功
 *
 * @param {string} type - DIRECT_WRITE_TYPES 或 typeToAggregateType 中的枚举
 * @param {object} payload - 写入字段（不要传 profile_id，由服务端注入）
 * @param {object} [metadata] - 可选 causation_id/decision_id 等
 * @returns {Promise<{success: boolean, intentId: string, eventId: string|null, status: 'accepted'|'duplicate'|'rejected', data: object|null}>}
 */
export async function writeGateway(type, payload, metadata) {
  const { data: session } = await supabase.auth.getSession()
  const accessToken = session?.session?.access_token
  if (!accessToken) {
    const err = new Error('未登录')
    err.code = 'UNAUTHENTICATED'
    throw err
  }

  const res = await fetch(`${GATEWAY_BASE}/api/gateway/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ type, payload, metadata }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `gateway ${type} failed: ${res.status}`)
    err.status = res.status
    err.code = res.status === 401 ? 'UNAUTHENTICATED'
          : res.status === 400 ? 'GATEWAY_REJECTED' : 'GATEWAY_ERROR'
    throw err
  }

  const data = await res.json()
  return data
}
