<template>
  <div class="app-shell">
    <PageHeader title="用药记录" :action-text="'添加'" @action="showAddSheet = true" />

    <!-- 统计卡片 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-card">
        <div class="stat-value" style="color: #ff6b4a;">{{ ongoingMedications.length }}</div>
        <div class="stat-label">持续用药</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #34c759;">{{ completedMedications.length }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #666;">{{ medicationRecords.length }}</div>
        <div class="stat-label">总记录</div>
      </div>
    </div>

    <!-- 当前用药 -->
    <div v-if="ongoingMedications.length > 0" class="section">
      <div class="section-title">当前用药</div>
      <div class="medication-list">
        <div v-for="med in ongoingMedications" :key="med.id" class="medication-card ongoing">
          <div class="med-icon">💊</div>
          <div class="med-info">
            <div class="med-name">{{ med.name }}</div>
            <div class="med-meta">{{ med.dosage }} · {{ getFrequencyLabel(med.frequency) }}</div>
          </div>
          <button class="stop-btn" @click="handleStop(med)">停止</button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && medicationRecords.length === 0" class="empty-state">
      <div class="empty-icon">💊</div>
      <p class="empty-text">暂无用药记录</p>
    </div>

    <!-- 历史记录 -->
    <div v-else class="section">
      <div class="section-title">用药历史</div>
      <div class="medication-list">
        <div v-for="med in medicationRecords" :key="med.id" class="medication-card">
          <div class="med-icon" :class="{ completed: !med.is_ongoing }">💊</div>
          <div class="med-info">
            <div class="med-name">{{ med.name }}</div>
            <div class="med-meta">{{ med.dosage }} · {{ getFrequencyLabel(med.frequency) }}</div>
          </div>
          <div class="med-status" :class="{ ongoing: med.is_ongoing }">
            {{ med.is_ongoing ? '进行中' : '已完成' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 添加弹窗 -->
    <div v-if="showAddSheet" class="sheet-overlay" @click.self="showAddSheet = false">
      <div class="sheet-content">
        <div class="sheet-header">
          <span class="sheet-title">添加用药记录</span>
          <button class="sheet-close" @click="showAddSheet = false">×</button>
        </div>
        <div class="sheet-body">
          <div class="form-group">
            <label class="form-label">药物名称</label>
            <input v-model="newName" class="form-input" placeholder="例如：驱虫药、维生素" />
          </div>
          <div class="form-group">
            <label class="form-label">剂量</label>
            <input v-model="newDosage" class="form-input" placeholder="例如：1片、5ml" />
          </div>
          <div class="form-group">
            <label class="form-label">服用频率</label>
            <select v-model="newFrequency" class="form-select">
              <option value="once_daily">每日一次</option>
              <option value="twice_daily">每日两次</option>
              <option value="three_times_daily">每日三次</option>
              <option value="weekly">每周一次</option>
              <option value="as_needed">按需服用</option>
            </select>
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
import { useMedicationRecords } from '../composables/useMedicationRecords'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { medicationRecords, loading, fetchMedicationRecords, createMedicationRecord, stopMedication, getFrequencyLabel } = useMedicationRecords()

const showAddSheet = ref(false)
const newName = ref('')
const newDosage = ref('')
const newFrequency = ref('once_daily')

const ongoingMedications = computed(() => medicationRecords.value.filter(m => m.is_ongoing))
const completedMedications = computed(() => medicationRecords.value.filter(m => !m.is_ongoing))

onMounted(() => {
  if (petId.value) fetchMedicationRecords(petId.value)
})

async function handleAdd() {
  if (!newName.value.trim()) return
  try {
    await createMedicationRecord({ pet_id: petId.value, name: newName.value.trim(), dosage: newDosage.value.trim() || null, frequency: newFrequency.value })
    showAddSheet.value = false
    newName.value = ''
    newDosage.value = ''
    newFrequency.value = 'once_daily'
  } catch (e) { console.error(e) }
}

async function handleStop(med) {
  if (confirm(`确定停止"${med.name}"吗？`)) {
    await stopMedication(med.id)
  }
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
.stat-card { background: #fff; border-radius: 12px; padding: 16px; text-align: center; }
.stat-value { font-size: clamp(20px,5.5vw,28px); font-weight: 600; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; }
.section { margin-bottom: 20px; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.medication-list { background: #fff; border-radius: 12px; overflow: hidden; }
.medication-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.medication-card.ongoing { background: #fff5f2; }
.med-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: #f5f5f5; }
.med-icon.completed { opacity: 0.5; }
.med-info { flex: 1; }
.med-name { font-size: 15px; font-weight: 500; color: #333; }
.med-meta { font-size: 12px; color: #999; margin-top: 2px; }
.stop-btn { padding: 6px 12px; border: 1px solid #ff6b4a; border-radius: 6px; background: #fff; color: #ff6b4a; font-size: 12px; }
.med-status { font-size: 12px; color: #999; }
.med-status.ongoing { color: #ff6b4a; }
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet-content { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sheet-title { font-size: 17px; font-weight: 600; }
.sheet-close { width: 28px; height: 28px; border: none; background: #f5f5f5; border-radius: 50%; font-size: 18px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
.form-input, .form-select { width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 15px; }
.sheet-footer { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel { flex: 1; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 15px; }
.btn-confirm { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #ff6b4a; color: #fff; font-size: 15px; }
.btn-confirm:disabled { opacity: 0.5; }
</style>
