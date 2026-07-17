// 户口簿组件数据接口 —— 由真实宠物数据映射而来

export interface ResidentGrowthItem {
  date: string
  title: string
  desc: string
}

export interface ResidentMedicationItem {
  name: string
  status: string
  date: string
  alert?: boolean
}

export interface ResidentInfo {
  name: string
  photoUrl: string | null
  species: string
  breed: string | null
  gender: string | null
  birthDate: string | null
  homeDate: string | null
  weightKg: number | null
  neutered: boolean | null
}

export interface ResidentHealth {
  weightKg: number | null
  weightTrend: string | null
  allergyNote: string | null
  medications: ResidentMedicationItem[]
}

export interface FamilyMember {
  id: string
  profileId: string
  nickname: string
  role: "owner" | "member"
  age: number | null
  ageText: string | null
  gender: "male" | "female" | "other" | null
  personalityTags: string[]
  avatarUrl: string | null
  // 宠物相关字段（成员）
  species?: string
  breed?: string
  residentId?: string
  petCode?: string
  birthDate?: string
  homeDate?: string
  icon?: string
}

export interface ResidentBookData {
  residentId: string
  petName: string
  photoUrl: string | null
  info: ResidentInfo
  growth: ResidentGrowthItem[]
  health: ResidentHealth
  family: FamilyMember[]
}
