/**
 * Type-safe environment variable access
 * Validates required variables at startup time
 */

function getEnvVar(key: string, required = true): string {
 const value = process.env[key]
 if (!value && required) {
 throw new Error(`Missing required environment variable: ${key}`)
 }
 return value!
}

export const env = {
 // Supabase
 NEXT_PUBLIC_SUPABASE_URL: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
 NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
 SUPABASE_SERVICE_ROLE_KEY: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", false),

 // Upstash Redis (optional)
 UPSTASH_REDIS_REST_URL: getEnvVar("UPSTASH_REDIS_REST_URL", false),
 UPSTASH_REDIS_REST_TOKEN: getEnvVar("UPSTASH_REDIS_REST_TOKEN", false),

 // App
 NEXT_PUBLIC_APP_URL: getEnvVar("NEXT_PUBLIC_APP_URL", false),
 NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME?? "Nuzzly Town",
}
