<template>
  <div class="app-shell">
    <PageHeader title="每日摘要" />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="summary-skeleton skeleton" v-for="i in 3" :key="i">
        <div class="shimmer-line w40"></div>
        <div class="shimmer-line w80"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="dailySummaries.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">暂无每日摘要</p>
      <p class="empty-hint">系统会自动为您生成每日健康摘要</p>
    </div>

    <!-- 摘要列表 -->
    <div v-else class="summary-list">
      <div v-for="summary in dailySummaries" :key="summary.id" class="summary-card">
        <div class="summary-header">
          <span class="summary-date">{{ formatDate(summary.date) }}</span>
          <span class="risk-badge" :class="'risk-' + summary.risk_level">
            {{ getRiskLabel(summary.risk_level) }}
          </span>
        </div>
        <div class="summary-text">{{ summary.summary_text || '暂无摘要' }}</div>
        <div v-if="summary.anomaly_flags && Object.keys(summary.anomaly_flags).length > 0" class="anomaly-flags">
          <span v-for="(val, key) in summary.anomaly_flags" :key="key" class="anomaly-tag">
            {{ getAnomalyLabel(key) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDailySummary } from '../composables/useDailySummary'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { dailySummaries, loading, fetchDailySummaries } = useDailySummary()

onMounted(() => {
  if (petId.value) {
    fetchDailySummaries(petId.value, 14)
  }
})

function getRiskLabel(level) {
  const labels = { low: '低风险', medium: '中风险', high: '高风险', critical: '严重' }
  return labels[level] || '未知'
}

function getAnomalyLabel(key) {
  const labels = {
    appetite_anomaly: '食欲异常',
    weight_anomaly: '体重异常',
    activity_anomaly: '活动异常',
    stool_anomaly: '排便异常',
  }
  return labels[key] || key
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return '今天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #999; }
.summary-list { padding: 16px 0; }
.summary-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.summary-date { font-size: 16px; font-weight: 600; color: #333; }
.risk-badge { font-size: 12px; padding: 4px 10px; border-radius: 10px; font-weight: 500; }
.risk-low { background: #e8f5e9; color: #2e7d32; }
.risk-medium { background: #fff3e0; color: #f57c00; }
.risk-high { background: #ffebee; color: #c62828; }
.risk-critical { background: #f44336; color: #fff; }
.summary-text { font-size: 14px; color: #333; line-height: 1.6; }
.anomaly-flags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.anomaly-tag { font-size: 11px; padding: 4px 10px; border-radius: 10px; background: #fff3e0; color: #f57c00; }
</style>
