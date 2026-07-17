<template>
  <div class="app-shell">
    <PageHeader title="事件存储" />

    <!-- 空状态 -->
    <div v-if="!loading && events.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <p class="empty-text">暂无事件记录</p>
    </div>

    <!-- 事件列表 -->
    <div v-else class="event-list">
      <div v-for="event in events" :key="event.event_id" class="event-card">
        <div class="event-header">
          <span class="event-type">{{ event.event_type }}</span>
          <span class="event-seq">#{{ event.global_sequence }}</span>
        </div>
        <div class="event-meta">
          <span>{{ event.aggregate_type }}</span>
          <span>{{ formatDate(event.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useEventStore } from '../composables/useEventStore'
import PageHeader from '../components/PageHeader.vue'

const { events, loading, fetchEvents } = useEventStore()

onMounted(() => {
  fetchEvents({ limit: 50 })
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
.event-list { padding: 16px 0; }
.event-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.event-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.event-type { font-size: 14px; font-weight: 500; color: #333; }
.event-seq { font-size: 12px; color: #999; }
.event-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
</style>
