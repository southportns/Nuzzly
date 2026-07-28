/**
 * Structured logging utility
 * Provides consistent log format across the application
 * Can be extended to integrate with Sentry, LogRocket, etc.
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
  requestId?: string
}

/** Format log entry as structured JSON */
function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry)
}

/** Core logging function */
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  }

  const formatted = formatLog(entry)

  switch (level) {
    case "debug":
      console.debug(formatted)
      break
    case "info":
      console.info(formatted)
      break
    case "warn":
      console.warn(formatted)
      break
    case "error":
      console.error(formatted)
      break
  }
}

/**
 * Structured logger instance
 *
 * @example
 * ```ts
 * import { logger } from "@/lib/logger"
 *
 * logger.info("User login", { userId: "123", ip: "192.168.1.1" })
 * logger.error("Database connection failed", { error: err.message, retryCount: 3 })
 * ```
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    log("debug", message, context)
  },

  info(message: string, context?: Record<string, unknown>) {
    log("info", message, context)
  },

  warn(message: string, context?: Record<string, unknown>) {
    log("warn", message, context)
  },

  error(message: string, context?: Record<string, unknown>) {
    log("error", message, context)
  },

  /**
   * Create a child logger with predefined context
   * Useful for module-specific logging
   */
  child(defaultContext: Record<string, unknown>) {
    return {
      debug(message: string, context?: Record<string, unknown>) {
        log("debug", message, { ...defaultContext, ...context })
      },
      info(message: string, context?: Record<string, unknown>) {
        log("info", message, { ...defaultContext, ...context })
      },
      warn(message: string, context?: Record<string, unknown>) {
        log("warn", message, { ...defaultContext, ...context })
      },
      error(message: string, context?: Record<string, unknown>) {
        log("error", message, { ...defaultContext, ...context })
      },
    } as typeof logger
  },
}
