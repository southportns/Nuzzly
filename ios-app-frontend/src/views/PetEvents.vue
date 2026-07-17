<template>
  <div class="app-shell">
    <PageHeader title="宠物事件" :action-text="'记录'" @action="showAddSheet = true" />

    <!-- 事件类型统计 -->
    <div class="type-stats" v-if="!loading">
      <div class="type-item">
        <span class="type-icon">🏥</span>
        <span class="type-count">{{ eventTypeCounts.symptom || 0 }}</span>
      </div>
      <div class="type-item">
        <span class="type-icon">💊</span>
        <span class="type-count">{{ eventTypeCounts.medication || 0 }}</span>
      </div>
      <div class="type-item">
        <span class="type-icon">👨‍⚕️</span>
        <span class="type-count">{{ eventTypeCounts.vet_visit || 0 }}</span>
      </div>
      <div class="type-item">
        <span class="type-icon">💉</span>
        <span class="type-count">{{ eventTypeCounts.vaccination || 0 }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && petEvents.length === 0" class="empty-state">
      <div class="empty-icon">📅</div>
      <p class="empty-text">暂无事件记录</p>
    </div>

    <!-- 事件时间线 -->
    <div v-else class="timeline">
      <div v-for="(events, date) in groupedEvents" :key="date" class="timeline-group">
        <div class="timeline-date">{{ formatDate(date) }}</div>
        <div v-for="event in events" :key="event.id" class="timeline-item">
          <div class="timeline-dot" :class="'type-' + event.event_type"></div>
          <div class="timeline-content">
            <div class="event-type">{{ getTypeLabel(event.event_type) }}</div>
            <div class="event-notes" v-if="event.notes">{{ event.notes }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加弹窗 -->
    <div v-if="showAddSheet" class="sheet-overlay" @click.self="showAddSheet = false">
      <div class="sheet-content">
        <div class="sheet-header">
          <span class="sheet-title">记录事件</span>
          <button class="sheet-close" @click="showAddSheet = false">×</button>
        </div>
        <div class="sheet-body">
          <div class="form-group">
            <label class="form-label">事件类型</label>
            <div class="type-options">
              <button v-for="opt in eventTypeOptions" :key="opt.value" class="type-btn" :class="{ active: newType === opt.value }" @click="newType = opt.value">
                <span>{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="newNotes" class="form-textarea" placeholder="记录事件详情..."></textarea>
          </div>
        </div>
        <div class="sheet-footer">
          <button class="btn-cancel" @click="showAddSheet = false">取消</button>
          <button class="btn-confirm" @click="handleAdd">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePetEvents } from '../composables/usePetEvents'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { petEvents, loading, fetchPetEvents, createPetEvent, getEventTypeLabel, groupEventsByDate } = usePetEvents()

const showAddSheet = ref(false)
const newType = ref('symptom')
const newNotes = ref('')

const eventTypeOptions = [
  { value: 'symptom', label: '症状', icon: '🏥' },
  { value: 'medication', label: '用药', icon: '💊' },
  { value: 'vet_visit', label: '就诊', icon: '👨‍⚕️' },
  { value: 'vaccination', label: '疫苗', icon: '💉' },
  { value: 'other', label: '其他', icon: '📝' },
]

const groupedEvents = computed(() => groupEventsByDate(petEvents.value))
const eventTypeCounts = computed(() => {
  const counts = {}
  for (const e of petEvents.value) {
    counts[e.event_type] = (counts[e.event_type] || 0) + 1
  }
  return counts
})

onMounted(() => {
  if (petId.value) fetchPetEvents(petId.value)
})

function getTypeLabel(type) { return getEventTypeLabel(type) }

async function handleAdd() {
  try {
    await createPetEvent({ pet_id: petId.value, event_type: newType.value, notes: newNotes.value.trim() || null })
    showAddSheet.value = false
    newNotes.value = ''
  } catch (e) { console.error(e) }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return '今天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.type-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
.type-item { background: #fff; border-radius: 12px; padding: 12px; text-align: center; }
.type-icon { font-size: 24px; display: block; margin-bottom: 4px; }
.type-count { font-size: 18px; font-weight: 600; color: #333; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.timeline { padding: 16px 0; }
.timeline-group { margin-bottom: 20px; }
.timeline-date { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }
.timeline-item { display: flex; gap: 12px; margin-bottom: 12px; }
.timeline-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 4px; }
.type-symptom { background: #ff3b30; }
.type-medication { background: #007aff; }
.type-vet_visit { background: #34c759; }
.type-vaccination { background: #5856d6; }
.type-other { background: #999; }
.timeline-content { flex: 1; background: #fff; border-radius: 12px; padding: 12px; }
.event-type { font-size: 14px; font-weight: 500; color: #333; }
.event-notes { font-size: 13px; color: #666; margin-top: 4px; }
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet-content { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sheet-title { font-size: 17px; font-weight: 600; }
.sheet-close { width: 28px; height: 28px; border: none; background: #f5f5f5; border-radius: 50%; font-size: 18px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
.type-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.type-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px; border: 1px solid #e0e0e0; border-radius: 12px; background: #fff; font-size: 12px; }
.type-btn.active { background: #ff6b4a; color: #fff; border-color: #ff6b4a; }
.form-textarea { width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 15px; min-height: 80px; resize: none; }
.sheet-footer { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel { flex: 1; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 15px; }
.btn-confirm { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #ff6b4a; color: #fff; font-size: 15px; }
</style>
