<template>
  <div class="app-shell">
    <PageHeader title="健康指标" />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="metric-card skeleton" v-for="i in 4" :key="i">
        <div class="shimmer-line w40"></div>
        <div class="shimmer-line w60"></div>
      </div>
    </div>

    <!-- 指标概览 -->
    <div v-else class="metrics-container">
      <!-- 综合评分 -->
      <div class="overall-score" v-if="overallScore">
        <div class="score-ring">
          <span class="score-value">{{ overallScore }}</span>
          <span class="score-label">综合评分</span>
        </div>
        <div class="score-trend" :class="trendClass">
          {{ trendLabel }}
        </div>
      </div>

      <!-- 指标卡片 -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background: #e8f5e9;">🍽️</div>
          <div class="metric-info">
            <div class="metric-label">食欲</div>
            <div class="metric-value">{{ latestMetrics?.appetite_score || '-' }}</div>
          </div>
          <div class="metric-trend" :class="getTrend('appetite_score')">
            {{ getTrendIcon('appetite_score') }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #e3f2fd;">🏃</div>
          <div class="metric-info">
            <div class="metric-label">活动量</div>
            <div class="metric-value">{{ latestMetrics?.activity_score || '-' }}</div>
          </div>
          <div class="metric-trend" :class="getTrend('activity_score')">
            {{ getTrendIcon('activity_score') }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #fff3e0;">💩</div>
          <div class="metric-info">
            <div class="metric-label">排便</div>
            <div class="metric-value">{{ latestMetrics?.stool_score || '-' }}</div>
          </div>
          <div class="metric-trend" :class="getTrend('stool_score')">
            {{ getTrendIcon('stool_score') }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #fce4ec;">💊</div>
          <div class="metric-info">
            <div class="metric-label">症状</div>
            <div class="metric-value">{{ latestMetrics?.symptom_severity_score || '-' }}</div>
          </div>
          <div class="metric-trend" :class="getTrend('symptom_severity_score')">
            {{ getTrendIcon('symptom_severity_score') }}
          </div>
        </div>
      </div>

      <!-- 最近记录 -->
      <div class="section-header">最近记录</div>
      <div v-if="healthMetrics.length === 0" class="empty-hint">暂无记录</div>
      <div v-else class="history-list">
        <div v-for="metric in healthMetrics.slice(0, 7)" :key="metric.id" class="history-item">
          <span class="history-date">{{ formatDate(metric.date) }}</span>
          <span class="history-scores">
            食{{ metric.appetite_score || '-' }} |
            动{{ metric.activity_score || '-' }} |
            便{{ metric.stool_score || '-' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHealthMetrics } from '../composables/useHealthMetrics'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { healthMetrics, latestMetrics, loading, fetchHealthMetrics, getMetricTrend, calculateOverallScore } = useHealthMetrics()

const overallScore = computed(() => calculateOverallScore(latestMetrics.value))
const trendClass = computed(() => 'trend-stable')
const trendLabel = computed(() => '稳定')

onMounted(() => {
  if (petId.value) {
    fetchHealthMetrics(petId.value, 30)
  }
})

function getTrend(metricName) {
  const trend = getMetricTrend(metricName, 7)
  if (trend === 'improving') return 'trend-up'
  if (trend === 'declining') return 'trend-down'
  return 'trend-stable'
}

function getTrendIcon(metricName) {
  const trend = getMetricTrend(metricName, 7)
  if (trend === 'improving') return '↑'
  if (trend === 'declining') return '↓'
  return '→'
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.metrics-container { padding: 16px 0; }
.overall-score { display: flex; align-items: center; justify-content: center; gap: 16px; background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
.score-ring { text-align: center; }
.score-value { display: block; font-size: 48px; font-weight: 600; color: #ff6b4a; }
.score-label { font-size: 13px; color: #999; }
.score-trend { font-size: 14px; padding: 4px 12px; border-radius: 12px; }
.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
.metric-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; }
.metric-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.metric-info { flex: 1; }
.metric-label { font-size: 12px; color: #999; }
.metric-value { font-size: 20px; font-weight: 600; color: #333; }
.metric-trend { font-size: 16px; font-weight: 600; }
.trend-up { color: #4caf50; }
.trend-down { color: #f44336; }
.trend-stable { color: #999; }
.section-header { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px; }
.history-list { background: #fff; border-radius: 12px; overflow: hidden; }
.history-item { display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.history-date { font-size: 14px; color: #666; }
.history-scores { font-size: 13px; color: #999; }
.empty-hint { text-align: center; padding: 40px; color: #999; }
</style>
