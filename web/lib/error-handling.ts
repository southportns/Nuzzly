/**
 * Unified error handling strategy
 * All async operations should use these patterns
 */

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiResult<T> {
  data: T | null
  error: ApiError | null
}

/**
 * Wrap async database operations with error handling
 */
export async function dbOperation<T>(
  fn: () => Promise<T>,
  context: string = "database operation"
): Promise<ApiResult<T>> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    console.error(`[${context}] Error:`, err)
    return {
      data: null,
      error: {
        code: "DB_ERROR",
        message: `Database operation failed: ${context}`,
        details: err instanceof Error ? { message: err.message } : {},
      },
    }
  }
}

/**
 * Wrap RPC calls with error handling and type safety
 */
export async function rpcCall<T>(
  client: any,
  fnName: string,
  params: Record<string, unknown> = {},
  context: string = fnName
): Promise<ApiResult<T>> {
  try {
    const { data, error } = await client.rpc(fnName, params)

    if (error) {
      console.error(`[${context}] RPC error:`, error)
      return {
        data: null,
        error: {
          code: "RPC_ERROR",
          message: error.message || "RPC call failed",
          details: error,
        },
      }
    }

    return { data: data as T, error: null }
  } catch (err) {
    console.error(`[${context}] Unexpected error:`, err)
    return {
      data: null,
      error: {
        code: "RPC_EXCEPTION",
        message: `Unexpected error in ${context}`,
        details: err instanceof Error ? { message: err.message } : {},
      },
    }
  }
}

/**
 * Wrap table operations (select, insert, update, delete)
 */
export async function tableOperation<T>(
  client: any,
  tableName: string,
  operation: (table: any) => Promise<{ data: T; error: any }>,
  context: string = tableName
): Promise<ApiResult<T>> {
  try {
    const { data, error } = await operation(client.from(tableName))

    if (error) {
      console.error(`[${context}] Table operation error:`, error)
      return {
        data: null,
        error: {
          code: "TABLE_ERROR",
          message: error.message || "Table operation failed",
          details: error,
        },
      }
    }

    return { data, error: null }
  } catch (err) {
    console.error(`[${context}] Unexpected error:`, err)
    return {
      data: null,
      error: {
        code: "TABLE_EXCEPTION",
        message: `Unexpected error in ${context}`,
        details: err instanceof Error ? { message: err.message } : {},
      },
    }
  }
}

/**
 * Normalize response format for API handlers
 */
export function apiResponse<T>(result: ApiResult<T>, statusCode: number = 200) {
  if (result.error) {
    return {
      ok: false,
      error: result.error,
      data: null,
      statusCode: statusCode === 200 ? 400 : statusCode,
    }
  }

  return {
    ok: true,
    data: result.data,
    error: null,
    statusCode: 200,
  }
}

/**
 * Handle validation errors
 */
export function validationError(field: string, message: string): ApiError {
  return {
    code: "VALIDATION_ERROR",
    message: `Invalid ${field}: ${message}`,
    details: { field },
  }
}

/**
 * Handle authorization errors
 */
export function authorizationError(resource: string): ApiError {
  return {
    code: "FORBIDDEN",
    message: `Unauthorized access to ${resource}`,
    details: { resource },
  }
}

/**
 * Handle not found errors
 */
export function notFoundError(resource: string, id: string): ApiError {
  return {
    code: "NOT_FOUND",
    message: `${resource} not found: ${id}`,
    details: { resource, id },
  }
}
