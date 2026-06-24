import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 根据出生日期动态计算宠物年龄（岁+月）
 * 优先使用 birth_date，其次使用 age_days，最后回退到 age_years/age_months
 */
export function formatPetAge(pet: {
  birth_date?: string | null
  age_days?: number | null
  age_years?: number | null
  age_months?: number | null
}): string {
  // 优先：根据出生日期计算
  if (pet.birth_date) {
    const birth = new Date(pet.birth_date)
    const now = new Date()
    let years = now.getFullYear() - birth.getFullYear()
    let months = now.getMonth() - birth.getMonth()
    if (months < 0) {
      years--
      months += 12
    }
    if (birth.getDate() > now.getDate()) {
      months--
      if (months < 0) {
        years--
        months += 12
      }
    }
    return `${years}岁${months}个月`
  }
  // 其次：根据天数计算
  if (pet.age_days != null) {
    return `${Math.floor(pet.age_days / 365)}岁${Math.floor((pet.age_days % 365) / 30)}个月`
  }
  // 回退：旧数据
  return `${pet.age_years ?? 0}岁${pet.age_months ?? 0}个月`
}
