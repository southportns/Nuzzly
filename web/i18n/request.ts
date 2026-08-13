// =============================================
// next-intl Request Configuration
// Server-side: reads locale from cookie, loads messages
// =============================================

import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, type Locale } from "./config";

import en from "../messages/en.json";
import zh from "../messages/zh.json";

const messages = { en, zh } as const;

export default getRequestConfig(async () => {
  // Read locale from cookie (set by middleware/proxy)
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || defaultLocale;

  return {
    locale,
    messages: messages[locale] ?? messages[defaultLocale],
  };
});
