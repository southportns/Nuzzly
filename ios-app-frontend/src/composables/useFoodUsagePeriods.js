import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const foodUsagePeriods = shallowRef([])
const currentPeriod = shallowRef(null)
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchFoodUsagePeriods(petId) {
  loading.value = true
  const uid = await getUid()

  let query = supabase
    .from('food_usage_periods')
    .select('*, products(name, brand, image_url), product_versions(version_name, nutrition_snapshot)')
    .eq('pet_id', petId)
    .order('start_date', { ascending: false })

  if (uid) {
    query = query.eq('profile_id', uid)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[useFoodUsagePeriods] fetch error:', error.message)
    foodUsagePeriods.value = []
    currentPeriod.value = null
  } else {
    foodUsagePeriods.value = data || []
    currentPeriod.value = data?.find(p => p.is_current) || null
  }
  loading.value = false
}

async function startFoodUsagePeriod({ pet_id, product_id, product_version_id, start_date, daily_amount, feeding_frequency }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'startFoodUsagePeriod')

  // 结束当前周期
  if (currentPeriod.value) {
    await supabase
      .from('food_usage_periods')
      .update({ is_current: false, end_date: new Date().toISOString().split('T')[0] })
      .eq('id', currentPeriod.value.id)
  }

  const { data, error } = await supabase
    .from('food_usage_periods')
    .insert({
      pet_id,
      product_id,
      product_version_id,
      profile_id: uid,
      start_date: start_date || new Date().toISOString().split('T')[0],
      daily_amount,
      feeding_frequency,
      is_current: true
    })
    .select('*, products(name, brand, image_url)')
    .single()

  if (error) throw normalizeError(error, 'startFoodUsagePeriod')

  // 更新本地状态
  foodUsagePeriods.value = foodUsagePeriods.value.map(p => ({ ...p, is_current: false }))
  foodUsagePeriods.value = [data, ...foodUsagePeriods.value]
  currentPeriod.value = data
  return data
}

async function endFoodUsagePeriod(id, { end_date, outcome_summary, switch_reason, would_continue, stability_score }) {
  const { data, error } = await supabase
    .from('food_usage_periods')
    .update({
      is_current: false,
      end_date: end_date || new Date().toISOString().split('T')[0],
      outcome_summary,
      switch_reason,
      would_continue,
      stability_score
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw normalizeError(error, 'endFoodUsagePeriod')

  foodUsagePeriods.value = foodUsagePeriods.value.map(p => p.id === id ? data : p)
  if (currentPeriod.value?.id === id) {
    currentPeriod.value = null
  }
  return data
}

async function deleteFoodUsagePeriod(id) {
  const { error } = await supabase.from('food_usage_periods').delete().eq('id', id)
  if (error) throw normalizeError(error, 'deleteFoodUsagePeriod')
  foodUsagePeriods.value = foodUsagePeriods.value.filter(p => p.id !== id)
  if (currentPeriod.value?.id === id) {
    currentPeriod.value = null
  }
}

function calculateUsageDays(period) {
  const start = new Date(period.start_date)
  const end = period.end_date ? new Date(period.end_date) : new Date()
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}

function getUsageSummary(periods) {
  if (!periods.length) return null

  const totalDays = periods.reduce((sum, p) => sum + calculateUsageDays(p), 0)
  const uniqueProducts = new Set(periods.map(p => p.product_id)).size
  const currentPeriodDays = currentPeriod.value ? calculateUsageDays(currentPeriod.value) : 0

  return {
    totalDays,
    uniqueProducts,
    currentPeriodDays,
    totalPeriods: periods.length
  }
}

export function useFoodUsagePeriods() {
  return {
    foodUsagePeriods,
    currentPeriod,
    loading,
    fetchFoodUsagePeriods,
    startFoodUsagePeriod,
    endFoodUsagePeriod,
    deleteFoodUsagePeriod,
    calculateUsageDays,
    getUsageSummary
  }
}
