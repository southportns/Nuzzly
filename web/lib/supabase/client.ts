import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── Singleton browser client ────────────────────────────────────────────────
// Creating a new Supabase client on every call causes:
//   1. New auth session initialization (triggers getToken / session refresh)
//   2. New HTTP connection pool
//   3. Potential auth token race conditions when multiple clients exist
// By caching a single instance we avoid all of these issues.
let browserClient: SupabaseClient<Database> | null = null

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserClient
}
