import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Service-role client — bypasses RLS. Server-only.
// The top-level import "server-only" will cause a compile error when imported from a client component,
// preventing SUPABASE_SERVICE_ROLE_KEY from being bundled into the client bundle.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
