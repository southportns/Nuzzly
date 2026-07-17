<template>
  <div class="app-shell">
    <PageHeader
      title="过敏管理"
      :action-text="'添加'"
      @action="showAddSheet = true"
    />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="allergy-row skeleton" v-for="i in 3" :key="i">
        <div class="shimmer-circle"></div>
        <div class="shimmer-line w60"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="allergies.length === 0" class="empty-state">
      <div class="empty-icon">🛡️</div>
      <p class="empty-text">暂无过敏记录</p>
      <p class="empty-hint">添加过敏原可以帮助系统避开相关成分</p>
    </div>

    <!-- 过敏原列表 -->
    <div v-else class="allergy-list">
      <div
        v-for="allergy in allergies"
        :key="allergy.id"
        class="allergy-card"
      >
        <div class="allergy-icon" :class="getSeverityClass(allergy.severity)">
          {{ getSeverityIcon(allergy.severity) }}
        </div>
        <div class="allergy-info">
          <div class="allergy-name">{{ allergy.allergen }}</div>
          <div class="allergy-meta">
            <span class="severity-tag" :class="getSeverityClass(allergy.severity)">
              {{ getSeverityLabel(allergy.severity) }}
            </span>
            <span v-if="allergy.confirmed" class="confirmed-tag">已确认</span>
          </div>
        </div>
        <button class="delete-btn" @click="handleDelete(allergy)">×</button>
      </div>
    </div>

    <!-- 添加弹窗 -->
    <div v-if="showAddSheet" class="sheet-overlay" @click.self="showAddSheet = false">
      <div class="sheet-content">
        <div class="sheet-header">
          <span class="sheet-title">添加过敏原</span>
          <button class="sheet-close" @click="showAddSheet = false">×</button>
        </div>
        <div class="sheet-body">
          <div class="form-group">
            <label class="form-label">过敏原名称</label>
            <input
              v-model="newAllergen"
              class="form-input"
              placeholder="例如：鸡肉、谷物、海鲜"
            />
          </div>
          <div class="form-group">
            <label class="form-label">严重程度</label>
            <div class="severity-options">
              <button
                v-for="opt in severityOptions"
                :key="opt.value"
                class="severity-btn"
                :class="{ active: newSeverity === opt.value }"
                @click="newSeverity = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">确认状态</label>
            <div class="toggle-row">
              <span>已确认</span>
              <button
                class="toggle-btn"
                :class="{ active: newConfirmed }"
                @click="newConfirmed = !newConfirmed"
              >
                <span class="toggle-dot"></span>
              </button>
            </div>
          </div>
        </div>
        <div class="sheet-footer">
          <button class="btn-cancel" @click="showAddSheet = false">取消</button>
          <button
            class="btn-confirm"
            :disabled="!newAllergen.trim()"
            @click="handleAdd"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAllergies } from '../composables/useAllergies'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { allergies, loading, fetchAllergies, addAllergy, deleteAllergy, getSeverityLabel } = useAllergies()

const showAddSheet = ref(false)
const newAllergen = ref('')
const newSeverity = ref('mild')
const newConfirmed = ref(false)

const severityOptions = [
  { value: 'mild', label: '轻微' },
  { value: 'moderate', label: '中度' },
  { value: 'severe', label: '严重' },
]

onMounted(() => {
  if (petId.value) {
    fetchAllergies(petId.value)
  }
})

function getSeverityClass(severity) {
  const classes = { mild: 'severity-mild', moderate: 'severity-moderate', severe: 'severity-severe' }
  return classes[severity] || 'severity-mild'
}

function getSeverityIcon(severity) {
  const icons = { mild: '⚠️', moderate: '🔶', severe: '🔴' }
  return icons[severity] || '⚠️'
}

async function handleAdd() {
  if (!newAllergen.value.trim()) return
  try {
    await addAllergy({
      pet_id: petId.value,
      allergen: newAllergen.value.trim(),
      severity: newSeverity.value,
      confirmed: newConfirmed.value,
    })
    showAddSheet.value = false
    newAllergen.value = ''
    newSeverity.value = 'mild'
    newConfirmed.value = false
  } catch (e) {
    console.error(e)
  }
}

async function handleDelete(allergy) {
  if (confirm(`确定删除过敏原"${allergy.allergen}"吗？`)) {
    await deleteAllergy(allergy.id, allergy.confirmed)
  }
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #999; }
.allergy-list { padding: 16px 0; }
.allergy-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 8px; }
.allergy-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.severity-mild { background: #e8f5e9; }
.severity-moderate { background: #fff3e0; }
.severity-severe { background: #ffebee; }
.allergy-info { flex: 1; }
.allergy-name { font-size: 15px; font-weight: 500; color: #333; }
.allergy-meta { display: flex; gap: 8px; margin-top: 4px; }
.severity-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.confirmed-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #e3f2fd; color: #1976d2; }
.delete-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: #f5f5f5; color: #999; font-size: 18px; cursor: pointer; }
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet-content { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sheet-title { font-size: 17px; font-weight: 600; }
.sheet-close { width: 28px; height: 28px; border: none; background: #f5f5f5; border-radius: 50%; font-size: 18px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 15px; }
.severity-options { display: flex; gap: 8px; }
.severity-btn { flex: 1; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 14px; }
.severity-btn.active { background: #ff6b4a; color: #fff; border-color: #ff6b4a; }
.toggle-row { display: flex; justify-content: space-between; align-items: center; }
.toggle-btn { width: 48px; height: 28px; border-radius: 14px; border: none; background: #e0e0e0; position: relative; transition: background 0.3s; }
.toggle-btn.active { background: #ff6b4a; }
.toggle-dot { position: absolute; top: 2px; left: 2px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: transform 0.3s; }
.toggle-btn.active .toggle-dot { transform: translateX(20px); }
.sheet-footer { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel { flex: 1; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 15px; }
.btn-confirm { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #ff6b4a; color: #fff; font-size: 15px; }
.btn-confirm:disabled { opacity: 0.5; }
</style>
