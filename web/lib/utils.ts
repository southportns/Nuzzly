import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate age text from birth date (unified algorithm, shared by pet profile and resident book)
 *
 * Uses calendar-precise year/month difference (not 30-day approximation), with friendly display format:
 * - Less than 1 month: shows "X days"
 * - Less than 1 year: shows "X months" (no "0 years" prefix)
 * - 1+ years with no remaining months: shows "X years"
 * - Otherwise: shows "X years X months"
 *
 * @returns Formatted age string, or null if input is invalid
 */
export function formatAgeFromDate(
  birthDate: string | null | undefined,
  locale?: string
): string | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  if (now < birth) return null

  const isZh = locale === "zh"
  const daysLabel = isZh ? "天" : "days"
  const monthsLabel = isZh ? "个月" : "months"
  const yearsLabel = isZh ? "岁" : "years"

  // Calendar-precise year/month difference calculation
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()

  // If current day < birth day, decrement months (birthday hasn't occurred yet this month)
  if (now.getDate() < birth.getDate()) {
    months--
  }
  if (months < 0) {
    years--
    months += 12
  }

  // Format output
  if (years === 0 && months === 0) {
    // Less than 1 month, show in days
    const diffDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
    return `${diffDays} ${daysLabel}`
  }
  if (years === 0) {
    return `${months} ${monthsLabel}`
  }
  if (months === 0) {
    return `${years} ${yearsLabel}`
  }
  return `${years} ${yearsLabel} ${months} ${monthsLabel}`
}

/**
 * Dynamically calculate pet age from birth date (years + months)
 * Priority: birth_date → age_days → age_years/age_months fallback
 */
export function formatPetAge(pet: {
  birth_date?: string | null
  age_days?: number | null
  age_years?: number | null
  age_months?: number | null
}, locale?: string): string {
  const isZh = locale === "zh"
  const monthsLabel = isZh ? "个月" : "months"
  const yearsLabel = isZh ? "岁" : "years"

  // Priority: calculate from birth date (using unified function)
  if (pet.birth_date) {
    return formatAgeFromDate(pet.birth_date, locale) ?? "—"
  }
  // Second: calculate from days
  if (pet.age_days != null) {
    return `${Math.floor(pet.age_days / 365)} ${yearsLabel} ${Math.floor((pet.age_days % 365) / 30)} ${monthsLabel}`
  }
  // Fallback: legacy data
  return `${pet.age_years ?? 0} ${yearsLabel} ${pet.age_months ?? 0} ${monthsLabel}`
}
