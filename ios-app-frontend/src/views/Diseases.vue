<template>
  <div class="app-shell">
    <PageHeader title="疾病记录" :action-text="'添加'" @action="showAddSheet = true" />

    <!-- 统计卡片 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-card">
        <div class="stat-value" style="color: #ff9500;">{{ activeDiseases.length }}</div>
        <div class="stat-label">进行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #585858;">{{ chronicDiseases.length }}</div>
        <div class="stat-label">慢性病</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #34c759;">{{ resolvedDiseases.length }}</div>
        <div class="stat-label">已康复</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && diseaseRecords.length === 0" class="empty-state">
      <div class="empty-icon">🏥</div>
      <p class="empty-text">暂无疾病记录</p>
    </div>

    <!-- 记录列表 -->
    <div v-else class="record-list">
      <div v-for="record in diseaseRecords" :key="record.id" class="record-card">
        <div class="record-icon" :class="'severity-' + record.severity">🏥</div>
        <div class="record-info">
          <div class="record-name">{{ record.name }}</div>
          <div class="record-meta">
            <span class="status-tag" :class="'status-' + record.status">{{ getStatusLabel(record.status) }}</span>
            <span class="severity-tag">{{ getSeverityLabel(record.severity) }}</span>
          </div>
        </div>
        <div class="record-date">{{ formatDate(record.diagnosed_on) }}</div>
      </div>
    </div>

    <!-- 添加弹窗 -->
    <div v-if="showAddSheet" class="sheet-overlay" @click.self="showAddSheet = false">
      <div class="sheet-content">
        <div class="sheet-header">
          <span class="sheet-title">添加疾病记录</span>
          <button class="sheet-close" @click="showAddSheet = false">×</button>
        </div>
        <div class="sheet-body">
          <div class="form-group">
            <label class="form-label">疾病名称</label>
            <input v-model="newName" class="form-input" placeholder="例如：感冒、肠胃炎" />
          </div>
          <div class="form-group">
            <label class="form-label">严重程度</label>
            <div class="severity-options">
              <button v-for="opt in severityOptions" :key="opt.value" class="severity-btn" :class="{ active: newSeverity === opt.value }" @click="newSeverity = opt.value">
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">当前状态</label>
            <div class="status-options">
              <button v-for="opt in statusOptions" :key="opt.value" class="status-btn" :class="{ active: newStatus === opt.value }" @click="newStatus = opt.value">
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="sheet-footer">
          <button class="btn-cancel" @click="showAddSheet = false">取消</button>
          <button class="btn-confirm" :disabled="!newName.trim()" @click="handleAdd">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDiseaseRecords } from '../composables/useDiseaseRecords'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { diseaseRecords, loading, fetchDiseaseRecords, createDiseaseRecord, getSeverityLabel, getStatusLabel } = useDiseaseRecords()

const showAddSheet = ref(false)
const newName = ref('')
const newSeverity = ref('mild')
const newStatus = ref('active')

const severityOptions = [
  { value: 'mild', label: '轻微' },
  { value: 'moderate', label: '中度' },
  { value: 'severe', label: '严重' },
]

const statusOptions = [
  { value: 'active', label: '进行中' },
  { value: 'under_treatment', label: '治疗中' },
  { value: 'chronic', label: '慢性病' },
  { value: 'resolved', label: '已康复' },
]

const activeDiseases = computed(() => diseaseRecords.value.filter(d => d.status === 'active' || d.status === 'under_treatment'))
const chronicDiseases = computed(() => diseaseRecords.value.filter(d => d.status === 'chronic'))
const resolvedDiseases = computed(() => diseaseRecords.value.filter(d => d.status === 'resolved'))

onMounted(() => {
  if (petId.value) fetchDiseaseRecords(petId.value)
})

async function handleAdd() {
  if (!newName.value.trim()) return
  try {
    await createDiseaseRecord({ pet_id: petId.value, name: newName.value.trim(), severity: newSeverity.value, status: newStatus.value })
    showAddSheet.value = false
    newName.value = ''
    newSeverity.value = 'mild'
    newStatus.value = 'active'
  } catch (e) { console.error(e) }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
.stat-card { background: #fff; border-radius: 12px; padding: 16px; text-align: center; }
.stat-value { font-size: 28px; font-weight: 600; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.record-list { padding: 16px 0; }
.record-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 8px; }
.record-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: #f5f5f5; }
.record-info { flex: 1; }
.record-name { font-size: 15px; font-weight: 500; color: #333; }
.record-meta { display: flex; gap: 8px; margin-top: 4px; }
.status-tag, .severity-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.status-active { background: #fff3e0; color: #f57c00; }
.status-under_treatment { background: #e3f2fd; color: #1976d2; }
.status-chronic { background: #f5f5f5; color: #666; }
.status-resolved { background: #e8f5e9; color: #2e7d32; }
.record-date { font-size: 13px; color: #999; }
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet-content { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sheet-title { font-size: 17px; font-weight: 600; }
.sheet-close { width: 28px; height: 28px; border: none; background: #f5f5f5; border-radius: 50%; font-size: 18px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 15px; }
.severity-options, .status-options { display: flex; flex-wrap: wrap; gap: 8px; }
.severity-btn, .status-btn { padding: 8px 16px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 13px; }
.severity-btn.active, .status-btn.active { background: #ff6b4a; color: #fff; border-color: #ff6b4a; }
.sheet-footer { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel { flex: 1; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 15px; }
.btn-confirm { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #ff6b4a; color: #fff; font-size: 15px; }
.btn-confirm:disabled { opacity: 0.5; }
</style>
