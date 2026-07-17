<template>
  <div class="app-shell">
    <PageHeader title="喂食历史" />

    <!-- 当前周期 -->
    <div v-if="currentPeriod" class="current-period">
      <div class="period-header">
        <span class="period-label">当前喂食</span>
        <span class="period-days">已喂 {{ calculateUsageDays(currentPeriod) }} 天</span>
      </div>
      <div class="period-product">
        <span class="product-name">{{ currentPeriod.products?.name || '未知产品' }}</span>
        <span class="product-brand">{{ currentPeriod.products?.brand }}</span>
      </div>
      <div class="period-meta">
        <span>开始: {{ formatDate(currentPeriod.start_date) }}</span>
        <span v-if="currentPeriod.daily_amount">日量: {{ currentPeriod.daily_amount }}</span>
      </div>
    </div>

    <!-- 历史列表 -->
    <div class="section-title">历史记录</div>
    <div v-if="foodUsagePeriods.length === 0" class="empty-hint">暂无喂食记录</div>
    <div v-else class="history-list">
      <div v-for="period in foodUsagePeriods" :key="period.id" class="history-item">
        <div class="history-icon">🍽️</div>
        <div class="history-info">
          <div class="history-name">{{ period.products?.name || '未知产品' }}</div>
          <div class="history-date">{{ formatDate(period.start_date) }} - {{ period.end_date ? formatDate(period.end_date) : '至今' }}</div>
        </div>
        <div class="history-duration">{{ calculateUsageDays(period) }}天</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFoodUsagePeriods } from '../composables/useFoodUsagePeriods'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { foodUsagePeriods, currentPeriod, loading, fetchFoodUsagePeriods, calculateUsageDays } = useFoodUsagePeriods()

onMounted(() => {
  if (petId.value) {
    fetchFoodUsagePeriods(petId.value)
  }
})

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.current-period { background: linear-gradient(135deg, #ff6b4a, #ff8a65); border-radius: 16px; padding: 20px; margin: 16px 0; color: #fff; }
.period-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.period-label { font-size: 13px; opacity: 0.8; }
.period-days { font-size: 13px; background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 10px; }
.period-product { margin-bottom: 8px; }
.product-name { font-size: 18px; font-weight: 600; }
.product-brand { font-size: 14px; opacity: 0.8; margin-left: 8px; }
.period-meta { display: flex; gap: 16px; font-size: 13px; opacity: 0.8; }
.section-title { font-size: 15px; font-weight: 600; margin: 20px 0 12px; }
.empty-hint { text-align: center; padding: 40px; color: #999; }
.history-list { background: #fff; border-radius: 12px; overflow: hidden; }
.history-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.history-icon { font-size: 24px; }
.history-info { flex: 1; }
.history-name { font-size: 14px; color: #333; font-weight: 500; }
.history-date { font-size: 12px; color: #999; margin-top: 2px; }
.history-duration { font-size: 13px; color: #666; }
</style>
