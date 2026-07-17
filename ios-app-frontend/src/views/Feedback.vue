<template>
  <div class="app-shell">
    <PageHeader title="反馈历史" />

    <!-- 空状态 -->
    <div v-if="!loading && feedbackEvents.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <p class="empty-text">暂无反馈记录</p>
    </div>

    <!-- 反馈列表 -->
    <div v-else class="feedback-list">
      <div v-for="event in feedbackEvents" :key="event.id" class="feedback-item">
        <span class="feedback-icon">{{ getEventIcon(event.event_type) }}</span>
        <div class="feedback-info">
          <div class="feedback-type">{{ getEventLabel(event.event_type) }}</div>
          <div class="feedback-date">{{ formatDate(event.created_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFeedbackEvents } from '../composables/useFeedbackEvents'
import PageHeader from '../components/PageHeader.vue'

const { feedbackEvents, loading, fetchFeedbackEvents } = useFeedbackEvents()

onMounted(() => {
  fetchFeedbackEvents()
})

function getEventIcon(type) {
  const icons = { product_view: '👀', product_bookmark: '⭐', recommendation_click: '🎯', recommendation_accept: '✓', recommendation_reject: '✗' }
  return icons[type] || '📌'
}

function getEventLabel(type) {
  const labels = { product_view: '浏览产品', product_bookmark: '收藏产品', recommendation_click: '点击推荐', recommendation_accept: '采纳推荐', recommendation_reject: '拒绝推荐' }
  return labels[type] || type
}

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
.feedback-list { padding: 16px 0; background: #fff; border-radius: 12px; }
.feedback-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.feedback-icon { font-size: 20px; }
.feedback-info { flex: 1; }
.feedback-type { font-size: 14px; color: #333; }
.feedback-date { font-size: 12px; color: #999; }
</style>
