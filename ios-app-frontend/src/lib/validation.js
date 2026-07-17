// 表单验证系统（与 web 端 lib/validation.ts 呼应）
// 设计目标：
//   1. 提供常用 validators（email/password/username/required/minLength/maxLength/petName/phone）
//   2. validateForm 批量校验返回 { valid, errors }
//   3. validateField 单字段校验（用于实时 blur/input 反馈）
//   4. 纯函数、无副作用、可在任意 composable / 组件使用

/**
 * @typedef {(value: unknown, allValues?: Record<string, unknown>) => true | string}
 *   返回 true 表示通过，返回 string 表示错误文案
 */

function isEmpty(v) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0)
}

function getLength(v) {
  return Array.isArray(v) ? v.length : String(v).length
}

export const required = (msg = '此项必填') => (v) => isEmpty(v) ? msg : true

export const email = (msg = '邮箱格式不正确') => (v) =>
  isEmpty(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) || msg

export const phone = (msg = '手机号格式不正确') => (v) =>
  isEmpty(v) || /^1[3-9]\d{9}$/.test(String(v)) || msg

export const password = (msg = '密码至少 6 位') => (v) =>
  isEmpty(v) || String(v).length >= 6 || msg

export const minLength = (n, msg) => (v) =>
  isEmpty(v) || getLength(v) >= n || msg || `至少 ${n} 个字符`

export const maxLength = (n, msg) => (v) =>
  isEmpty(v) || getLength(v) <= n || msg || `最多 ${n} 个字符`

export const username = (msg = '用户名 2-20 个字符') => (v) =>
  isEmpty(v) || /^[\w\u4e00-\u9fa5]{2,20}$/.test(String(v)) || msg

export const petName = (msg = '宠物名 1-20 个字符') => (v) =>
  isEmpty(v) ? msg : (String(v).length <= 20 ? true : msg)

export const range = (min, max, msg) => (v) => {
  if (isEmpty(v)) return true
  const n = Number(v)
  if (Number.isNaN(n)) return msg || '请输入数字'
  return n >= min && n <= max ? true : msg || `范围 ${min}-${max}`
}

export const custom = (predicate, msg = '校验失败') => (v) => predicate(v) ? true : msg

/**
 * 单字段校验
 * @param {Array<Function>} rules - validator 数组
 * @param {unknown} value
 * @param {Record<string, unknown>} [allValues] - 跨字段校验时传入完整表单
 * @returns {string | null} - null 表示通过，string 为错误文案
 */
export function validateField(rules, value, allValues) {
  if (!Array.isArray(rules) || rules.length === 0) return null
  for (const rule of rules) {
    const result = rule(value, allValues)
    if (result !== true) return result
  }
  return null
}

/**
 * 批量表单校验
 * @param {Record<string, Array<Function>>} ruleMap - 字段名 → validator 数组
 * @param {Record<string, unknown>} values - 字段名 → 值
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 *
 * @example
 * const { valid, errors } = validateForm({
 *   email: [required(), email()],
 *   password: [required(), password()]
 * }, { email: '', password: '123' })
 * // valid=false, errors={ email: '此项必填', password: '密码至少 8 位' }
 */
export function validateForm(ruleMap, values) {
  const errors = {}
  for (const [field, rules] of Object.entries(ruleMap)) {
    const err = validateField(rules, values[field], values)
    if (err) errors[field] = err
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
