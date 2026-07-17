<template>
  <div class="app-shell">
    <PageHeader title="推荐追踪" />

    <!-- 空状态 -->
    <div v-if="!loading && traceLogs.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">暂无追踪记录</p>
    </div>

    <!-- 追踪列表 -->
    <div v-else class="trace-list">
      <div v-for="log in traceLogs" :key="log.id" class="trace-card">
        <div class="trace-header">
          <span class="trace-date">{{ formatDate(log.created_at) }}</span>
          <span class="trace-model">{{ log.model_version }}</span>
        </div>
        <div class="trace-sources">
          <span v-for="src in log.data_sources" :key="src" class="source-tag">{{ src }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useRecommendationTrace } from '../composables/useRecommendationTrace'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { traceLogs, loading, fetchTraceLogs } = useRecommendationTrace()

onMounted(() => {
  if (petId.value) fetchTraceLogs(petId.value)
})

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.trace-list { padding: 16px 0; }
.trace-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.trace-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.trace-date { font-size: 14px; color: #333; }
.trace-model { font-size: 12px; color: #999; background: #f5f5f5; padding: 2px 8px; border-radius: 8px; }
.trace-sources { display: flex; flex-wrap: wrap; gap: 8px; }
.source-tag { font-size: 11px; padding: 4px 10px; border-radius: 10px; background: #e3f2fd; color: #1976d2; }
</style>
