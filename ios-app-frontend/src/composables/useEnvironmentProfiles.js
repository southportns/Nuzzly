import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const environmentProfile = shallowRef(null)
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchEnvironmentProfile(petId) {
  loading.value = true
  const uid = await getUid()

  let query = supabase
    .from('environment_profiles')
    .select('*')
    .eq('pet_id', petId)
    .single()

  if (uid) {
    query = query.eq('profile_id', uid)
  }

  const { data, error } = await query

  if (error && error.code !== 'PGRST116') {
    console.warn('[useEnvironmentProfiles] fetch error:', error.message)
    environmentProfile.value = null
  } else {
    environmentProfile.value = data || null
  }
  loading.value = false
}

async function createOrUpdateEnvironmentProfile(petId, profileData) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'createOrUpdateEnvironmentProfile')

  const dataToUpsert = {
    pet_id: petId,
    profile_id: uid,
    ...profileData,
    updated_at: new Date().toISOString()
  }

  let result

  if (environmentProfile.value) {
    // 更新现有记录
    const { data, error } = await supabase
      .from('environment_profiles')
      .update(dataToUpsert)
      .eq('id', environmentProfile.value.id)
      .select()
      .single()

    if (error) throw normalizeError(error, 'createOrUpdateEnvironmentProfile')
    result = data
  } else {
    // 创建新记录
    const { data, error } = await supabase
      .from('environment_profiles')
      .insert(dataToUpsert)
      .select()
      .single()

    if (error) throw normalizeError(error, 'createOrUpdateEnvironmentProfile')
    result = data
  }

  environmentProfile.value = result
  return result
}

async function deleteEnvironmentProfile() {
  if (!environmentProfile.value) return

  const { error } = await supabase
    .from('environment_profiles')
    .delete()
    .eq('id', environmentProfile.value.id)

  if (error) throw normalizeError(error, 'deleteEnvironmentProfile')
  environmentProfile.value = null
}

// 辅助函数：获取气候类型标签
function getClimateTypeLabel(type) {
  const labels = {
    tropical: '热带',
    subtropical: '亚热带',
    temperate: '温带',
    continental: '大陆性',
    arid: '干旱',
    mediterranean: '地中海',
    oceanic: '海洋性',
    cold: '寒冷'
  }
  return labels[type] || type || '未知'
}

// 辅助函数：获取活动水平标签
function getActivityLevelLabel(level) {
  const labels = {
    low: '低活动量',
    moderate: '中等活动量',
    high: '高活动量',
    very_high: '非常高活动量'
  }
  return labels[level] || level || '未知'
}

// 辅助函数：获取室内/室外标签
function getIndoorOutdoorLabel(value) {
  const labels = {
    indoor: '纯室内',
    outdoor: '纯室外',
    mixed: '室内外混合'
  }
  return labels[value] || value || '未知'
}

// 辅助函数：获取水源标签
function getWaterSourceLabel(source) {
  const labels = {
    tap: '自来水',
    filtered: '过滤水',
    bottled: '瓶装水',
    spring: '山泉水',
    other: '其他'
  }
  return labels[source] || source || '未知'
}

// 辅助函数：计算环境评分
function calculateEnvironmentScore(profile) {
  if (!profile) return null

  let score = 0
  let factors = 0

  // 活动水平评分
  if (profile.activity_level) {
    const activityScores = { low: 3, moderate: 7, high: 9, very_high: 10 }
    score += activityScores[profile.activity_level] || 5
    factors++
  }

  // 室内/室外评分
  if (profile.indoor_outdoor) {
    const ioScores = { indoor: 6, mixed: 8, outdoor: 7 }
    score += ioScores[profile.indoor_outdoor] || 5
    factors++
  }

  // 水源评分
  if (profile.water_source) {
    const waterScores = { filtered: 9, spring: 8, bottled: 7, tap: 5, other: 5 }
    score += waterScores[profile.water_source] || 5
    factors++
  }

  // 多宠家庭（适度扣分，因为可能有竞争压力）
  if (profile.multi_pet_household) {
    score -= 0.5
    factors++
  }

  // 有小孩（适度扣分）
  if (profile.has_children) {
    score -= 0.3
    factors++
  }

  return factors > 0 ? Math.min(10, Math.max(1, Math.round(score / factors * 10) / 10)) : null
}

export function useEnvironmentProfiles() {
  return {
    environmentProfile,
    loading,
    fetchEnvironmentProfile,
    createOrUpdateEnvironmentProfile,
    deleteEnvironmentProfile,
    getClimateTypeLabel,
    getActivityLevelLabel,
    getIndoorOutdoorLabel,
    getWaterSourceLabel,
    calculateEnvironmentScore
  }
}
