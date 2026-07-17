import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const ingredients = shallowRef([])
const productVersions = shallowRef([])
const loading = ref(false)

async function fetchIngredients(productId) {
  loading.value = true

  const { data, error } = await supabase
    .from('product_ingredients')
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true })

  if (error) {
    console.warn('[useProductIngredients] fetch error:', error.message)
    ingredients.value = []
  } else {
    ingredients.value = data || []
  }
  loading.value = false
}

async function fetchProductVersions(productId) {
  const { data, error } = await supabase
    .from('product_versions')
    .select('*')
    .eq('product_id', productId)
    .order('effective_date', { ascending: false })

  if (error) {
    console.warn('[useProductIngredients] fetchVersions error:', error.message)
    productVersions.value = []
  } else {
    productVersions.value = data || []
  }
}

function getIngredientTypeLabel(type) {
  const labels = {
    protein: '蛋白质',
    carbohydrate: '碳水化合物',
    fat: '脂肪',
    fiber: '纤维',
    vitamin: '维生素',
    mineral: '矿物质',
    preservative: '防腐剂',
    additive: '添加剂'
  }
  return labels[type] || type || '其他'
}

function getIngredientTypeColor(type) {
  const colors = {
    protein: '#E85D4A',
    carbohydrate: '#E8A87C',
    fat: '#F0C040',
    fiber: '#A8C5A0',
    vitamin: '#79C0FF',
    mineral: '#D2A8FF',
    preservative: '#8B949E',
    additive: '#8B949E'
  }
  return colors[type] || '#8B949E'
}

function calculateNutritionSummary(ingredientList) {
  const summary = {
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
    totalFiber: 0,
    ingredientCount: ingredientList.length,
    hasNovelProtein: false,
    isGrainFree: true
  }

  for (const ing of ingredientList) {
    const pct = ing.percentage || 0
    switch (ing.ingredient_type) {
      case 'protein':
        summary.totalProtein += pct
        if (ing.is_novel_protein) summary.hasNovelProtein = true
        break
      case 'carbohydrate':
        summary.totalCarbs += pct
        break
      case 'fat':
        summary.totalFat += pct
        break
      case 'fiber':
        summary.totalFiber += pct
        break
    }
    if (!ing.is_grain_free) summary.isGrainFree = false
  }

  return summary
}

function compareVersions(version1, version2) {
  if (!version1?.nutrition_snapshot || !version2?.nutrition_snapshot) return null

  const v1 = version1.nutrition_snapshot
  const v2 = version2.nutrition_snapshot

  return {
    protein: { old: v1.protein, new: v2.protein, diff: v2.protein - v1.protein },
    fat: { old: v1.fat, new: v2.fat, diff: v2.fat - v1.fat },
    fiber: { old: v1.fiber, new: v2.fiber, diff: v2.fiber - v1.fiber },
    moisture: { old: v1.moisture, new: v2.moisture, diff: v2.moisture - v1.moisture }
  }
}

export function useProductIngredients() {
  return {
    ingredients,
    productVersions,
    loading,
    fetchIngredients,
    fetchProductVersions,
    getIngredientTypeLabel,
    getIngredientTypeColor,
    calculateNutritionSummary,
    compareVersions
  }
}
