// 统一错误处理（与 web 端 lib/error-handling.ts 的 ApiError/ApiResult 模式呼应）
// 设计目标：
//   1. 将任意 err（Error / Supabase error / fetch error / 字符串）规范化为 ApiError
//   2. apiCall 包装 Promise 返回 { data, error }，避免页面层裸 try-catch
//   3. toastError 统一 Toast 错误提示
//   4. 完全向后兼容，不强制改造现有代码

import { Toast } from 'tdesign-mobile-vue'

export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  NETWORK: 'NETWORK',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
}

const CODE_FALLBACK_MSG = {
  INVALID_CREDENTIALS: '账号或密码错误',
  UNAUTHENTICATED: '请先登录',
  NETWORK: '网络异常，请稍后重试',
  NOT_FOUND: '资源不存在',
  VALIDATION: '输入有误',
  RATE_LIMIT: '操作过于频繁，请稍后再试',
  SERVER: '服务暂时不可用',
  UNKNOWN: '操作失败'
}

export function normalizeError(err, context) {
  if (err?.code && err?.message) {
    return { ...err, context: err.context || context }
  }

  if (err?.message) {
    const code = classifySupabaseError(err)
    return {
      code,
      message: err.message || CODE_FALLBACK_MSG[code],
      details: err.details || err.hint || err,
      context
    }
  }

  if (typeof err === 'string') {
    return { code: ERROR_CODES.UNKNOWN, message: err, context }
  }

  return {
    code: ERROR_CODES.UNKNOWN,
    message: err?.message || CODE_FALLBACK_MSG.UNKNOWN,
    details: err,
    context
  }
}

function classifySupabaseError(err) {
  const msg = (err.message || '').toLowerCase()

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || err.code === 'invalid_credentials') {
    return ERROR_CODES.INVALID_CREDENTIALS
  }
  if (msg.includes('jwt') || msg.includes('not authenticated') || err.code === 'PGRST301') {
    return ERROR_CODES.UNAUTHENTICATED
  }
  if (err.code === '429' || err.status === 429) {
    return ERROR_CODES.RATE_LIMIT
  }
  if (err.code === 'PGRST116' || err.code === '22P02' || err.status === 404) {
    return ERROR_CODES.NOT_FOUND
  }
  if ((err.code && err.code.startsWith('23')) || msg.includes('check constraint') || msg.includes('not-null')) {
    return ERROR_CODES.VALIDATION
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return ERROR_CODES.NETWORK
  }
  return ERROR_CODES.UNKNOWN
}

/**
 * Promise 包装器：返回 { data, error }，永不抛出
 * @template T
 * @param {() => Promise<T>} fn
 * @param {string} [context]
 * @returns {Promise<{ data: T | null, error: (ApiError | null) }>}
 *
 * @example
 * const { data, error } = await apiCall(() => fetchProducts(), 'fetchProducts')
 * if (error) { toastError(error); return }
 */
export async function apiCall(fn, context) {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: normalizeError(err, context) }
  }
}

/**
 * 统一 Toast 错误提示
 * @param {ApiError} error - normalizeError / apiCall 返回的 error
 * @param {string} [fallback] - 当 error 为空时的兜底文案
 */
export function toastError(error, fallback) {
  const msg = (error?.code && CODE_FALLBACK_MSG[error.code]) || error?.message || fallback || CODE_FALLBACK_MSG.UNKNOWN
  Toast({ theme: 'error', message: msg })
}

/**
 * 判断错误是否可重试（网络/服务/限流）
 */
export function isRetryable(error) {
  if (!error) return false
  return [ERROR_CODES.NETWORK, ERROR_CODES.SERVER, ERROR_CODES.RATE_LIMIT].includes(error.code)
}
