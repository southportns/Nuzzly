<template>
  <div class="edit-shell">
    <PageHeader title="宠物详情" action-text="编辑" @action="editing = !editing" />

    <div v-if="loading" class="loading-body">
      <div class="skeleton-avatar shimmer"></div>
      <div class="skeleton-line w60 shimmer"></div>
      <div class="skeleton-line w90 shimmer"></div>
    </div>

    <template v-else-if="pet">
      <!-- 头像区 -->
      <div class="avatar-section anim-fade-up">
        <div class="pet-avatar-lg">
          <img v-if="pet.photo_url" :src="pet.photo_url" :alt="pet.name" />
          <span v-else class="emoji">{{ SPECIES_EMOJI[pet.species] || '🐾' }}</span>
        </div>
        <div class="pet-name-lg">{{ pet.name }}</div>
        <div class="pet-meta-lg">{{ pet.breed || '未知品种' }} · {{ pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知' }}</div>
      </div>

      <!-- 基础信息卡 -->
      <div class="glass-card anim-fade-up anim-delay-1">
        <div class="glass-card-header">
          <div class="glass-card-title">📋 基础信息</div>
        </div>
        <template v-if="!editing">
          <div class="info-grid">
            <div class="info-item"><span class="info-label">年龄</span><span class="info-value">{{ pet.age_years || 0 }}岁{{ pet.age_months || 0 }}月</span></div>
            <div class="info-item"><span class="info-label">体重</span><span class="info-value">{{ pet.weight_kg ? Number(pet.weight_kg).toFixed(1) + 'kg' : '--' }}</span></div>
            <div class="info-item"><span class="info-label">绝育</span><span class="info-value">{{ pet.neutered ? '已绝育' : '未绝育' }}</span></div>
            <div class="info-item"><span class="info-label">肠胃</span><span class="info-value">{{ stomachLabel(pet.stomach_health) }}</span></div>
          </div>
        </template>
        <template v-else>
          <div class="edit-form">
            <div class="form-row">
              <FormField v-model="editForm.age_years" label="年龄（岁）" type="number" :min="0" :max="30" placeholder="0" half />
              <FormField v-model="editForm.age_months" label="月" type="number" :min="0" :max="11" placeholder="0" half />
            </div>
            <FormField v-model="editForm.weight_kg" label="体重（kg）" type="number" :step="0.1" :min="0" placeholder="如：4.8" />
            <FormField label="绝育">
              <div class="radio-group">
                <label class="radio-item"><input type="radio" name="neutered" :value="true" v-model="editForm.neutered"><span>已绝育</span></label>
                <label class="radio-item"><input type="radio" name="neutered" :value="false" v-model="editForm.neutered"><span>未绝育</span></label>
              </div>
            </FormField>
            <FormField label="肠胃状况">
              <ChipGroup v-model="editForm.stomach_health" :options="STOMACH" />
            </FormField>
            <button class="save-btn" :disabled="saving" @click="handleSave">
              {{ saving ? '保存中…' : '保存修改' }}
            </button>
          </div>
        </template>
      </div>

      <!-- 饮食日志 -->
      <div class="glass-card anim-fade-up anim-delay-2">
        <div class="glass-card-header">
          <div class="glass-card-title">🍖 饮食日志</div>
          <span class="glass-card-badge">{{ dietLogs.length }} 条</span>
        </div>
        <div v-for="log in dietLogs.slice(0, 5)" :key="log.id" class="record-item">
          <div class="record-icon diet">{{ FOOD_ICON[log.food_type] || '🍽️' }}</div>
          <div class="record-content">
            <div class="record-name">{{ log.food_name }}</div>
            <div class="record-desc">{{ log.notes || log.food_type }}</div>
          </div>
          <span class="record-time">{{ formatDate(log.logged_date || log.created_at) }}</span>
        </div>
        <div v-if="!dietLogs.length" class="empty-mini">暂无饮食记录</div>
      </div>

      <!-- 健康记录 -->
      <div class="glass-card anim-fade-up anim-delay-3">
        <div class="glass-card-header">
          <div class="glass-card-title">💊 健康记录</div>
          <span class="glass-card-badge">{{ healthRecords.length }} 条</span>
        </div>
        <div v-for="r in healthRecords.slice(0, 5)" :key="r.id" class="record-item">
          <div class="record-icon health">{{ RECORD_ICON[r.record_type] || '📋' }}</div>
          <div class="record-content">
            <div class="record-name">{{ r.diagnosis || r.medication_name || r.record_type }}</div>
            <div class="record-desc">{{ r.notes || '' }}</div>
          </div>
          <span class="record-time">{{ formatDate(r.record_time) }}</span>
        </div>
        <div v-if="!healthRecords.length" class="empty-mini">暂无健康记录</div>
      </div>

      <!-- 过敏信息 -->
      <div class="glass-card anim-fade-up anim-delay-4">
        <div class="glass-card-header">
          <div class="glass-card-title">⚠️ 过敏信息</div>
        </div>
        <div class="allergy-tags">
          <span v-for="a in allergies" :key="a.id" class="allergy-tag">
            {{ a.allergen }} · {{ SEVERITY_LABEL[a.severity] || '' }}
          </span>
          <span v-if="!allergies.length" class="allergy-tag" style="color:var(--muted);background:rgba(0,0,0,.04);border-color:transparent">暂无过敏记录</span>
        </div>
      </div>

      <!-- 危险操作 -->
      <div class="danger-zone anim-fade-up anim-delay-5">
        <button class="danger-btn" @click="handleDelete">删除宠物档案</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { usePets } from '../composables/usePets'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader.vue'
import FormField from '../components/FormField.vue'
import ChipGroup from '../components/ChipGroup.vue'

const route = useRoute()
const router = useRouter()
const { updatePet } = usePets()

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }
const FOOD_ICON = { dry_food: '🍖', wet_food: '🐟', water: '💧', treat: '🦴' }
const RECORD_ICON = { vaccination: '💉', symptom: '🩺', medication: '💊', diagnosis: '📋', checkup: '🩻', weight: '⚖️' }
const SEVERITY_LABEL = { mild: '轻微', moderate: '中度', severe: '严重' }
const STOMACH = [
  { value: 'normal', label: '正常' },
  { value: 'sensitive', label: '敏感' },
  { value: 'very_sensitive', label: '极易敏感' }
]

const loading = ref(true)
const saving = ref(false)
const editing = ref(false)
const pet = ref(null)
const dietLogs = ref([])
const healthRecords = ref([])
const allergies = ref([])

const editForm = reactive({
  age_years: 0,
  age_months: 0,
  weight_kg: null,
  neutered: false,
  stomach_health: 'normal'
})

function stomachLabel(v) {
  return v === 'sensitive' ? '敏感' : v === 'very_sensitive' ? '极易敏感' : '正常'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

async function loadPet() {
  const id = route.params.id
  const { data } = await supabase
    .from('pets')
    .select('id, name, species, breed, age_years, age_months, gender, weight_kg, neutered, stomach_health, photo_url')
    .eq('id', id)
    .single()
  pet.value = data
  if (data) {
    editForm.age_years = data.age_years || 0
    editForm.age_months = data.age_months || 0
    editForm.weight_kg = data.weight_kg != null ? Math.round(data.weight_kg * 100) / 100 : null
    editForm.neutered = data.neutered || false
    editForm.stomach_health = data.stomach_health || 'normal'
  }
}

async function loadSecondary() {
  const id = route.params.id
  const [dietRes, healthRes, allergyRes] = await Promise.all([
    supabase.from('diet_logs')
      .select('id, food_type, food_name, notes, logged_date, created_at')
      .eq('pet_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('health_records')
      .select('id, record_type, record_time, diagnosis, medication_name, notes')
      .eq('pet_id', id)
      .order('record_time', { ascending: false })
      .limit(20),
    supabase.from('pet_allergies').select('id, allergen, severity').eq('pet_id', id)
  ])
  dietLogs.value = dietRes.data || []
  healthRecords.value = (healthRes.data || []).filter(r => r.record_type !== 'weight')
  allergies.value = allergyRes.data || []
}

async function handleSave() {
  if (!pet.value || saving.value) return
  saving.value = true
  try {
    await updatePet(pet.value.id, {
      age_years: Number(editForm.age_years) || 0,
      age_months: Number(editForm.age_months) || 0,
      weight_kg: editForm.weight_kg ? Math.round(Number(editForm.weight_kg) * 100) / 100 : null,
      neutered: editForm.neutered,
      stomach_health: editForm.stomach_health
    })
    pet.value.age_years = editForm.age_years
    pet.value.age_months = editForm.age_months
    pet.value.weight_kg = editForm.weight_kg
    pet.value.neutered = editForm.neutered
    pet.value.stomach_health = editForm.stomach_health
    editing.value = false
    Toast({ theme: 'success', message: '已保存' })
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '保存失败' })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!confirm(`确定要删除 ${pet.value?.name} 的档案吗？此操作不可恢复。`)) return
  try {
    await supabase.from('pets').update({ is_active: false }).eq('id', pet.value.id)
    Toast({ theme: 'success', message: '已删除' })
    router.back()
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '删除失败' })
  }
}

onMounted(async () => {
  await loadPet()
  loading.value = false
  loadSecondary()
})
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg);padding-top:var(--safe-top);padding-bottom:calc(40px + var(--safe-bottom))}
.loading-body{display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:16px}
.skeleton-avatar{width:80px;height:80px;border-radius:50%}
.skeleton-line{height:16px;border-radius:8px;width:60%}
.w60{width:60%}.w90{width:90%}
.shimmer{background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.avatar-section{display:flex;flex-direction:column;align-items:center;padding:20px 20px 8px}
.pet-avatar-lg{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:40px;overflow:hidden;box-shadow:0 4px 16px rgba(139,94,70,.15)}
.pet-avatar-lg img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.pet-name-lg{font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--fg);margin-top:12px}
.pet-meta-lg{font-size:13px;color:var(--muted);margin-top:4px}
.glass-card{margin:12px 20px 0;background:rgba(255,255,255,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:20px;border:1px solid rgba(255,255,255,.6);box-shadow:0 8px 32px rgba(0,0,0,.06);padding:16px}
.glass-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.glass-card-title{font-size:15px;font-weight:600;color:var(--fg)}
.glass-card-badge{font-size:11px;color:var(--muted);background:rgba(0,0,0,.04);padding:3px 8px;border-radius:var(--radius-btn)}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.info-item{display:flex;flex-direction:column;gap:2px}
.info-label{font-size:11px;color:var(--muted)}
.info-value{font-size:14px;font-weight:500;color:var(--fg)}
.record-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.record-item:last-child{border-bottom:none;padding-bottom:0}
.record-item:first-child{padding-top:0}
.record-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
.record-icon.diet{background:rgba(139,94,70,.1)}
.record-icon.health{background:rgba(108,138,105,.1)}
.record-content{flex:1;min-width:0}
.record-name{font-size:13px;font-weight:500;color:var(--fg)}
.record-desc{font-size:11px;color:var(--muted);margin-top:2px}
.record-time{font-size:10px;color:var(--muted);white-space:nowrap;flex-shrink:0}
.allergy-tags{display:flex;flex-wrap:wrap;gap:8px}
.allergy-tag{padding:6px 14px;border-radius:var(--radius-btn);background:rgba(255,59,48,.06);border:1px solid rgba(255,59,48,.12);font-size:12px;color:#FF3B30;font-weight:500}
.empty-mini{text-align:center;padding:16px;font-size:13px;color:var(--muted)}
.edit-form{padding:0 4px}
.form-row{display:flex;gap:12px}
.radio-group{display:flex;gap:16px}
.radio-item{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--fg);cursor:pointer}
.radio-item input{accent-color:var(--brown)}
.save-btn{width:100%;height:44px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer;margin-top:12px}
.save-btn:disabled{opacity:.5}
.save-btn:active{transform:scale(.97)}
.danger-zone{padding:24px 20px}
.danger-btn{width:100%;height:44px;border-radius:var(--radius-btn);background:transparent;color:#FF3B30;font-size:14px;font-weight:500;border:1px solid rgba(255,59,48,.2);cursor:pointer}
.danger-btn:active{background:rgba(255,59,48,.05)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}.anim-delay-2{animation-delay:.2s}.anim-delay-3{animation-delay:.3s}.anim-delay-4{animation-delay:.4s}.anim-delay-5{animation-delay:.5s}
</style>
