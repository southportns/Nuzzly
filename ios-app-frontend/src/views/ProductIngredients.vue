<template>
  <div class="app-shell">
    <PageHeader title="成分分析" />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="ingredient-skeleton skeleton" v-for="i in 5" :key="i">
        <div class="shimmer-line w60"></div>
        <div class="shimmer-line w40"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="ingredients.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <p class="empty-text">暂无成分数据</p>
    </div>

    <!-- 成分列表 -->
    <div v-else class="ingredients-container">
      <!-- 营养摘要 -->
      <div class="nutrition-summary" v-if="summary">
        <div class="summary-title">营养摘要</div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-value">{{ summary.totalProtein }}%</span>
            <span class="summary-label">蛋白质</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ summary.totalFat }}%</span>
            <span class="summary-label">脂肪</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ summary.totalCarbs }}%</span>
            <span class="summary-label">碳水</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ summary.totalFiber }}%</span>
            <span class="summary-label">纤维</span>
          </div>
        </div>
        <div class="summary-tags">
          <span v-if="summary.hasNovelProtein" class="tag tag-novel">新型蛋白</span>
          <span v-if="summary.isGrainFree" class="tag tag-grainfree">无谷</span>
        </div>
      </div>

      <!-- 成分列表 -->
      <div class="section-title">成分列表 ({{ ingredients.length }})</div>
      <div class="ingredient-list">
        <div v-for="ing in ingredients" :key="ing.id" class="ingredient-item">
          <div class="ing-color" :style="{ background: getTypeColor(ing.ingredient_type) }"></div>
          <div class="ing-info">
            <div class="ing-name">{{ ing.ingredient_name }}</div>
            <div class="ing-type">{{ getTypeLabel(ing.ingredient_type) }}</div>
          </div>
          <div class="ing-percent">{{ ing.percentage }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductIngredients } from '../composables/useProductIngredients'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const productId = ref(route.query.product || '')

const { ingredients, loading, fetchIngredients, calculateNutritionSummary, getIngredientTypeLabel, getIngredientTypeColor } = useProductIngredients()

const summary = computed(() => calculateNutritionSummary(ingredients.value))

onMounted(() => {
  if (productId.value) {
    fetchIngredients(productId.value)
  }
})

function getTypeLabel(type) {
  return getIngredientTypeLabel(type)
}

function getTypeColor(type) {
  return getIngredientTypeColor(type)
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.ingredients-container { padding: 16px 0; }
.nutrition-summary { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.summary-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; }
.summary-value { display: block; font-size: 20px; font-weight: 600; color: #ff6b4a; }
.summary-label { font-size: 12px; color: #999; }
.summary-tags { display: flex; gap: 8px; margin-top: 12px; }
.tag { font-size: 11px; padding: 4px 10px; border-radius: 10px; }
.tag-novel { background: #e8f5e9; color: #2e7d32; }
.tag-grainfree { background: #e3f2fd; color: #1976d2; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.ingredient-list { background: #fff; border-radius: 12px; overflow: hidden; }
.ingredient-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.ing-color { width: 4px; height: 32px; border-radius: 2px; }
.ing-info { flex: 1; }
.ing-name { font-size: 14px; color: #333; }
.ing-type { font-size: 12px; color: #999; }
.ing-percent { font-size: 15px; font-weight: 600; color: #333; }
</style>
