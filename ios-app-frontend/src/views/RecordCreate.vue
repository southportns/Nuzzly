<template>
  <div class="edit-shell">
    <PageHeader title="添加记录" action-text="保存" :action-loading="saving" :action-disabled="saving" @action="handleSave" />

    <div class="tab-bar">
      <div v-for="t in TABS" :key="t.value" class="tab-item" :class="{ active: tab === t.value }" @click="tab = t.value">{{ t.label }}</div>
    </div>

    <div class="edit-body">
      <FormField label="选择宠物" required>
        <ChipGroup v-model="form.pet_id" :options="petOptions" />
        <div v-if="!pets.length" class="empty-hint">暂无宠物，请先创建档案</div>
      </FormField>

      <!-- 饮食记录 -->
      <template v-if="tab === 'diet'">
        <FormField v-model="dietForm.food_name" label="食物名称" type="input" placeholder="如：渴望鸡肉猫粮" required />
        <FormField label="食物类型" required>
          <ChipGroup v-model="dietForm.food_type" :options="FOOD_TYPES" />
        </FormField>
        <FormField v-model="dietForm.notes" label="备注（份量/时间等）" type="textarea" :rows="2" placeholder="如：早餐 · 25g" />
        <FormField v-model="dietForm.logged_date" label="日期" type="input" input-type="date" required />
      </template>

      <!-- 健康记录 -->
      <template v-if="tab === 'health'">
        <FormField label="记录类型" required>
          <ChipGroup v-model="healthForm.record_type" :options="RECORD_TYPES" />
        </FormField>
        <FormField label="严重程度" required>
          <ChipGroup v-model="healthForm.severity" :options="SEVERITY" />
        </FormField>
        <FormField v-model="healthForm.record_time" label="时间" type="input" input-type="datetime-local" required />
        <FormField v-model="healthForm.notes" label="详情说明" type="textarea" :rows="3" placeholder="如：猫三联疫苗 · 已完成 · 下次 2026-09" />
      </template>

      <!-- 体重记录 -->
      <template v-if="tab === 'weight'">
        <FormField v-model="weightForm.weight_kg" label="体重（kg）" type="number" :step="0.01" :min="0" placeholder="如：4.8" required />
        <FormField v-model="weightForm.record_time" label="测量时间" type="input" input-type="datetime-local" required />
        <FormField v-model="weightForm.notes" label="备注" type="textarea" :rows="2" placeholder="可选" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { usePets } from '../composables/usePets'
import { useDietLogs } from '../composables/useDietLogs'
import { useHealthRecords } from '../composables/useHealthRecords'
import PageHeader from '../components/PageHeader.vue'
import FormField from '../components/FormField.vue'
import ChipGroup from '../components/ChipGroup.vue'

const route = useRoute()
const router = useRouter()
const { pets, fetchPets, updatePet } = usePets()
const { addDietLog } = useDietLogs()
const { addHealthRecord } = useHealthRecords()
const saving = ref(false)

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }
// 适配 ChipGroup 的 options 格式：[{ value, label, emoji? }]
const petOptions = computed(() => pets.value.map(p => ({
  value: p.id,
  label: p.name,
  emoji: SPECIES_EMOJI[p.species] || '🐾'
})))
const TABS = [
  { value: 'diet', label: '饮食' },
  { value: 'health', label: '健康' },
  { value: 'weight', label: '体重' }
]
const FOOD_TYPES = [
  { value: 'dry_food', label: '干粮', emoji: '🍖' },
  { value: 'wet_food', label: '湿粮', emoji: '🐟' },
  { value: 'water', label: '饮水', emoji: '💧' },
  { value: 'treat', label: '零食', emoji: '🦴' }
]
const RECORD_TYPES = [
  { value: 'vaccination', label: '疫苗', emoji: '💉' },
  { value: 'symptom', label: '症状', emoji: '🩺' },
  { value: 'medication', label: '用药', emoji: '💊' },
  { value: 'diagnosis', label: '诊断', emoji: '📋' },
  { value: 'checkup', label: '体检', emoji: '🩻' }
]
const SEVERITY = [
  { value: 'mild', label: '轻度' },
  { value: 'moderate', label: '中度' },
  { value: 'severe', label: '重度' }
]

const tab = ref(route.query.type === 'health' ? 'health' : route.query.type === 'weight' ? 'weight' : 'diet')

const today = () => new Date().toISOString().slice(0, 10)
const now = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  d.setMinutes(d.getMinutes() - off)
  return d.toISOString().slice(0, 16)
}

const form = reactive({ pet_id: route.query.petId || '' })
const dietForm = reactive({ food_name: '', food_type: 'dry_food', notes: '', logged_date: today() })
const healthForm = reactive({ record_type: 'vaccination', severity: 'mild', record_time: now(), notes: '' })
const weightForm = reactive({ weight_kg: null, record_time: now(), notes: '' })

onMounted(async () => {
  await fetchPets()
  if (!form.pet_id && pets.value.length) form.pet_id = pets.value[0].id
})

async function handleSave() {
  if (saving.value) return
  if (!form.pet_id) { Toast({ theme: 'warning', message: '请选择宠物' }); return }

  saving.value = true
  try {
    if (tab.value === 'diet') {
      if (!dietForm.food_name.trim()) { Toast({ theme: 'warning', message: '请填写食物名称' }); saving.value = false; return }
      await addDietLog({
        pet_id: form.pet_id,
        food_name: dietForm.food_name.trim(),
        food_type: dietForm.food_type,
        notes: dietForm.notes,
        logged_date: dietForm.logged_date
      })
    } else if (tab.value === 'health') {
      if (!healthForm.notes.trim()) { Toast({ theme: 'warning', message: '请填写详情' }); saving.value = false; return }
      await addHealthRecord({
        pet_id: form.pet_id,
        record_type: healthForm.record_type,
        severity: healthForm.severity,
        record_time: healthForm.record_time,
        notes: healthForm.notes
      })
    } else {
      if (!weightForm.weight_kg) { Toast({ theme: 'warning', message: '请填写体重' }); saving.value = false; return }
      const kg = Math.round(Number(weightForm.weight_kg) * 100) / 100
      await addHealthRecord({
        pet_id: form.pet_id,
        record_type: 'weight',
        weight_kg: kg,
        record_time: weightForm.record_time,
        notes: weightForm.notes
      })
      await updatePet(form.pet_id, { weight_kg: kg })
    }
    Toast({ theme: 'success', message: '记录已添加' })
    router.back()
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '添加失败' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg);padding-top:var(--safe-top)}
.tab-bar{display:flex;gap:12px;background:var(--card);border-radius:12px;padding:4px;box-shadow:var(--shadow-card)}
.tab-item{flex:1;text-align:center;padding:10px 0;font-size:14px;font-weight:500;color:var(--muted);cursor:pointer;border-radius:8px;transition:all .2s}
.tab-item.active{background:var(--brown);color:#fff}
.edit-body{padding:0 16px 40px}
.empty-hint{font-size:13px;color:var(--muted);padding:8px 0}
</style>
