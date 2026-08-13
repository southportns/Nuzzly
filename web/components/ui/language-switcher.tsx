"use client";

import { useLocale } from "@/i18n/use-locale";
import { localeNames, localeFlags, type Locale } from "@/i18n/config";
import { useCallback, useState, useRef, useEffect } from "react";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      setOpen(false);
    },
    [setLocale]
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-semibold text-[#6B6B6B] transition-all hover:bg-[#8B5E46]/8 hover:text-[#8B5E46] whitespace-nowrap"
        aria-label="Switch language"
      >
        <span className="text-base">{localeFlags[locale]}</span>
        {!compact && <span>{localeNames[locale]}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] overflow-hidden rounded-[24px] border border-white/25 bg-white/80 backdrop-blur-xl py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]">
          {(Object.keys(localeNames) as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => handleSelect(l)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-[#F7F6F3] whitespace-nowrap ${
                locale === l ? "font-semibold text-[#FF7A59]" : "text-[#6B6B6B]"
              }`}
            >
              <span className="text-base">{localeFlags[l]}</span>
              <span>{localeNames[l]}</span>
              {locale === l && (
                <span className="ml-auto text-[#FF7A59]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
