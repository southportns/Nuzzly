<template>
  <div class="app-shell">
    <PageHeader title="意向事件" />

    <!-- 空状态 -->
    <div v-if="!loading && intentEvents.length === 0" class="empty-state">
      <div class="empty-icon">🎯</div>
      <p class="empty-text">暂无意向记录</p>
    </div>

    <!-- 意向列表 -->
    <div v-else class="intent-list">
      <div v-for="event in intentEvents" :key="event.id" class="intent-item">
        <span class="intent-icon">{{ getEventIcon(event.event_type) }}</span>
        <div class="intent-info">
          <div class="intent-type">{{ getEventLabel(event.event_type) }}</div>
          <div class="intent-product" v-if="event.products">{{ event.products.name }}</div>
        </div>
        <div class="intent-date">{{ formatDate(event.created_at) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useIntentEvents } from '../composables/useIntentEvents'
import PageHeader from '../components/PageHeader.vue'

const { intentEvents, loading, fetchIntentEvents } = useIntentEvents()

onMounted(() => {
  fetchIntentEvents()
})

function getEventIcon(type) {
  const icons = { purchase_intent: '🛒', repurchase_intent: '🔄', comparison_intent: '⚖️', search_intent: '🔍' }
  return icons[type] || '🎯'
}

function getEventLabel(type) {
  const labels = { purchase_intent: '购买意向', repurchase_intent: '复购意向', comparison_intent: '对比意向', search_intent: '搜索意向' }
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
.intent-list { padding: 16px 0; background: #fff; border-radius: 12px; }
.intent-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.intent-icon { font-size: 20px; }
.intent-info { flex: 1; }
.intent-type { font-size: 14px; color: #333; }
.intent-product { font-size: 12px; color: #999; }
.intent-date { font-size: 12px; color: #999; }
</style>
