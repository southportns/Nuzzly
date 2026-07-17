<template>
  <div class="app-shell">
    <div class="hero-bg">
      <button class="hero-notif" aria-label="通知" @click="$router.push('/notifications')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.134 11C18.715 16.375 21 18 21 18H3s3-2.133 3-9.6c0-1.697.632-3.325 1.757-4.525S10.41 2 12 2q.507 0 1 .09M19 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m-5.27 13a2 2 0 0 1-3.46 0"/></svg>
      </button>
    </div>
    <div class="profile-card anim-fade-up">
      <div class="profile-avatar"><img :src="avatarUrl" alt="头像" loading="lazy"></div>
      <div class="profile-info">
        <div class="profile-username">{{ userName }}</div>
        <div class="profile-id">ID: {{ userIdShort }}</div>
        <div v-if="regionText" class="profile-region">📍 {{ regionText }}</div>
      </div>
      <div class="stats-row anim-fade-up anim-delay-1">
        <div class="stat-item"><div class="stat-num">{{ reviewCount }}</div><div class="stat-label">评测</div></div>
        <div class="stat-item"><div class="stat-num">{{ profile?.trust_score ?? '--' }}</div><div class="stat-label">信任分</div></div>
        <div class="stat-item"><div class="stat-num">0</div><div class="stat-label">粉丝</div></div>
        <div class="stat-item"><div class="stat-num">0</div><div class="stat-label">关注</div></div>
      </div>
      <div class="profile-actions anim-fade-up anim-delay-2">
        <button class="action-btn primary" @click="$router.push('/edit-profile')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          编辑资料
        </button>
        <button class="action-btn secondary" @click="$router.push('/settings')">
          <svg viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M553.7 753.4h-59.9c-12.8 0-23.3-10.4-23.3-23.3v-52c-10.8-3.4-21.2-7.7-31.2-13l-32.1 32.1c-5.5 5.5-13.2 8.6-21.2 8.6s-15.7-3.2-21.2-8.7l-37.6-37.6c-5.7-5.7-8.8-13.2-8.8-21.2s3.1-15.5 8.8-21.2l32.1-32.1c-5.2-10-9.6-20.4-12.9-31.2H301c-16.5 0-29.9-13.4-29.9-29.9v-53.2c0-16.5 13.4-29.9 29.9-29.9h45.3c3.4-10.8 7.7-21.2 12.9-31.2l-32.1-32.1c-5.7-5.7-8.8-13.2-8.8-21.2s3.1-15.5 8.8-21.2l37.7-37.7c5.5-5.5 13.2-8.6 21.2-8.6s15.7 3.2 21.2 8.7l32 32c10-5.3 20.5-9.6 31.2-13v-52c0-12.8 10.4-23.3 23.3-23.3h59.9c16.5 0 29.9 13.4 29.9 29.9v45.3c10.8 3.4 21.2 7.7 31.2 13l32.1-32.1c5.5-5.5 13.2-8.6 21.2-8.6s15.7 3.2 21.2 8.7l37.6 37.6c5.7 5.7 8.8 13.2 8.8 21.2s-3.1 15.5-8.8 21.2l-32.1 32.1c5.2 10 9.6 20.4 12.9 31.2h45.3c16.5 0 29.9 13.4 29.9 29.9V524c0 16.5-13.4 29.9-29.9 29.9h-45.3c-3.4 10.8-7.7 21.2-12.9 31.2l32.1 32.1c5.7 5.7 8.8 13.2 8.8 21.2s-3.1 15.5-8.8 21.2l-37.7 37.7c-5.5 5.5-13.2 8.6-21.2 8.6s-15.7-3.2-21.2-8.7l-32-32c-10 5.3-20.5 9.6-31.2 13v45.3c0.1 16.5-13.3 29.9-29.8 29.9z m-54-29.2h54l0.8-68.6 11.1-2.7c15.6-3.8 30.5-10 44.2-18.3l9.8-5.9 48 48 38.8-37.6-48-49.1 5.9-9.8c8.3-13.7 14.5-28.6 18.3-44.2l2.7-11.1h67.8l0.8-0.8v-53.2l-68.6-0.8-2.7-11.1c-3.9-15.6-10-30.5-18.3-44.2l-5.9-9.8 48-48-37.6-38.8-49.1 48-9.8-5.9c-13.8-8.3-28.7-14.5-44.2-18.3l-11.1-2.7v-67.8l-54.8-0.7v68.5l-11.1 2.7c-15.6 3.8-30.5 10-44.2 18.3l-9.8 5.9-48-48-38.8 37.6 48 49.1-5.9 9.8c-8.3 13.7-14.5 28.6-18.3 44.2L369 470h-68l-0.8 54 68.6 0.8 2.7 11.1c3.9 15.6 10 30.5 18.3 44.2l5.9 9.8-48 48 37.6 38.8 49.1-48 9.8 5.9c13.8 8.3 28.7 14.5 44.2 18.3l11.1 2.7v68.6z" fill="#2c2c2c"/><path d="M527.1 599.5c-56.3 0-102.1-45.8-102.1-102.1s45.8-102.1 102.1-102.1 102.1 45.8 102.1 102.1-45.9 102.1-102.1 102.1z m0-175c-40.2 0-72.9 32.7-72.9 72.9s32.7 72.9 72.9 72.9 72.9-32.7 72.9-72.9-32.7-72.9-72.9-72.9z" fill="#2c2c2c"/></svg>
          设置
        </button>
      </div>
      <div class="divider"></div>
      <div class="pet-selector">
        <div v-for="pet in pets" :key="pet.id" class="pet-chip" :class="{ active: selectedPet === pet.id }" @click="selectedPet = pet.id" @dblclick="$router.push('/pets/' + pet.id)">
          <div class="pet-chip-avatar">{{ pet.emoji }}</div>
          <span class="pet-chip-name">{{ pet.name }}</span>
        </div>
        <div class="pet-chip" style="border-style:dashed;color:var(--muted)" @click="$router.push('/pet/create')">
          <div class="pet-chip-avatar" style="background:transparent;font-size:16px">+</div>
          <span class="pet-chip-name">添加</span>
        </div>
      </div>
      <div class="profile-body">
        <div class="glass-card">
          <div class="glass-card-header"><div class="glass-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>饮食日志</div><span class="glass-card-more">全部 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></span></div>
          <div class="record-item" v-for="l in dietLogs" :key="l.id"><div class="record-icon diet">{{ l.icon }}</div><div class="record-content"><div class="record-name">{{ l.name }}</div><div class="record-desc">{{ l.desc }}</div></div><span class="record-time">{{ l.time }}</span></div>
          <div v-if="!dietLogs.length" class="record-item"><div class="record-content"><div class="record-name" style="color:var(--muted)">暂无饮食记录</div></div></div>
        </div>
        <div class="glass-card">
          <div class="glass-card-header"><div class="glass-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>健康记录</div><span class="glass-card-badge">{{ healthRecords.length }} 条</span></div>
          <div class="record-item" v-for="r in healthRecords" :key="r.id"><div class="record-icon" :class="r.type">{{ r.icon }}</div><div class="record-content"><div class="record-name">{{ r.name }}</div><div class="record-desc">{{ r.desc }}</div></div><span class="record-time">{{ r.date }}</span></div>
          <div v-if="!healthRecords.length" class="record-item"><div class="record-content"><div class="record-name" style="color:var(--muted)">暂无健康记录</div></div></div>
        </div>
        <div class="glass-card">
          <div class="glass-card-header"><div class="glass-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 0-4 4c0 2 2 4 4 6 2-2 4-4 4-6a4 4 0 0 0-4-4z"/><path d="M20 21H4"/></svg>体重趋势</div>
            <button class="add-btn" @click="showWeightForm = !showWeightForm">{{ showWeightForm ? '收起' : '+ 记录' }}</button>
          </div>
          <div v-if="showWeightForm" class="weight-form">
            <input v-model="newWeight" type="number" step="0.1" min="0" class="weight-input" placeholder="输入体重（kg）" />
            <button class="weight-submit" :disabled="!newWeight || weightSaving" @click="handleAddWeight">{{ weightSaving ? '记录中' : '记录' }}</button>
          </div>
          <div class="weight-mini">
            <div>
              <div class="weight-mini-value">{{ latestWeight }} <span style="font-size:14px;font-weight:400;color:var(--muted)">kg</span></div>
              <div class="weight-mini-label">最新体重</div>
            </div>
            <div class="weight-bar-chart">
              <div v-for="(item, idx) in weightChartData" :key="idx" class="weight-bar-item" @click="handleDeleteWeight(item.id, item.value, item.label)">
                <div class="weight-bar-value">{{ item.value }}</div>
                <div class="weight-bar" :style="{ height: item.height + 'px' }"></div>
                <div class="weight-bar-label">{{ item.label }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="glass-card">
          <div class="glass-card-header">
            <div class="glass-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>过敏信息</div>
            <button v-if="!showAllergyForm" class="add-btn" @click="showAllergyForm = true">+ 添加</button>
          </div>
          <div class="allergy-tags">
            <span v-for="a in allergyTags" :key="a.id" class="allergy-tag">
              {{ a.allergen }} · {{ a.severityLabel }}
              <button class="allergy-del" @click.stop="onDeleteAllergy(a.id, a.confirmed)">×</button>
            </span>
            <span v-if="!allergyTags.length && !showAllergyForm" class="allergy-tag" style="color:var(--muted);background:rgba(0,0,0,.04);border-color:transparent">暂无</span>
          </div>
          <div v-if="showAllergyForm" class="allergy-form">
            <input v-model="newAllergen" class="allergy-input" placeholder="过敏原名称，如：鸡肉、谷物" />
            <div class="allergy-form-row">
              <select v-model="newSeverity" class="allergy-select">
                <option value="mild">轻微</option>
                <option value="moderate">中度</option>
                <option value="severe">严重</option>
              </select>
              <label class="allergy-check"><input type="checkbox" v-model="newConfirmed" /> 已确认</label>
            </div>
            <div class="allergy-form-actions">
              <button class="allergy-submit" :disabled="!newAllergen.trim()" @click="onAddAllergy">添加</button>
              <button class="allergy-cancel" @click="showAllergyForm = false">取消</button>
            </div>
          </div>
        </div>
        <div class="glass-card" style="margin-bottom:20px">
          <div class="glass-card-header"><div class="glass-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>健康事件</div></div>
          <div class="timeline">
            <div class="timeline-item" v-for="ev in healthEvents" :key="ev.date + ev.text"><div class="timeline-dot"></div><div class="timeline-date">{{ ev.date }}</div><div class="timeline-text">{{ ev.text }}</div></div>
            <div v-if="!healthEvents.length" class="timeline-item"><div class="timeline-text" style="color:var(--muted)">暂无健康事件</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <TabBar active-tab="profile" />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Toast } from 'tdesign-mobile-vue'
import TabBar from '../components/TabBar.vue'
import { useAuth } from '../composables/useAuth'
import { usePets } from '../composables/usePets'
import { useDietLogs } from '../composables/useDietLogs'
import { useHealthRecords } from '../composables/useHealthRecords'

const { profile, user } = useAuth()
const { pets: rawPets, fetchPets, updatePet } = usePets()
const { dietLogs: rawDietLogs, fetchDietLogs } = useDietLogs()
const { healthRecords: rawHealth, weightRecords, allergies, timeline, fetchHealthRecords, fetchAllergies, addAllergy, deleteAllergy, addHealthRecord, deleteHealthRecord } = useHealthRecords()

const selectedPet = ref(null)
const showWeightForm = ref(false)
const newWeight = ref('')
const weightSaving = ref(false)

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }
const FOOD_ICON = { dry_food: '🍖', wet_food: '🐟', water: '💧', treat: '🦴', default: '🍽️' }
const RECORD_ICON = { vaccination: '💉', symptom: '🩺', medication: '💊', diagnosis: '📋', checkup: '🩻', weight: '⚖️' }
const SEVERITY_LABEL = { mild: '轻度', moderate: '中度', severe: '重度' }

const userName = computed(() => profile.value?.display_name || profile.value?.username || '铲屎官')
const userIdShort = computed(() => {
  const num = profile.value?.user_number
  if (num) return `nuzzmily${String(num).padStart(3, '0')}`
  return 'nuzzmily000'
})
const avatarUrl = computed(() => profile.value?.avatar_url || '/mqpyqgao-logo.png')
const regionText = computed(() => {
  const r = profile.value?.region || ''
  if (!r) return ''
  return r.replace('·', ' ')
})
const reviewCount = computed(() => profile.value?.review_count || 0)

const pets = computed(() => rawPets.value.map(p => ({
  id: p.id, name: p.name, emoji: SPECIES_EMOJI[p.species] || '🐾'
})))

const dietLogs = computed(() => rawDietLogs.value.slice(0, 3).map(l => ({
  id: l.id, icon: FOOD_ICON[l.food_type] || FOOD_ICON.default,
  name: l.food_name, desc: l.notes || l.food_type,
  time: (l.created_at || l.logged_date || '').slice(11, 16) || '—'
})))

const healthRecords = computed(() => rawHealth.value.slice(0, 3).map(r => ({
  id: r.id, icon: RECORD_ICON[r.record_type] || '📋', type: r.record_type,
  name: r.diagnosis || r.medication_name || r.record_type,
  desc: r.notes || '', date: (r.record_time || '').slice(5, 10)
})))

const latestWeight = computed(() => {
  const w = weightRecords.value[0]?.weight_kg
  return w ? Number(w).toFixed(1) : '--'
})

const weightChartData = computed(() => {
  const records = weightRecords.value.slice(0, 7).reverse()
  const weights = records.map(r => Number(r.weight_kg))
  const maxWeight = Math.max(...weights)
  const minWeight = Math.min(...weights)
  const range = maxWeight - minWeight || 1

  return records.map((record, idx) => {
    const weight = Number(record.weight_kg)
    const normalized = (weight - minWeight) / range
    const height = 15 + normalized * 25
    const date = new Date(record.record_time)
    const label = `${date.getMonth() + 1}/${date.getDate()}`
    return { id: record.id, value: weight.toFixed(1), height, label }
  })
})

const allergyTags = computed(() => allergies.value.map(a => ({
  id: a.id, allergen: a.allergen, severityLabel: SEVERITY_LABEL[a.severity] || '', confirmed: a.confirmed
})))

const showAllergyForm = ref(false)
const newAllergen = ref('')
const newSeverity = ref('mild')
const newConfirmed = ref(false)

async function handleAddWeight() {
  if (!newWeight.value || !selectedPet.value) return
  weightSaving.value = true
  try {
    const kg = Math.round(Number(newWeight.value) * 100) / 100
    await addHealthRecord({
      pet_id: selectedPet.value,
      record_type: 'weight',
      weight_kg: kg,
      record_time: new Date().toISOString()
    })
    await updatePet(selectedPet.value, { weight_kg: kg })
    Toast({ theme: 'success', message: '体重已记录' })
    newWeight.value = ''
    showWeightForm.value = false
    fetchHealthRecords(selectedPet.value)
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '记录失败' })
  } finally {
    weightSaving.value = false
  }
}

async function handleDeleteWeight(id, value, label) {
  if (!confirm(`确定要删除 ${label} 的体重记录（${value} kg）吗？`)) return
  try {
    await deleteHealthRecord(id)
    Toast({ theme: 'success', message: '已删除' })
    fetchHealthRecords(selectedPet.value)
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '删除失败' })
  }
}

async function onAddAllergy() {
  if (!newAllergen.value.trim() || !selectedPet.value) return
  try {
    await addAllergy({
      pet_id: selectedPet.value,
      allergen: newAllergen.value.trim(),
      severity: newSeverity.value,
      confirmed: newConfirmed.value
    })
    Toast({ theme: 'success', message: '过敏原已添加' })
    newAllergen.value = ''
    newSeverity.value = 'mild'
    newConfirmed.value = false
    showAllergyForm.value = false
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '添加失败' })
  }
}

async function onDeleteAllergy(id, isConfirmed) {
  if (isConfirmed && !confirm('该过敏原已确认，确定要删除吗？')) return
  try {
    await deleteAllergy(id)
    Toast({ theme: 'success', message: '过敏原已删除' })
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '删除失败' })
  }
}

const healthEvents = computed(() => timeline.value.slice(0, 4))

async function loadAll(petId) {
  await Promise.all([fetchHealthRecords(petId), fetchDietLogs(petId)])
  if (petId) fetchAllergies(petId)
}

onMounted(async () => {
  await fetchPets()
  if (pets.value.length) selectedPet.value = pets.value[0].id
})

watch(selectedPet, (id) => { if (id) loadAll(id) })
</script>

<style scoped>
.app-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:0;padding-bottom:calc(88px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.hero-bg{width:100%;height:calc(clamp(180px,45vh,220px) + var(--safe-top));background:url('/scene graph.png') center bottom/cover no-repeat;position:fixed;top:0;left:0;right:0;z-index:0}
.hero-notif{position:absolute;top:calc(var(--safe-top) + 16px);right:16px;width:41.31px;height:41.31px;border-radius:50%;background:rgba(255,255,255,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 2px 12px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.6);cursor:pointer;transition:transform .2s}
.hero-notif:active{transform:scale(.9)}
.hero-notif svg{width:20px;height:20px;color:var(--fg)}
.profile-card{background:var(--card);border-radius:var(--radius-card) var(--radius-card) 0 0;margin-top:calc(clamp(180px,45vh,220px) + var(--safe-top) - 36px);position:relative;z-index:1;padding-top:36px;padding-bottom:12px}
.profile-avatar{position:absolute;top:-36px;right:28px;width:clamp(60px,18vw,80px);aspect-ratio:1;border-radius:50%;border:3px solid var(--card);box-shadow:0 4px 16px rgba(0,0,0,.1);overflow:hidden;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;z-index:2}
.profile-avatar img{width:100%;height:100%;object-fit:cover}
.profile-info{padding:0 28px;padding-right:clamp(100px,25vw,144px);display:flex;flex-direction:column;gap:4px}
.profile-username{font-family:var(--font-display);font-size:24px;font-weight:700;letter-spacing:-.02em;color:var(--fg);line-height:1.2}
.profile-id{font-size:13px;color:var(--muted);letter-spacing:.01em}
.profile-region{font-size:12px;color:var(--muted);margin-top:2px}
.stats-row{display:flex;justify-content:space-around;padding:16px 28px 0}
.stat-item{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer}
.stat-item:active{opacity:.7}
.stat-num{font-family:var(--font-num);font-size:20px;font-weight:600;line-height:1;letter-spacing:-.02em;color:var(--fg)}
.stat-label{font-size:12px;color:var(--muted);letter-spacing:.01em}
.profile-actions{display:flex;gap:12px;padding:16px 28px 0}
.action-btn{flex:1;height:44px;border-radius:var(--radius-btn);display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:500;letter-spacing:.01em;cursor:pointer;transition:transform .15s,opacity .15s;border:none}
.action-btn:active{transform:scale(.96)}
.action-btn.primary{background:var(--brown);color:#fff;box-shadow:var(--shadow-btn)}
.action-btn.secondary{background:var(--bg);color:var(--fg);border:1px solid var(--border)}
.action-btn svg{width:16px;height:16px}
.action-btn.secondary svg{width:35px;height:35px}
.divider{height:1px;background:var(--border);margin:12px 28px 0}
.pet-selector{display:flex;gap:8px;padding:16px 20px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.pet-selector::-webkit-scrollbar{display:none}
.pet-chip{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:var(--radius-btn);background:var(--bg);border:1.5px solid var(--border);cursor:pointer;transition:all .2s}
.pet-chip.active{border-color:var(--brown);background:rgba(139,94,70,.06)}
.pet-chip:active{transform:scale(.96)}
.pet-chip-avatar{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,rgba(215,181,147,.2),rgba(215,181,147,.08));display:flex;align-items:center;justify-content:center;font-size:12px}
.pet-chip-name{font-size:12px;font-weight:500;color:var(--fg);white-space:nowrap}
.profile-body{padding:16px 20px 0}
.glass-card{background:rgba(0,0,0,.03);border-radius:20px;padding:16px;margin-bottom:12px}
.glass-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.glass-card-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--fg)}
.glass-card-title svg{width:16px;height:16px;color:var(--brown)}
.glass-card-badge{font-size:11px;color:var(--muted);background:rgba(0,0,0,.04);padding:3px 8px;border-radius:var(--radius-btn);font-weight:500}
.glass-card-more{font-size:12px;color:var(--brown);font-weight:500;cursor:pointer;display:flex;align-items:center;gap:2px}
.glass-card-more svg{width:12px;height:12px}
.record-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.record-item:last-child{border-bottom:none;padding-bottom:0}
.record-item:first-child{padding-top:0}
.record-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
.record-icon.diet{background:rgba(139,94,70,.1)}
.record-icon.health{background:rgba(108,138,105,.1)}
.record-icon.symptom{background:rgba(255,59,48,.1)}
.record-content{flex:1;min-width:0}
.record-name{font-size:13px;font-weight:500;color:var(--fg);margin-bottom:1px}
.record-desc{font-size:11px;color:var(--muted);line-height:1.4}
.record-time{font-size:10px;color:var(--muted);white-space:nowrap;flex-shrink:0;margin-top:2px}
.weight-mini{display:flex;align-items:center;justify-content:space-between}
.weight-mini-value{font-size:24px;font-weight:600;color:var(--brown);font-family:var(--font-num)}
.weight-mini-label{font-size:11px;color:var(--muted)}
.weight-form{display:flex;gap:8px;margin-bottom:12px}
.weight-input{flex:1;height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px;font-size:13px;font-family:var(--font-body);color:var(--fg);background:var(--card);outline:none}
.weight-input:focus{border-color:var(--brown)}
.weight-submit{flex-shrink:0;height:36px;padding:0 14px;border-radius:8px;background:var(--brown);color:#fff;font-size:13px;font-weight:500;border:none;cursor:pointer}
.weight-submit:disabled{opacity:.4;cursor:default}
.weight-submit:active{transform:scale(.96)}
.weight-bar-chart{display:flex;align-items:flex-end;gap:4px;height:50px;padding:0 2px}
.weight-bar-item{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;cursor:pointer;transition:transform .15s}
.weight-bar-item:active{transform:scale(.9)}
.weight-bar-value{font-size:9px;color:var(--muted);font-family:var(--font-num)}
.weight-bar{width:100%;max-width:12px;background:linear-gradient(180deg,var(--brown),rgba(139,94,70,.6));border-radius:4px 4px 0 0;min-height:4px}
.weight-bar-label{font-size:8px;color:var(--muted);margin-top:1px}
.allergy-tags{display:flex;flex-wrap:wrap;gap:6px}
.allergy-tag{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:var(--radius-btn);background:rgba(255,59,48,.06);border:1px solid rgba(255,59,48,.12);font-size:12px;color:#FF3B30;font-weight:500}
.allergy-del{background:none;border:none;color:#FF3B30;font-size:14px;cursor:pointer;padding:0 2px;opacity:.6;line-height:1}
.allergy-del:active{opacity:1}
.add-btn{background:none;border:none;color:var(--brown);font-size:13px;font-weight:500;cursor:pointer;padding:4px 8px}
.allergy-form{margin-top:12px;padding:14px;background:rgba(0,0,0,.03);border-radius:16px}
.allergy-input{width:100%;height:40px;border:1px solid var(--border);border-radius:12px;padding:0 12px;font-size:14px;background:var(--card);color:var(--fg);outline:none;margin-bottom:10px}
.allergy-input::placeholder{color:var(--muted)}
.allergy-form-row{display:flex;gap:10px;align-items:center;margin-bottom:10px}
.allergy-select{flex:1;height:40px;border:1px solid var(--border);border-radius:12px;padding:0 12px;font-size:13px;background:var(--card);color:var(--fg);outline:none}
.allergy-check{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--fg);cursor:pointer}
.allergy-check input{accent-color:var(--brown)}
.allergy-form-actions{display:flex;gap:8px}
.allergy-submit{flex:1;height:38px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer}
.allergy-submit:disabled{opacity:.4;cursor:default}
.allergy-cancel{height:38px;border-radius:var(--radius-btn);background:transparent;color:var(--muted);border:1px solid var(--border);font-size:14px;cursor:pointer;padding:0 16px}
.timeline{position:relative;padding-left:16px}
.timeline::before{content:'';position:absolute;left:5px;top:6px;bottom:6px;width:1.5px;background:rgba(0,0,0,.06);border-radius:1px}
.timeline-item{position:relative;padding:0 0 12px 14px}
.timeline-item:last-child{padding-bottom:0}
.timeline-dot{position:absolute;left:-15px;top:5px;width:8px;height:8px;border-radius:50%;border:2px solid var(--brown);background:var(--card)}
.timeline-date{font-size:10px;color:var(--muted);margin-bottom:2px;font-weight:500}
.timeline-text{font-size:12px;color:var(--fg);line-height:1.5}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}.anim-delay-2{animation-delay:.2s}
</style>
