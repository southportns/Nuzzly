// =============================================
// Vaccine / Deworming Medication Preset Database
// =============================================
// Based on veterinary clinical guidelines (WSAVA vaccination guidelines, AAHA/AAFP guidelines)
// Includes common cat/dog vaccines and deworming medications with recommended intervals
// Covers international brands (Zoetis, Bayer, MSD/Intervet, Elanco, Boehringer Ingelheim, Merial)
// categorized by internal / external / both deworming
// =============================================

export type PetSpecies = "cat" | "dog" | "other"

export type MedicationCategory =
  | "core_vaccine"
  | "non_core_vaccine"
  | "internal_deworming"
  | "external_deworming"
  | "both_deworming"

export type DewormingSubType = "internal" | "external" | "both"

export interface ShotIntervalConfig {
  intervalDays: number
  nextDescription: string
}

export interface MedicationPreset {
  name: string
  aliases: string[]
  species: PetSpecies[]
  category: MedicationCategory
  defaultIntervalDays: number
  isRepeating: boolean
  repeatInterval?: "monthly" | "quarterly" | "yearly" | "none"
  description: string
  shotIntervals?: Record<number, ShotIntervalConfig>
}

// ── Chinese localization map ──
const PRESET_LOCALIZATIONS: Record<string, { name_zh: string; description_zh: string }> = {
  // Cat Vaccines
  "FVRCP Vaccine": { name_zh: "猫三联疫苗", description_zh: "核心三价疫苗（猫瘟、猫鼻支、猫杯状病毒）。每年加强针。" },
  "Rabies Vaccine": { name_zh: "狂犬疫苗", description_zh: "狂犬疫苗 — 多数国家法定要求。每年或每三年加强针。" },
  "FeLV Vaccine": { name_zh: "猫白血病疫苗", description_zh: "猫白血病病毒疫苗 — 建议外出/多猫家庭接种。每年加强针。" },
  // Dog Vaccines
  "DHPP Vaccine": { name_zh: "犬四联疫苗", description_zh: "核心犬四联疫苗（犬瘟热、肝炎、细小、副流感）。每年加强针。" },
  "Leptospirosis Vaccine": { name_zh: "钩端螺旋体疫苗", description_zh: "预防钩端螺旋体感染。每年加强针。" },
  "Bordetella Vaccine": { name_zh: "犬窝咳疫苗", description_zh: "预防犬传染性气管支气管炎（犬窝咳）。每年加强针。" },
  // Cat Deworming — Internal
  "Milbemax": { name_zh: "米尔贝肟", description_zh: "体内驱虫（蛔虫、钩虫、绦虫、心丝虫）。每3个月。" },
  "Drontal Cat": { name_zh: "拜宠清（猫用）", description_zh: "体内驱虫（绦虫、蛔虫）。每3个月。拜耳。" },
  "Milpro": { name_zh: "米尔普", description_zh: "体内驱虫（蛔虫、钩虫、绦虫、心丝虫）。每3个月。" },
  "Praziquantel Tablets": { name_zh: "吡喕酮片", description_zh: "广谱体内驱虫（绦虫、吸虫）。每3个月。" },
  "Fenbendazole": { name_zh: "芬苯达唑", description_zh: "广谱体内驱虫（蛔虫、钩虫、鞭虫、绦虫）。每3个月。" },
  "Albendazole": { name_zh: "阿苯达唑", description_zh: "广谱体内驱虫（蛔虫、钩虫、鞭虫、绦虫）。每3个月。" },
  // Cat Deworming — External
  "Revolution": { name_zh: "大宠爱", description_zh: "体外驱虫（跳蚤、耳螨、虱子）。每月。硕腾。" },
  "Frontline Plus": { name_zh: "福来恩", description_zh: "加强体外驱虫（成蚤、幼虫、虫卵、蜱虫）。每月。" },
  "Advantage II": { name_zh: "安捷优", description_zh: "体外驱虫（跳蚤、虱子）。每月。拜耳。" },
  "Bravecto": { name_zh: "布拉弗", description_zh: "长效体外驱虫（跳蚤、蜱虫）。每12周。MSD。" },
  "Credelio": { name_zh: "克雷得利", description_zh: "口服体外驱虫（跳蚤、蜱虫）。每月。Elanco。" },
  "Fipronil Spot-on": { name_zh: "非泼罗尼滴剂", description_zh: "通用体外驱虫（跳蚤、蜱虫）。每月。" },
  // Cat Deworming — Both
  "Advocate": { name_zh: "爱宠达", description_zh: "体内外同驱（跳蚤、耳螨、肺虫、心丝虫）。每月。拜耳。" },
  "Broadline": { name_zh: "博来恩", description_zh: "全效驱虫（跳蚤、蜱虫、蛔虫、绦虫）。每月。拜耳。" },
  // Dog Deworming — Internal
  "Drontal Plus": { name_zh: "拜宠清（犬用）", description_zh: "广谱体内驱虫（蛔虫、钩虫、绦虫、鞭虫）。每3个月。拜耳。" },
  "Milbemax Dog": { name_zh: "米尔贝肟（犬用）", description_zh: "体内驱虫（心丝虫、蛔虫、钩虫）。每3个月。" },
  "Heartgard Plus": { name_zh: "心卫安", description_zh: "预防心丝虫及蛔虫、钩虫。每月。MSD。" },
  "Panacur": { name_zh: "潘卡苏", description_zh: "广谱体内驱虫（蛔虫、钩虫、鞭虫、绦虫）。每3个月。" },
  "Milpro Dog": { name_zh: "米尔普（犬用）", description_zh: "体内驱虫（蛔虫、钩虫、绦虫、心丝虫）。每3个月。" },
  // Dog Deworming — External
  "NexGard": { name_zh: "尼可信", description_zh: "口服体外驱虫（跳蚤、蜱虫）。每月。硕腾。" },
  "Advantix": { name_zh: "安捷特", description_zh: "体外驱虫（跳蚤、蜱虫、蚊、虱）。每月。拜耳。" },
  // Dog Deworming — Both
  "NexGard Spectra": { name_zh: "尼可信Spectra", description_zh: "体内外同驱（跳蚤、蜱虫、心丝虫、肠道虫）。每月。硕腾。" },
}

// ── nextDescription localization map ──
const NEXT_DESCRIPTION_ZH: Record<string, string> = {
  "Second Shot": "第二针",
  "Third Shot": "第三针",
  "Next Booster": "下次加强针",
}

// ── Deworming sub-type label localization ──
const DEWORMING_SUBTYPE_LABELS_ZH: Record<DewormingSubType, string> = {
  internal: "体内驱虫",
  external: "体外驱虫",
  both: "体内外同驱",
}

export function getLocalizedName(preset: MedicationPreset, locale: string): string {
  if (locale === "zh") {
    return PRESET_LOCALIZATIONS[preset.name]?.name_zh ?? preset.name
  }
  return preset.name
}

export function getLocalizedDescription(preset: MedicationPreset, locale: string): string {
  if (locale === "zh") {
    return PRESET_LOCALIZATIONS[preset.name]?.description_zh ?? preset.description
  }
  return preset.description
}

// ── Cat Vaccines ──
const catVaccines: MedicationPreset[] = [
  {
    name: "FVRCP Vaccine",
    aliases: ["Feline Distemper", "Feline Herpesvirus", "Calicivirus", "Panleukopenia", "Core Cat Vaccine", "Fel-O-Vax", "Nobivac Feline", "妙三多", "猫三联", "FVRCP"],
    species: ["cat"],
    category: "core_vaccine",
    defaultIntervalDays: 365,
    isRepeating: true,
    repeatInterval: "yearly",
    description: "Core feline trivalent vaccine (panleukopenia, herpesvirus, calicivirus). Annual booster required.",
    shotIntervals: {
      1: { intervalDays: 21, nextDescription: "Second Shot" },
      2: { intervalDays: 21, nextDescription: "Third Shot" },
      3: { intervalDays: 365, nextDescription: "Next Booster" },
      0: { intervalDays: 365, nextDescription: "Next Booster" },
    },
  },
  {
    name: "Rabies Vaccine",
    aliases: ["Rabies", "Nobivac Rabies", "Imrab", "Raboral", "瑞比狂", "狂犬病疫苗", "Rabies Vaccine"],
    species: ["cat"],
    category: "core_vaccine",
    defaultIntervalDays: 365,
    isRepeating: true,
    repeatInterval: "yearly",
    description: "Rabies vaccine — legally required in most countries. Annual or triennial booster depending on vaccine type. Recommended for outdoor cats.",
    shotIntervals: {
      1: { intervalDays: 365, nextDescription: "Next Booster" },
      0: { intervalDays: 365, nextDescription: "Next Booster" },
    },
  },
  {
    name: "FeLV Vaccine",
    aliases: ["Feline Leukemia", "Leukemia Vaccine", "Fel-O-Vax FeLV", "Nobivac FeLV", "猫白血病", "FeLV"],
    species: ["cat"],
    category: "non_core_vaccine",
    defaultIntervalDays: 365,
    isRepeating: true,
    repeatInterval: "yearly",
    description: "Feline leukemia virus vaccine — recommended for outdoor/multi-cat households. Annual booster.",
    shotIntervals: {
      1: { intervalDays: 28, nextDescription: "Second Shot" },
      2: { intervalDays: 365, nextDescription: "Next Booster" },
      0: { intervalDays: 365, nextDescription: "Next Booster" },
    },
  },
]

// ── Dog Vaccines ──
const dogVaccines: MedicationPreset[] = [
  {
    name: "DHPP Vaccine",
    aliases: ["Distemper", "Hepatitis", "Parvovirus", "Parainfluenza", "Core Dog Vaccine", "Nobivac DHPP", "Vanguard Plus", "卫佳捌", "犬四联", "DHPP", "DAPP"],
    species: ["dog"],
    category: "core_vaccine",
    defaultIntervalDays: 365,
    isRepeating: true,
    repeatInterval: "yearly",
    description: "Core canine combination vaccine (distemper, hepatitis, parvovirus, parainfluenza). Annual booster.",
    shotIntervals: {
      1: { intervalDays: 21, nextDescription: "Second Shot" },
      2: { intervalDays: 21, nextDescription: "Third Shot" },
      3: { intervalDays: 365, nextDescription: "Next Booster" },
      0: { intervalDays: 365, nextDescription: "Next Booster" },
    },
  },
  {
    name: "Rabies Vaccine",
    aliases: ["Rabies", "Nobivac Rabies", "Imrab", "Raboral", "瑞比狂", "狂犬病疫苗", "Rabies Vaccine"],
    species: ["dog"],
    category: "core_vaccine",
    defaultIntervalDays: 365,
    isRepeating: true,
    repeatInterval: "yearly",
    description: "Rabies vaccine — legally required in most countries. Annual or triennial booster.",
    shotIntervals: {
      1: { intervalDays: 365, nextDescription: "Next Booster" },
      0: { intervalDays: 365, nextDescription: "Next Booster" },
    },
  },
  {
    name: "Leptospirosis Vaccine",
    aliases: ["Lepto", "Lyme Disease", "Nobivac Lepto", "钩端螺旋体", "Leptospirosis"],
    species: ["dog"],
    category: "non_core_vaccine",
    defaultIntervalDays: 365,
    isRepeating: true,
    repeatInterval: "yearly",
    description: "Prevents leptospirosis infection. Annual booster.",
    shotIntervals: {
      1: { intervalDays: 28, nextDescription: "Second Shot" },
      2: { intervalDays: 365, nextDescription: "Next Booster" },
      0: { intervalDays: 365, nextDescription: "Next Booster" },
    },
  },
  {
    name: "Bordetella Vaccine",
    aliases: ["Kennel Cough", "Canine Cough", "Nobivac KC", "犬窝咳", "Bordetella"],
    species: ["dog"],
    category: "non_core_vaccine",
    defaultIntervalDays: 365,
    isRepeating: true,
    repeatInterval: "yearly",
    description: "Prevents canine infectious tracheobronchitis (kennel cough). Annual booster.",
    shotIntervals: {
      1: { intervalDays: 365, nextDescription: "Next Booster" },
      0: { intervalDays: 365, nextDescription: "Next Booster" },
    },
  },
]

// ── Cat Deworming Medications ──
const catDeworming: MedicationPreset[] = [
  // ===== Internal =====
  {
    name: "Milbemax",
    aliases: ["Milbemycin", "Milbemycin Oxime", "Novartis Milbemax", "Elanco Milbemax", "米尔贝肟片", "Milbemax"],
    species: ["cat"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Internal deworming (roundworms, hookworms, tapeworms, heartworms). Every 3 months.",
  },
  {
    name: "Drontal Cat",
    aliases: ["Praziquantel", "Bayer Drontal", "Drontal for Cats", "拜宠清", "Drontal"],
    species: ["cat"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Internal deworming (tapeworms, roundworms). Every 3 months. Bayer.",
  },
  {
    name: "Milpro",
    aliases: ["Milbemycin+Praziquantel", "Elanco Milpro", "米尔普", "Milpro"],
    species: ["cat"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Internal deworming (roundworms, hookworms, tapeworms, heartworms). Every 3 months.",
  },
  {
    name: "Praziquantel Tablets",
    aliases: ["Praziquantel", "Tapeworm Tablets", "Droncit", "吡喕酮", "Praziquantel Tablets"],
    species: ["cat", "dog"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "General internal deworming (tapeworms, flukes). Every 3 months.",
  },
  {
    name: "Fenbendazole",
    aliases: ["Panacur", "Fenbendazole", "Broad-spectrum dewormer", "芬苯达唑", "Fenbendazole"],
    species: ["cat", "dog"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Broad-spectrum internal deworming (roundworms, hookworms, whipworms, tapeworms). Every 3 months.",
  },
  {
    name: "Albendazole",
    aliases: ["Albendazole", "Valbazen", "阿苯达唑", "Albendazole"],
    species: ["cat", "dog"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Broad-spectrum internal deworming (roundworms, hookworms, whipworms, tapeworms). Every 3 months.",
  },

  // ===== External =====
  {
    name: "Revolution",
    aliases: ["Selamectin", "Stronghold", "Zoetis Revolution", "Revolution for Cats", "大宠爱", "Revolution"],
    species: ["cat"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "External parasite control (fleas, ear mites, lice). Monthly. Zoetis.",
  },
  {
    name: "Frontline Plus",
    aliases: ["Fipronil", "Frontline", "Merial Frontline", "Fipronil+S-methoprene", "福来恩", "Frontline Plus"],
    species: ["cat"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Enhanced external parasite control (adult fleas, larvae, eggs, ticks). Monthly.",
  },
  {
    name: "Advantage II",
    aliases: ["Imidacloprid", "Bayer Advantage", "Advantage for Cats", "安捷优", "Advantage II"],
    species: ["cat"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "External parasite control (fleas, lice). Monthly. Bayer. Fast-acting topical.",
  },
  {
    name: "Bravecto",
    aliases: ["Fluralaner", "MSD Bravecto", "Bravecto Spot-on", "布拉弗", "Bravecto"],
    species: ["cat"],
    category: "external_deworming",
    defaultIntervalDays: 84,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Long-lasting external parasite control (fleas, ticks). Every 12 weeks. MSD.",
  },
  {
    name: "Credelio",
    aliases: ["Lotilaner", "Elanco Credelio", "Credelio Cat", "克雷得利", "Credelio"],
    species: ["cat"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Oral external parasite control (fleas, ticks). Monthly. Elanco. Chewable tablet.",
  },
  {
    name: "Fipronil Spot-on",
    aliases: ["Fipronil", "Generic Fipronil", "Fipronil Drops", "非泼罗尼", "Fipronil Spot-on"],
    species: ["cat"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "General external parasite control (fleas, ticks). Monthly.",
  },

  // ===== Both =====
  {
    name: "Advocate",
    aliases: ["Imidacloprid+Moxidectin", "Bayer Advocate", "Advantage Multi", "爱宠达", "爱沃克", "Advocate"],
    species: ["cat"],
    category: "both_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Internal + external parasite control (fleas, ear mites, lungworms, heartworms). Monthly. Bayer.",
  },
  {
    name: "Broadline",
    aliases: ["Bayer Broadline", "Fipronil+S-methoprene+Praziquantel+Epsiprantel", "博来恩", "Broadline"],
    species: ["cat"],
    category: "both_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "All-in-one parasite control (fleas, ticks, roundworms, tapeworms). Monthly. Bayer.",
  },
]

// ── Dog Deworming Medications ──
const dogDeworming: MedicationPreset[] = [
  // ===== Internal =====
  {
    name: "Drontal Plus",
    aliases: ["Praziquantel", "Bayer Drontal", "Drontal for Dogs", "Drontal Plus", "拜宠清", "Drontal Plus"],
    species: ["dog"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Broad-spectrum internal deworming (roundworms, hookworms, tapeworms, whipworms). Every 3 months. Bayer.",
  },
  {
    name: "Milbemax Dog",
    aliases: ["Milbemycin", "Milbemax for Dogs", "Elanco Milbemax", "米尔贝肟", "Milbemax Dog"],
    species: ["dog"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Internal deworming (heartworms, roundworms, hookworms). Every 3 months.",
  },
  {
    name: "Heartgard Plus",
    aliases: ["Ivermectin", "MSD Heartgard", "Heartgard", "心卫安", "Heartgard Plus"],
    species: ["dog"],
    category: "internal_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Heartworm prevention plus roundworm and hookworm control. Monthly. MSD. Beef-flavored chewable.",
  },
  {
    name: "Panacur",
    aliases: ["Fenbendazole", "Panacur C", "Intervet Panacur", "潘卡苏", "Panacur"],
    species: ["dog"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Broad-spectrum internal deworming (roundworms, hookworms, whipworms, tapeworms). Every 3 months.",
  },
  {
    name: "Milpro Dog",
    aliases: ["Milbemycin+Praziquantel", "Elanco Milpro Dog", "米尔普", "Milpro Dog"],
    species: ["dog"],
    category: "internal_deworming",
    defaultIntervalDays: 90,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Internal deworming (roundworms, hookworms, tapeworms, heartworms). Every 3 months.",
  },

  // ===== External =====
  {
    name: "Revolution",
    aliases: ["Selamectin", "Stronghold", "Zoetis Revolution", "Revolution for Dogs"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "External parasite control (fleas, ear mites, sarcoptic mange). Monthly. Zoetis.",
  },
  {
    name: "Frontline Plus",
    aliases: ["Fipronil", "Frontline", "Merial Frontline"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "External parasite control (fleas, ticks, lice). Monthly.",
  },
  {
    name: "NexGard",
    aliases: ["Afoxolaner", "Zoetis NexGard", "NexGard Chewable", "尼可信", "NexGard"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Oral external parasite control (fleas, ticks). Monthly. Zoetis. Beef-flavored chewable.",
  },
  {
    name: "Advantage II",
    aliases: ["Imidacloprid", "Bayer Advantage", "Advantage for Dogs"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "External parasite control (fleas, lice). Monthly. Bayer. Fast-acting topical.",
  },
  {
    name: "Advantix",
    aliases: ["K9 Advantix", "Imidacloprid+Permethrin", "Bayer Advantix", "安捷特", "Advantix"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "External parasite control (fleas, ticks, mosquitoes, lice). Monthly. Bayer. Dog-specific.",
  },
  {
    name: "Bravecto",
    aliases: ["Fluralaner", "MSD Bravecto", "Bravecto Chewable"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 84,
    isRepeating: true,
    repeatInterval: "quarterly",
    description: "Long-lasting oral external parasite control (fleas, ticks). Every 12 weeks. MSD.",
  },
  {
    name: "Credelio",
    aliases: ["Lotilaner", "Elanco Credelio", "Credelio Dog"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Oral external parasite control (fleas, ticks). Monthly. Elanco. Chewable tablet.",
  },
  {
    name: "Fipronil Spot-on",
    aliases: ["Fipronil", "Generic Fipronil", "Fipronil Drops"],
    species: ["dog"],
    category: "external_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "General external parasite control (fleas, ticks). Monthly.",
  },

  // ===== Both =====
  {
    name: "NexGard Spectra",
    aliases: ["Afoxolaner+Milbemycin", "Zoetis NexGard Spectra", "尼可信Spectra", "NexGard Spectra"],
    species: ["dog"],
    category: "both_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Internal + external parasite control (fleas, ticks, heartworms, intestinal worms). Monthly. Zoetis. Chewable.",
  },
  {
    name: "Advocate",
    aliases: ["Imidacloprid+Moxidectin", "Bayer Advocate", "Advantage Multi"],
    species: ["dog"],
    category: "both_deworming",
    defaultIntervalDays: 30,
    isRepeating: true,
    repeatInterval: "monthly",
    description: "Internal + external parasite control (fleas, ear mites, lungworms, heartworms). Monthly. Bayer.",
  },
]

// ── Combined ──
export const ALL_MEDICATION_PRESETS: MedicationPreset[] = [
  ...catVaccines,
  ...dogVaccines,
  ...catDeworming,
  ...dogDeworming,
]

export function dewormingSubTypeToCategory(subType: DewormingSubType): MedicationCategory {
  switch (subType) {
    case "internal":
      return "internal_deworming"
    case "external":
      return "external_deworming"
    case "both":
      return "both_deworming"
  }
}

export function categoryToDewormingSubType(category: MedicationCategory): DewormingSubType | null {
  switch (category) {
    case "internal_deworming":
      return "internal"
    case "external_deworming":
      return "external"
    case "both_deworming":
      return "both"
    default:
      return null
  }
}

export function getDewormingSubTypeLabel(subType: DewormingSubType, locale?: string): string {
  if (locale === "zh") {
    return DEWORMING_SUBTYPE_LABELS_ZH[subType]
  }
  switch (subType) {
    case "internal":
      return "Internal"
    case "external":
      return "External"
    case "both":
      return "Internal + External"
  }
}

export function getMedicationPresets(
  species: PetSpecies | null | undefined,
  recordType: "vaccination" | "medication",
  dewormingSubType?: DewormingSubType | null,
): MedicationPreset[] {
  return ALL_MEDICATION_PRESETS.filter((m) => {
    if (recordType === "vaccination") {
      if (m.category !== "core_vaccine" && m.category !== "non_core_vaccine") return false
    } else {
      if (
        m.category !== "internal_deworming" &&
        m.category !== "external_deworming" &&
        m.category !== "both_deworming"
      )
        return false
      if (dewormingSubType) {
        const targetCategory = dewormingSubTypeToCategory(dewormingSubType)
        if (m.category !== targetCategory) return false
      }
    }
    if (!species || species === "other") return true
    return m.species.includes(species)
  })
}

export function searchMedicationPresets(
  query: string,
  species: PetSpecies | null | undefined,
  recordType: "vaccination" | "medication",
  dewormingSubType?: DewormingSubType | null,
): MedicationPreset[] {
  const presets = getMedicationPresets(species, recordType, dewormingSubType)
  if (!query.trim()) return presets

  const q = query.trim().toLowerCase()
  return presets.filter((m) => {
    if (m.name.toLowerCase().includes(q)) return true
    if (m.aliases.some((a) => a.toLowerCase().includes(q))) return true
    // Also search Chinese name
    const zhName = PRESET_LOCALIZATIONS[m.name]?.name_zh
    if (zhName && zhName.toLowerCase().includes(q)) return true
    return false
  })
}

export function findMedicationPreset(
  name: string,
  species: PetSpecies | null | undefined,
  recordType: "vaccination" | "medication",
): MedicationPreset | null {
  const presets = getMedicationPresets(species, recordType)
  const n = name.trim().toLowerCase()
  return (
    presets.find((m) => {
      if (m.name.toLowerCase() === n) return true
      if (m.aliases.some((a) => a.toLowerCase() === n)) return true
      // Also match Chinese name
      const zhName = PRESET_LOCALIZATIONS[m.name]?.name_zh
      if (zhName && zhName.toLowerCase() === n) return true
      return false
    }) ?? null
  )
}

export function inferDewormingSubType(
  name: string,
  species: PetSpecies | null | undefined,
): DewormingSubType | null {
  if (!name.trim()) return null
  const preset = findMedicationPreset(name, species, "medication")
  if (!preset) return null
  return categoryToDewormingSubType(preset.category)
}

const DEFAULT_SHOT_INTERVALS: Record<number, ShotIntervalConfig> = {
  1: { intervalDays: 21, nextDescription: "Second Shot" },
  2: { intervalDays: 21, nextDescription: "Third Shot" },
  3: { intervalDays: 365, nextDescription: "Next Booster" },
  0: { intervalDays: 365, nextDescription: "Next Booster" },
}

export function getNextVaccineDueDate(
  firstShotDate: string,
  completedShots: number[],
  preset: MedicationPreset | null,
  locale?: string,
): { dueDate: string; totalDays: number; description: string } | null {
  if (completedShots.length === 0) return null

  const intervals = preset?.shotIntervals ?? DEFAULT_SHOT_INTERVALS

  const sorted = [...new Set(completedShots)].sort((a, b) => {
    if (a === 0) return 1
    if (b === 0) return -1
    return a - b
  })

  let totalDays = 0
  for (const shot of sorted) {
    const config = intervals[shot]
    if (!config) return null
    totalDays += config.intervalDays
  }
  totalDays += sorted.length - 1

  const lastShot = sorted[sorted.length - 1]
  const lastConfig = intervals[lastShot]
  if (!lastConfig) return null

  const dueDate = new Date(firstShotDate)
  dueDate.setDate(dueDate.getDate() + totalDays)

  const rawDesc = lastConfig.nextDescription
  const description = locale === "zh" ? (NEXT_DESCRIPTION_ZH[rawDesc] ?? rawDesc) : rawDesc

  return {
    dueDate: dueDate.toISOString().slice(0, 10),
    totalDays,
    description,
  }
}

export function getNextDewormingDueDate(
  recordDate: string,
  preset: MedicationPreset | null,
  locale?: string,
): { dueDate: string; intervalDays: number; description: string } | null {
  if (!preset) return null
  const baseDate = new Date(recordDate)
  baseDate.setDate(baseDate.getDate() + preset.defaultIntervalDays)
  const localized = locale === "zh" ? getLocalizedName(preset, "zh") : preset.name
  return {
    dueDate: baseDate.toISOString().slice(0, 10),
    intervalDays: preset.defaultIntervalDays,
    description: preset.isRepeating ? (locale === "zh" ? `下次${localized}` : `Next ${preset.name}`) : (locale === "zh" ? "下次驱虫" : "Next deworming"),
  }
}

export function getShotOptions(preset: MedicationPreset | null): { value: number; label: string }[] {
  if (preset?.shotIntervals) {
    const keys = Object.keys(preset.shotIntervals).map(Number).sort((a, b) => {
      const sortA = a === 0 ? 4 : a
      const sortB = b === 0 ? 4 : b
      return sortA - sortB
    })
    const labels: Record<number, string> = { 0: "Booster", 1: "Shot 1", 2: "Shot 2", 3: "Shot 3", 4: "Shot 4" }
    return keys.map((k) => ({ value: k, label: labels[k] ?? `Shot ${k}` }))
  }
  return [
    { value: 1, label: "Shot 1" },
    { value: 2, label: "Shot 2" },
    { value: 3, label: "Shot 3" },
    { value: 0, label: "Booster" },
  ]
}
