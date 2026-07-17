<template>
  <div class="app-shell">
    <PageHeader title="AI健康报告" />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="report-skeleton skeleton">
        <div class="shimmer-line w40"></div>
        <div class="shimmer-line w80"></div>
        <div class="shimmer-line w60"></div>
      </div>
    </div>

    <!-- 生成按钮 -->
    <div v-if="!loading && healthReports.length === 0" class="empty-state">
      <div class="empty-icon">🤖</div>
      <p class="empty-text">暂无健康报告</p>
      <p class="empty-hint">AI会根据宠物的健康数据生成个性化报告</p>
      <button class="generate-btn" :disabled="generating" @click="handleGenerate">
        {{ generating ? '生成中...' : '生成报告' }}
      </button>
    </div>

    <!-- 报告列表 -->
    <div v-else class="report-list">
      <button class="generate-btn" :disabled="generating" @click="handleGenerate">
        {{ generating ? '生成中...' : '生成新报告' }}
      </button>

      <div v-for="report in healthReports" :key="report.id" class="report-card">
        <div class="report-header">
          <span class="report-date">{{ formatDate(report.report_date) }}</span>
          <span class="risk-badge" :class="'risk-' + report.risk_level">
            {{ getRiskLabel(report.risk_level) }}
          </span>
        </div>
        <div class="report-summary">{{ report.summary_text }}</div>
        <div v-if="report.recommendations" class="report-recommendations">
          <div class="rec-title">建议：</div>
          <div v-for="(rec, idx) in parseRecommendations(report.recommendations)" :key="idx" class="rec-item">
            • {{ rec }}
          </div>
        </div>
        <div class="report-meta">
          <span>模型: {{ report.model_used || 'AI' }}</span>
          <span>耗时: {{ report.processing_time_ms ? (report.processing_time_ms / 1000).toFixed(1) + 's' : '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAIHealthReports } from '../composables/useAIHealthReports'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { healthReports, loading, generating, fetchHealthReports, generateHealthReport } = useAIHealthReports()

onMounted(() => {
  if (petId.value) {
    fetchHealthReports(petId.value)
  }
})

async function handleGenerate() {
  try {
    await generateHealthReport(petId.value, { name: '宠物' })
  } catch (e) {
    console.error(e)
  }
}

function getRiskLabel(level) {
  const labels = { low: '低风险', medium: '中风险', high: '高风险', critical: '严重' }
  return labels[level] || '未知'
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN')
}

function parseRecommendations(recs) {
  if (Array.isArray(recs)) return recs
  if (typeof recs === 'string') return recs.split('\n').filter(Boolean)
  return []
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #999; margin-bottom: 20px; }
.generate-btn { width: 100%; padding: 14px; background: #ff6b4a; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 500; margin-bottom: 16px; }
.generate-btn:disabled { opacity: 0.6; }
.report-list { padding: 16px 0; }
.report-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.report-date { font-size: 14px; color: #666; }
.risk-badge { font-size: 12px; padding: 4px 10px; border-radius: 10px; font-weight: 500; }
.risk-low { background: #e8f5e9; color: #2e7d32; }
.risk-medium { background: #fff3e0; color: #f57c00; }
.risk-high { background: #ffebee; color: #c62828; }
.risk-critical { background: #f44336; color: #fff; }
.report-summary { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 12px; }
.report-recommendations { background: #f9f9f9; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.rec-title { font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px; }
.rec-item { font-size: 13px; color: #333; line-height: 1.6; }
.report-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
</style>
