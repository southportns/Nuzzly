/**
 * Request validation and sanitization
 * Prevents SQL injection and XSS attacks
 * No external dependencies - pure validation logic
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult<T> {
  data: T | null
  errors: ValidationError[]
  isValid: boolean
}

/**
 * Sanitize search strings (prevent SQL injection)
 */
export function sanitizeSearchString(input: string): string {
  if (typeof input !== "string") return ""

  return (
    input
      .trim()
      // Remove SQL injection attempts
      .replace(/['";\\]/g, "") // Remove quotes and semicolons
      .replace(/--/g, "") // Remove SQL comments
      .replace(/\/\*/g, "") // Remove block comments
      .replace(/xp_/g, "") // Remove extended stored procedures
      .replace(/sp_/g, "") // Remove system stored procedures
      .slice(0, 100) // Limit length
  )
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate UUID v4
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate URL
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate ISO date string
 */
export function validateISODate(date: string): boolean {
  try {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime()) && d.toISOString().includes(date.slice(0, 10))
  } catch {
    return false
  }
}

/**
 * Validators for common fields
 */
export const Validators = {
  // String validators
  string: (value: unknown, { min = 0, max = 255 } = {}): [boolean, string] => {
    if (typeof value !== "string") return [false, "Must be a string"]
    if (value.length < min) return [false, `Minimum length is ${min}`]
    if (value.length > max) return [false, `Maximum length is ${max}`]
    return [true, ""]
  },

  // Number validators
  number: (value: unknown, { min = 0, max = Infinity, integer = false } = {}): [boolean, string] => {
    if (typeof value !== "number") return [false, "Must be a number"]
    if (integer && !Number.isInteger(value)) return [false, "Must be an integer"]
    if (value < min) return [false, `Must be at least ${min}`]
    if (value > max) return [false, `Must be at most ${max}`]
    return [true, ""]
  },

  // Search string validator
  search: (value: unknown, { maxLength = 100 } = {}): [boolean, string] => {
    if (typeof value !== "string") return [false, "Search must be a string"]
    if (value.trim().length === 0) return [false, "Search cannot be empty"]
    if (value.length > maxLength) return [false, `Search is too long (max ${maxLength})`]
    return [true, ""]
  },

  // Email validator
  email: (value: unknown): [boolean, string] => {
    if (typeof value !== "string") return [false, "Email must be a string"]
    if (!validateEmail(value)) return [false, "Invalid email format"]
    if (value.length > 255) return [false, "Email is too long"]
    return [true, ""]
  },

  // UUID validator
  uuid: (value: unknown, { allowNull = false } = {}): [boolean, string] => {
    if (value === null || value === undefined) {
      return allowNull ? [true, ""] : [false, "UUID is required"]
    }
    if (typeof value !== "string") return [false, "UUID must be a string"]
    if (!validateUUID(value)) return [false, "Invalid UUID format"]
    return [true, ""]
  },

  // Rating validator (1-5)
  rating: (value: unknown): [boolean, string] => {
    const [isNum, numErr] = Validators.number(value, { min: 1, max: 5, integer: true })
    return isNum ? [true, ""] : [false, numErr]
  },

  // Date validator
  date: (value: unknown): [boolean, string] => {
    if (typeof value !== "string") return [false, "Date must be a string"]
    if (!validateISODate(value)) return [false, "Invalid date format (use ISO 8601)"]
    return [true, ""]
  },

  // Boolean validator
  boolean: (value: unknown): [boolean, string] => {
    if (typeof value !== "boolean") return [false, "Must be a boolean"]
    return [true, ""]
  },

  // Enum validator
  enum: (value: unknown, allowedValues: any[]): [boolean, string] => {
    if (!allowedValues.includes(value)) {
      return [false, `Must be one of: ${allowedValues.join(", ")}`]
    }
    return [true, ""]
  },

  // Array validator
  array: (value: unknown, { minLength = 0, maxLength = 100 } = {}): [boolean, string] => {
    if (!Array.isArray(value)) return [false, "Must be an array"]
    if (value.length < minLength) return [false, `Minimum items: ${minLength}`]
    if (value.length > maxLength) return [false, `Maximum items: ${maxLength}`]
    return [true, ""]
  },
}

/**
 * Validate search query (with sanitization)
 */
export function validateSearchQuery(query: string): ValidationResult<string> {
  const [isValid, error] = Validators.search(query)
  if (!isValid) {
    return {
      data: null,
      errors: [{ field: "search", message: error }],
      isValid: false,
    }
  }

  const sanitized = sanitizeSearchString(query)
  return {
    data: sanitized,
    errors: [],
    isValid: true,
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit?: number, offset?: number): ValidationResult<{ limit: number; offset: number }> {
  const errors: ValidationError[] = []

  const finalLimit = limit ?? 50
  const finalOffset = offset ?? 0

  if (typeof finalLimit !== "number" || finalLimit < 1 || finalLimit > 1000) {
    errors.push({ field: "limit", message: "Limit must be between 1 and 1000" })
  }

  if (typeof finalOffset !== "number" || finalOffset < 0) {
    errors.push({ field: "offset", message: "Offset must be non-negative" })
  }

  return {
    data: errors.length === 0 ? { limit: finalLimit, offset: finalOffset } : null,
    errors,
    isValid: errors.length === 0,
  }
}

/**
 * Validate admin filter query
 */
export function validateAdminFilter(params: any): ValidationResult<{
  search?: string
  limit: number
  offset: number
  flagged?: boolean
}> {
  const errors: ValidationError[] = []
  const result: any = {}

  // Validate search
  if (params.search !== undefined) {
    if (typeof params.search !== "string") {
      errors.push({ field: "search", message: "Search must be a string" })
    } else if (params.search.length > 100) {
      errors.push({ field: "search", message: "Search is too long" })
    } else {
      result.search = sanitizeSearchString(params.search)
    }
  }

  // Validate limit
  const limitNum = typeof params.limit === "string" ? parseInt(params.limit, 10) : params.limit
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
    result.limit = 100
  } else {
    result.limit = limitNum
  }

  // Validate offset
  const offsetNum = typeof params.offset === "string" ? parseInt(params.offset, 10) : params.offset ?? 0
  if (isNaN(offsetNum) || offsetNum < 0) {
    result.offset = 0
  } else {
    result.offset = offsetNum
  }

  // Validate flagged boolean
  if (params.flagged !== undefined) {
    const [isValid] = Validators.boolean(params.flagged === "true" || params.flagged === true)
    if (isValid) {
      result.flagged = params.flagged === "true" || params.flagged === true
    }
  }

  return {
    data: errors.length === 0 ? result : null,
    errors,
    isValid: errors.length === 0,
  }
}

/**
 * Validate request context (user, admin status, etc)
 */
export interface RequestContext {
  userId?: string
  isAdmin?: boolean
  userRole?: "user" | "admin" | "system"
}

export function requireUserId(context: RequestContext): string | null {
  if (!context.userId) return null
  if (!validateUUID(context.userId)) return null
  return context.userId
}

export function requireAdmin(context: RequestContext): boolean {
  return context.isAdmin === true && context.userRole === "admin"
}

