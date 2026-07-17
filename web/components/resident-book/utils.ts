// 把真实宠物数据映射为户口簿展示数据

import type { Pet, PetAllergy, Profile } from "@/lib/supabase/types"
import type {
  ResidentBookData,
  ResidentGrowthItem,
  ResidentMedicationItem,
  FamilyMember,
} from "./types"

/**
 * 深圳地标 DB4403/T 467-2024 宠物品种代码映射表
 * 参考：https://amr.sz.gov.cn/attachment/1/1464/1464936/9772236.pdf
 */
const BREED_CODE_MAP: Record<string, string> = {
  // 猫品种（81种）
  "阿比西尼亚猫": "001",
  "埃及猫": "002",
  "澳大利亚雾猫": "003",
  "巴厘岛猫": "004",
  "北美洲长毛猫": "005",
  "北美洲短毛猫": "006",
  "披得秃猫": "007",
  "伯曼猫": "008",
  "波米拉长毛猫": "009",
  "波米拉猫": "010",
  "波斯猫": "011",
  "布偶猫": "012",
  "德文帝王猫": "013",
  "东方长毛猫": "014",
  "东方短毛猫": "015",
  "东奇尼猫": "016",
  "顿斯颗伊猫": "017",
  "多趾缅因猫": "018",
  "俄罗斯蓝猫": "019",
  "非洲狮子猫": "020",
  "哈瓦那棕猫": "021",
  "异国猫": "022",
  "柯尼斯卷毛猫": "023",
  "库里安长毛短尾猫": "024",
  "库里安短尾猫": "025",
  "拉波短毛卷毛猫": "026",
  "拉波卷毛猫": "027",
  "狼猫": "028",
  "马恩岛猫": "029",
  "曼基康长毛猫": "030",
  "曼基康猫": "031",
  "美国长毛卷耳猫": "032",
  "英国长毛猫": "033",
  "英国短毛断尾猫": "034",
  "美国短毛猫": "035",
  "英国短毛猫": "036",
  "美国短尾猫": "037",
  "美国卷耳猫": "038",
  "美国硬毛猫": "039",
  "孟加拉长毛猫": "040",
  "孟加拉猫": "041",
  "孟买猫": "042",
  "缅甸猫": "043",
  "缅因猫": "044",
  "米怒特长毛猫": "045",
  "米努特(小舞步)猫": "046",
  "内达华猫": "047",
  "挪威森林猫": "048",
  "欧西猫": "049",
  "日本长毛短尾猫": "050",
  "日本短尾猫": "051",
  "萨凡纳猫": "052",
  "赛尔凯克长毛卷毛猫": "053",
  "赛尔凯克卷毛猫": "054",
  "斯芬克斯猫": "055",
  "苏格兰长毛立耳猫": "056",
  "苏格兰长毛折耳猫": "057",
  "苏格兰立耳猫": "058",
  "苏格兰折耳猫": "059",
  "索马里猫": "060",
  "泰国猫": "061",
  "泰国御猫": "062",
  "土耳其安哥拉猫": "063",
  "土耳其梵猫": "064",
  "玩具虎猫": "065",
  "威尔士猫": "066",
  "暹罗猫": "067",
  "夏特尔猫": "068",
  "西伯利亚猫": "069",
  "喜马拉雅猫": "070",
  "新加坡猫": "071",
  "雪鞋猫": "072",
  "科拉特猫": "073",
  "赛伦盖蒂猫": "074",
  "苏格兰短毛高地猫": "075",
  "苏格兰高地猫": "076",
  "阿芙罗狄蒂猫": "077",
  "田纳西卷毛猫": "078",
  "袖珍猫": "079",
  "中华田园猫": "080",
  "其他": "081",

  // 犬品种（37种）
  "哈士奇": "001",
  "柴犬": "002",
  "泰迪犬": "003",
  "博美犬": "004",
  "柯基犬": "005",
  "吉娃娃": "006",
  "金毛犬": "007",
  "迷你贵宾": "008",
  "萨摩耶": "009",
  "约克夏犬": "010",
  "卡斯罗": "011",
  "巴哥犬": "012",
  "惠比特犬": "013",
  "阿拉斯加雪橇犬": "014",
  "北京犬": "015",
  "比特犬": "016",
  "迷你杜宾犬": "017",
  "沙皮犬": "018",
  "英国可卡犬": "019",
  "西施犬": "020",
  "英国史宾格": "021",
  "日本银狐": "022",
  "伯恩山地犬": "023",
  "蝴蝶犬": "024",
  "冠毛犬": "025",
  "大白熊犬": "026",
  "腊肠犬": "027",
  "可蒙犬": "028",
  "巴吉度犬": "029",
  "喜乐蒂": "030",
  "雪纳瑞犬": "031",
  "比熊犬": "032",
  "比格犬": "033",
  "马尔济斯犬": "034",
  "英国猎狐犬": "035",
  "中华田园犬": "036",
}

interface MedicationLike {
  name: string
  started_on: string | null
  ended_on: string | null
  is_ongoing: boolean
  notes: string | null
}

interface WeightLogLike {
  weight_kg: number
  logged_date: string
}

const speciesLabel: Record<string, string> = {
  cat: "喵星人",
  dog: "汪星人",
  other: "其他",
}

/** 计算年龄文本：>=1岁显示X岁，>=1月显示X个月，否则显示X天 */
function formatAgeText(birthDate: string): string | null {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const now = Date.now()
  const diffMs = now - birth.getTime()
  if (diffMs < 0) return null

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `${diffDays}天`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}个月`

  const years = Math.floor(diffMonths / 12)
  const remainMonths = diffMonths % 12
  return remainMonths > 0 ? `${years}岁${remainMonths}个月` : `${years}岁`
}

const genderLabel: Record<string, string> = {
  male: "弟弟",
  female: "妹妹",
  unknown: "保密",
}

function formatDotDate(d: string | null): string | null {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, "0")
  const day = String(dt.getDate()).padStart(2, "0")
  return `${y}.${m}.${day}`
}

function formatChineseDate(d: string | null): string | null {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`
}

/**
 * 生成符合深圳地标 DB4403/T 467-2024 的宠物唯一标识编码
 * 格式：8004 + 主体代码(9位) + 个体宠物代码(14位)
 * 个体宠物代码 = 分类代码(4位) + 品种代码(3位) + 序列号(7位)
 */
export function generatePetCode(
  species: string,
  breed: string | null,
  userNumber: number | null | undefined,
  petIndex: number
): string {
  // 宠物分类代码：3005=犬, 3007=猫
  const categoryCode = species === "dog" ? "3005" : species === "cat" ? "3007" : "9999"
  
  // 品种代码：从映射表查找，未找到则用 "999"
  const breedCode = breed ? (BREED_CODE_MAP[breed] ?? "999") : "999"
  
  // 序列号：7位数字，优先用 userNumber，否则用 petIndex
  const serialNumber = userNumber
    ? String(userNumber).padStart(7, "0")
    : String(petIndex).padStart(7, "0")
  
  // 主体代码：9位，暂时用占位符 "999999999"（待申请正式代码）
  const entityCode = "999999999"
  
  // 个体宠物代码 = 分类代码(4位) + 品种代码(3位) + 序列号(7位)
  const individualCode = `${categoryCode}${breedCode}${serialNumber}`
  
  // 完整编码：AI(8004) + 主体代码(9位) + 个体宠物代码(14位)
  return `8004${entityCode}${individualCode}`
}

/** 构建单一户口簿：户主=用户本人，成员=所有宠物 */
export function buildResidentBookData(
  profile: { display_name: string | null; avatar_url: string | null; user_number: number | null; created_at: string | null; birth_date?: string | null } | null,
  pets: Pet[],
  allergiesMap: Record<string, PetAllergy[]>,
  medsMap: Record<string, MedicationLike[]>,
  weightLogsMap: Record<string, WeightLogLike[]>,
): ResidentBookData {
  const year = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear()
  const userNumber = profile?.user_number
  const residentId = userNumber
    ? `Nuzzmily-${year}-${userNumber}`
    : `NZLY-${year}-${(pets[0]?.id ?? "").slice(-4).toUpperCase()}`

  // 成长时间线：合并所有宠物的成长事件
  const growth: ResidentGrowthItem[] = []
  for (const pet of pets) {
    if (pet.birth_date) {
      growth.push({
        date: formatDotDate(pet.birth_date)!,
        title: `${pet.name} 出生`,
        desc: `${pet.name} 来到这个世界的第一天。`,
      })
    }
    if (pet.home_date) {
      growth.push({
        date: formatDotDate(pet.home_date)!,
        title: `${pet.name} 第一次回家`,
        desc: `${pet.name} 正式加入毛球镇大家庭，开启幸福新生活。`,
      })
    }
    const meds = medsMap[pet.id] ?? []
    meds.slice(0, 3).forEach((m) => {
      if (m.started_on) {
        growth.push({
          date: formatDotDate(m.started_on)!,
          title: `${pet.name} 开始用药：${m.name}`,
          desc: m.notes ?? "按医嘱进行健康管理。",
        })
      }
    })
  }
  // 按日期排序
  growth.sort((a, b) => {
    const da = new Date(a.date.replace(/\./g, "-")).getTime()
    const db = new Date(b.date.replace(/\./g, "-")).getTime()
    return da - db
  })

  // 过敏注意事项（合并所有宠物）
  const allAllergies = Object.values(allergiesMap).flat()
  const allergyNote =
    allAllergies.length > 0
      ? allAllergies
          .map((a) => `${a.allergen}${a.severity ? `（${a.severity}）` : ""}`)
          .join("、")
      : null

  // 用药列表（合并所有宠物）
  const medications: ResidentMedicationItem[] = Object.entries(medsMap)
    .flatMap(([petId, meds]) =>
      meds.map((m) => ({
        name: `${pets.find((p) => p.id === petId)?.name ?? ""}·${m.name}`,
        status: m.is_ongoing ? "进行中" : "已完成",
        date: formatDotDate(m.started_on) ?? "—",
        alert: m.is_ongoing,
      })),
    )

  // 构建家庭成员：户主=用户，成员=宠物
  const familyMembers: FamilyMember[] = []

  // 户主（用户本人）
  if (profile) {
    const ownerAge = profile.birth_date
      ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null
    familyMembers.push({
      id: `owner-${profile.user_number ?? "0"}`,
      profileId: "",
      nickname: profile.display_name ?? "户主",
      role: "owner",
      age: ownerAge,
      ageText: profile.birth_date ? formatAgeText(profile.birth_date) : null,
      gender: null,
      personalityTags: [],
      avatarUrl: profile.avatar_url ?? null,
    })
  }

  // 成员（所有宠物）
  const petIcons: Record<string, string> = { cat: "🐱", dog: "🐶", other: "🐾" }
  pets.forEach((pet, index) => {
    const petCode = generatePetCode(pet.species, pet.breed, userNumber, index + 1)
    const petAllergies = allergiesMap[pet.id] ?? []
    const petWeightLogs = weightLogsMap[pet.id] ?? []
    const latestWeight = petWeightLogs.length > 0
      ? petWeightLogs[petWeightLogs.length - 1].weight_kg
      : pet.weight_kg

    familyMembers.push({
      id: pet.id,
      profileId: pet.profile_id ?? "",
      nickname: pet.name,
      role: "member",
      age: pet.birth_date
        ? Math.floor((Date.now() - new Date(pet.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      ageText: pet.birth_date ? formatAgeText(pet.birth_date) : null,
      gender: pet.gender === "unknown" ? null : (pet.gender as "male" | "female" | "other"),
      personalityTags: [],
      avatarUrl: pet.photo_url ?? pet.avatar_url ?? null,
      species: speciesLabel[pet.species] ?? "其他",
      breed: pet.breed ?? undefined,
      residentId: `PET-${String(index + 1).padStart(3, "0")}`,
      petCode,
      birthDate: pet.birth_date ?? undefined,
      homeDate: pet.home_date ?? undefined,
      icon: petIcons[pet.species] ?? "🐾",
    })
  })

  // 用第一只宠物的信息作为 info（封面展示）
  const firstPet = pets[0]
  const photoUrl = firstPet?.photo_url ?? firstPet?.avatar_url ?? null

  return {
    residentId,
    petName: firstPet?.name ?? "毛球镇",
    photoUrl,
    info: firstPet
      ? {
          name: firstPet.name,
          photoUrl,
          species: speciesLabel[firstPet.species] ?? "其他",
          breed: firstPet.breed,
          gender: genderLabel[firstPet.gender] ?? null,
          birthDate: formatChineseDate(firstPet.birth_date),
          homeDate: formatChineseDate(firstPet.home_date),
          weightKg: firstPet.weight_kg,
          neutered: firstPet.neutered,
        }
      : {
          name: "毛球镇",
          photoUrl: null,
          species: "其他",
          breed: null,
          gender: null,
          birthDate: null,
          homeDate: null,
          weightKg: null,
          neutered: null,
        },
    growth,
    health: {
      weightKg: firstPet?.weight_kg ?? null,
      weightTrend: null,
      allergyNote,
      medications,
    },
    family: familyMembers,
  }
}
