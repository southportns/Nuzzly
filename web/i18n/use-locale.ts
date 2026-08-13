"use client";

import { useLocale as useNextIntlLocale } from "next-intl";
import { useCallback } from "react";
import { defaultLocale, locales, type Locale } from "./config";

/**
 * Hook for locale management in client components.
 * Uses cookie-based locale switching (no URL routing).
 */
export function useLocale() {
  const locale = useNextIntlLocale() as Locale;

  const setLocale = useCallback(async (newLocale: Locale) => {
    // Set cookie
    document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    // Reload page to apply new locale
    window.location.reload();
  }, []);

  return {
    locale,
    locales,
    defaultLocale,
    setLocale,
  };
}
