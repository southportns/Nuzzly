import { updateSession } from "@/lib/supabase/middleware"
import { defaultLocale, locales, type Locale } from "@/i18n/config"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export default async function proxy(request: NextRequest) {
  // ── 1. Locale detection (cookie-based, no URL routing) ──
  const response = await updateSession(request)

  // If updateSession returned a redirect (auth guard), pass it through
  if (response instanceof NextResponse && response.status >= 300 && response.status < 400) {
    return response
  }

  // Set locale cookie if not present
  const localeCookie = request.cookies.get("locale")?.value
  if (!localeCookie || !locales.includes(localeCookie as Locale)) {
    // Detect from Accept-Language header
    const acceptLang = request.headers.get("accept-language") || ""
    const detectedLocale = detectLocale(acceptLang)
    if (response instanceof NextResponse) {
      response.cookies.set("locale", detectedLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
      })
    }
  }

  return response
}

function detectLocale(acceptLanguage: string): string {
  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, q = "1"] = lang.trim().split(";q=")
      return { code: code.toLowerCase().split("-")[0], q: parseFloat(q) }
    })
    .sort((a, b) => b.q - a.q)

  for (const { code } of languages) {
    if (code === "zh") return "zh"
    if (code === "en") return "en"
  }

  return defaultLocale
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, svg, etc.)
     *
     * This ensures the Supabase session refresh runs on every page,
     * so stale/invalid refresh tokens are cleaned up server-side.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map)).*)",
  ],
}
