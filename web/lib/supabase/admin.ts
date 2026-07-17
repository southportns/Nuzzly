import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Service-role client — bypasses RLS. Server-only.
// 顶部 import "server-only" 会在 client component import 时编译失败，
// 防止 SUPABASE_SERVICE_ROLE_KEY 被打包到 client bundle 泄露。
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
