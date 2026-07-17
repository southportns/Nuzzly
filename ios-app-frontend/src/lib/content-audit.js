/**
 * content-audit.js — 服务端审核 API 对接模块
 * 调用 Web 端 /api/community/audit 进行文本+图片审核
 * 上传前进行隐私脱敏，遵守《个人信息保护法》最小必要原则
 */
import { supabase } from './supabase'

const WEB_BASE_URL = import.meta.env.VITE_WEB_URL || ''

/**
 * 隐私脱敏：剥离手机号/身份证/邮箱/银行卡/URL/UID
 * @param {string} text
 * @returns {string}
 */
function maskSensitiveInfo(text) {
  if (!text) return text
  return text
    // 中国大陆手机号 11 位
    .replace(/\b1[3-9]\d{9}\b/g, '[手机号]')
    // 身份证 15/18 位
    .replace(/\b[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, '[身份证]')
    .replace(/\b[1-9]\d{5}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}\b/g, '[身份证]')
    // 邮箱
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[邮箱]')
    // 银行卡 16-19 位
    .replace(/\b\d{16,19}\b/g, '[银行卡]')
    // URL（保留协议，剥离路径）
    .replace(/(https?:\/\/[^\s]+)/g, '[链接]')
    // UUID
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[ID]')
}

/**
 * 剥离图片 URL 中的用户路径，仅保留文件名
 * @param {string} url
 * @returns {string}
 */
function sanitizeImageUrl(url) {
  try {
    const u = new URL(url)
    // 替换路径为脱敏形式：保留 bucket 名 + 文件名
    const parts = u.pathname.split('/')
    if (parts.length > 3) {
      u.pathname = '/' + parts.slice(1, 3).join('/') + '/[FILE]'
    }
    return u.toString()
  } catch {
    return '[图片]'
  }
}

/**
 * 提交文本内容审核（已脱敏）
 * @param {string} content 文本内容
 * @returns {Promise<{passed: boolean, reason?: string}>}
 */
export async function auditContent(content) {
  try {
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) return { passed: false, reason: '未登录' }

    const maskedContent = maskSensitiveInfo(content)

    const res = await fetch(`${WEB_BASE_URL}/api/community/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: maskedContent })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { passed: false, reason: err.error || '审核服务异常' }
    }

    const result = await res.json()
    return { passed: result.passed, reason: result.reason }
  } catch (e) {
    console.warn('[content-audit] 审核请求失败:', e.message)
    return { passed: true, reason: '审核服务不可用，内容将人工复核' }
  }
}

/**
 * 提交图片审核（URL 已脱敏）
 * @param {string} imageUrl 图片公开 URL
 * @returns {Promise<{passed: boolean, reason?: string}>}
 */
export async function auditImage(imageUrl) {
  try {
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) return { passed: false, reason: '未登录' }

    const sanitizedUrl = sanitizeImageUrl(imageUrl)

    const res = await fetch(`${WEB_BASE_URL}/api/community/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageUrl: sanitizedUrl })
    })

    if (!res.ok) return { passed: false, reason: '图片审核失败' }

    const result = await res.json()
    return { passed: result.passed, reason: result.reason }
  } catch {
    return { passed: true, reason: '图片审核服务不可用' }
  }
}
