// =============================================
// next-intl Configuration
// Locales: en (default, Singapore market) / zh (Chinese)
// Mode: Without i18n routing (cookie-based locale detection)
// =============================================

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇸🇬",
  zh: "🇨🇳",
};
