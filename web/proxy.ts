import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pets/:path*",
    "/ai/:path*",
    "/admin/:path*",
    "/products/:path*",
    "/login",
    "/signup",
  ],
}
