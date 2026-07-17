<template>
  <div class="app-shell">
    <PageHeader title="产品指标" />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="metric-skeleton skeleton" v-for="i in 3" :key="i">
        <div class="shimmer-line w60"></div>
        <div class="shimmer-line w40"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="productMetrics.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <p class="empty-text">暂无产品指标</p>
    </div>

    <!-- 指标列表 -->
    <div v-else class="metrics-list">
      <div v-for="metric in productMetrics" :key="metric.id" class="metric-card">
        <div class="metric-header">
          <span class="metric-date">{{ formatDate(metric.date) }}</span>
          <span class="risk-badge" :class="getRiskClass(metric.risk_score)">
            {{ getRiskLabel(metric.risk_score) }}
          </span>
        </div>
        <div class="metric-grid">
          <div class="metric-item">
            <span class="metric-label">评分</span>
            <span class="metric-value">{{ metric.average_rating || '-' }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">评价数</span>
            <span class="metric-value">{{ metric.review_count || 0 }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">复购率</span>
            <span class="metric-value">{{ metric.repurchase_rate ? metric.repurchase_rate + '%' : '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductMetrics } from '../composables/useProductMetrics'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const productId = ref(route.query.product || '')

const { productMetrics, loading, fetchProductMetrics, getRiskLevel } = useProductMetrics()

onMounted(() => {
  if (productId.value) fetchProductMetrics(productId.value)
})

function getRiskLabel(score) {
  if (score == null) return '-'
  const level = getRiskLevel(score)
  return level.label
}

function getRiskClass(score) {
  if (score == null) return ''
  if (score >= 0.7) return 'risk-high'
  if (score >= 0.4) return 'risk-medium'
  return 'risk-low'
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.metrics-list { padding: 16px 0; }
.metric-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.metric-date { font-size: 14px; color: #666; }
.risk-badge { font-size: 12px; padding: 4px 10px; border-radius: 10px; }
.risk-low { background: #e8f5e9; color: #2e7d32; }
.risk-medium { background: #fff3e0; color: #f57c00; }
.risk-high { background: #ffebee; color: #c62828; }
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
.metric-label { display: block; font-size: 12px; color: #999; }
.metric-value { font-size: 18px; font-weight: 600; color: #333; }
</style>
