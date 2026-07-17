<template>
  <div class="app-shell">
    <PageHeader title="AI洞察" />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="insight-skeleton skeleton" v-for="i in 3" :key="i">
        <div class="shimmer-line w60"></div>
        <div class="shimmer-line w80"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="insights.length === 0" class="empty-state">
      <div class="empty-icon">💡</div>
      <p class="empty-text">暂无AI洞察</p>
      <p class="empty-hint">系统会根据您的数据生成个性化洞察</p>
    </div>

    <!-- 洞察列表 -->
    <div v-else class="insight-list">
      <div v-for="insight in insights" :key="insight.id" class="insight-card">
        <div class="insight-header">
          <span class="insight-icon">{{ getInsightTypeIcon(insight.insight_type) }}</span>
          <span class="insight-type" :style="{ color: getInsightTypeColor(insight.insight_type) }">
            {{ getInsightTypeLabel(insight.insight_type) }}
          </span>
          <span class="insight-date">{{ formatDate(insight.created_at) }}</span>
        </div>
        <div class="insight-title">{{ insight.title || '洞察' }}</div>
        <div class="insight-summary">{{ insight.summary }}</div>
        <div v-if="insight.confidence_score" class="insight-confidence">
          置信度: {{ (insight.confidence_score * 100).toFixed(0) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAIInsights } from '../composables/useAIInsights'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const productId = ref(route.query.product || '')

const { insights, loading, fetchInsights, getInsightTypeLabel, getInsightTypeIcon, getInsightTypeColor } = useAIInsights()

onMounted(() => {
  fetchInsights(productId.value || undefined)
})

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #999; }
.insight-list { padding: 16px 0; }
.insight-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.insight-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.insight-icon { font-size: 20px; }
.insight-type { font-size: 13px; font-weight: 500; }
.insight-date { margin-left: auto; font-size: 12px; color: #999; }
.insight-title { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px; }
.insight-summary { font-size: 14px; color: #666; line-height: 1.6; }
.insight-confidence { margin-top: 8px; font-size: 12px; color: #999; }
</style>
