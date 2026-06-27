<template>
  <div class="records-shell">
    <header class="records-header anim-fade-up">
      <div class="records-header-row">
        <button class="back-btn" @click="$router.back()" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>
      <h1 class="records-title">记录</h1>
    </header>

    <div class="pet-selector anim-fade-up anim-delay-1">
      <div v-for="pet in pets" :key="pet.id" class="pet-chip" :class="{ active: selectedPet === pet.id }" @click="selectedPet = pet.id">
        <div class="pet-chip-avatar">{{ pet.emoji }}</div>
        <span class="pet-chip-name">{{ pet.name }}</span>
      </div>
    </div>

    <!-- Diet Logs -->
    <div class="glass-card anim-fade-up anim-delay-2">
      <div class="glass-card-header">
        <div class="glass-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          饮食日志
        </div>
        <span class="glass-card-more">查看全部 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></span>
      </div>
      <div v-for="log in dietLogs" :key="log.id" class="record-item">
        <div class="record-icon diet">{{ log.icon }}</div>
        <div class="record-content">
          <div class="record-name">{{ log.name }}</div>
          <div class="record-desc">{{ log.desc }}</div>
        </div>
        <span class="record-time">{{ log.time }}</span>
        <button class="record-del" @click.stop="onDeleteDietLog(log.id)">×</button>
      </div>
    </div>

    <!-- Health Records -->
    <div class="glass-card anim-fade-up anim-delay-3">
      <div class="glass-card-header">
        <div class="glass-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          健康记录
        </div>
        <span class="glass-card-badge">5 条</span>
      </div>
      <div v-for="record in healthRecords" :key="record.id" class="record-item">
        <div class="record-icon" :class="record.type">{{ record.icon }}</div>
        <div class="record-content">
          <div class="record-name">{{ record.name }}</div>
          <div class="record-desc">{{ record.desc }}</div>
        </div>
        <span class="record-time">{{ record.date }}</span>
      </div>
    </div>

    <!-- Weight Tracker -->
    <div class="glass-card anim-fade-up anim-delay-4">
      <div class="glass-card-header">
        <div class="glass-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 0-4 4c0 2 2 4 4 6 2-2 4-4 4-6a4 4 0 0 0-4-4z"/><path d="M20 21H4"/></svg>
          体重趋势
        </div>
        <span class="glass-card-more">详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></span>
      </div>
      <div class="weight-chart">
        <span class="weight-value">4.8 kg</span>
        <div class="weight-chart-dots">
          <div class="weight-dot" v-for="(dot, i) in weightDots" :key="i" :style="{ marginBottom: dot + 'px' }"></div>
        </div>
      </div>
    </div>

    <!-- Allergy Info -->
    <div class="glass-card anim-fade-up anim-delay-4">
      <div class="glass-card-header">
        <div class="glass-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          过敏信息
        </div>
      </div>
      <div class="allergy-tags">
        <span v-for="a in allergyTags" :key="a.text" class="allergy-tag">{{ a.text }}<template v-if="a.level"> · {{ a.level }}</template></span>
        <span v-if="!allergyTags.length" class="allergy-tag" style="color:var(--muted);background:rgba(0,0,0,.04);border-color:transparent">暂无过敏记录</span>
      </div>
    </div>

    <!-- Health Timeline -->
    <div class="glass-card anim-fade-up anim-delay-5" style="margin-bottom:24px">
      <div class="glass-card-header">
        <div class="glass-card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          健康事件
        </div>
      </div>
      <div class="timeline">
        <div v-for="event in healthEvents" :key="event.date" class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-date">{{ event.date }}</div>
          <div class="timeline-text">{{ event.text }}</div>
        </div>
      </div>
    </div>
  </div>

  <button class="fab anim-scale-in anim-delay-5" aria-label="添加记录" @click="$router.push('/record/create' + (selectedPet ? '?petId=' + selectedPet : ''))">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </button>

  <TabBar active-tab="records" />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Toast } from 'tdesign-mobile-vue'
import TabBar from '../components/TabBar.vue'
import { usePets } from '../composables/usePets'
import { useDietLogs } from '../composables/useDietLogs'
import { useHealthRecords } from '../composables/useHealthRecords'

const { pets: rawPets, fetchPets } = usePets()
const { dietLogs: rawDietLogs, fetchDietLogs, deleteDietLog } = useDietLogs()
const { healthRecords: rawHealth, weightRecords, allergies, timeline, fetchHealthRecords, fetchAllergies } = useHealthRecords()

const selectedPet = ref(null)

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶', bird: '🐦', rabbit: '🐰' }
const FOOD_ICON = { dry_food: '🍖', wet_food: '🐟', water: '💧', treat: '🦴', default: '🍽️' }
const RECORD_ICON = { vaccination: '💉', symptom: '🩺', medication: '💊', diagnosis: '📋', checkup: '🩻', weight: '⚖️' }
const SEVERITY_LABEL = { mild: '轻度', moderate: '中度', severe: '重度' }

// 宠物列表（加 emoji）
const pets = computed(() => rawPets.value.map(p => ({
  id: p.id,
  name: p.name,
  emoji: SPECIES_EMOJI[p.species] || '🐾'
})))

// 饮食日志映射
const dietLogs = computed(() => rawDietLogs.value.map(l => ({
  id: l.id,
  icon: FOOD_ICON[l.food_type] || FOOD_ICON.default,
  name: l.food_name,
  desc: l.notes || l.food_type,
  time: (l.created_at || l.logged_date || '').slice(11, 16) || '—'
})))

// 健康记录映射（排除体重）
const healthRecords = computed(() => rawHealth.value.map(r => ({
  id: r.id,
  icon: RECORD_ICON[r.record_type] || '📋',
  type: r.record_type,
  name: r.diagnosis || r.medication_name || r.record_type,
  desc: r.notes || '',
  date: (r.record_time || '').slice(5, 10)
})))

// 体重
const latestWeight = computed(() => {
  const w = weightRecords.value[0]?.weight_kg
  return w ? `${Number(w).toFixed(1)} kg` : '-- kg'
})

// 过敏标签
const allergyTags = computed(() => allergies.value.map(a => ({
  text: a.allergen,
  level: SEVERITY_LABEL[a.severity] || ''
})))

// 体重趋势点（根据记录数生成高度）
const weightDots = computed(() => {
  const recs = weightRecords.value.slice(0, 7).reverse()
  if (!recs.length) return [12, 18, 14, 22, 16, 20, 15]
  const weights = recs.map(r => Number(r.weight_kg))
  const min = Math.min(...weights), max = Math.max(...weights)
  return weights.map(w => 10 + ((w - min) / (max - min || 1)) * 18)
})

// 时间线
const healthEvents = computed(() => timeline.value)

async function loadAll(petId) {
  await Promise.all([
    fetchPets(),
    fetchHealthRecords(petId),
    fetchDietLogs(petId)
  ])
  if (petId) fetchAllergies(petId)
}

onMounted(async () => {
  await fetchPets()
  if (pets.value.length) {
    selectedPet.value = pets.value[0].id
  }
})

watch(selectedPet, (id) => {
  if (id) loadAll(id)
})

async function onDeleteDietLog(id) {
  if (!confirm('确定要删除这条饮食记录吗？')) return
  try {
    await deleteDietLog(id)
    Toast({ theme: 'success', message: '已删除' })
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '删除失败' })
  }
}
</script>

<style scoped>
.records-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(100px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;position:relative}
.records-header{position:relative;padding:20px 24px 0;z-index:1}
.records-header-row{display:flex;align-items:center;justify-content:space-between}
.back-btn{width:40px;height:40px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s}
.back-btn:active{transform:scale(.92)}
.back-btn svg{width:20px;height:20px;color:var(--fg)}
.records-title{margin-top:20px;font-family:var(--font-display);font-size:34px;font-weight:700;line-height:1.15;letter-spacing:-.02em}
.pet-selector{display:flex;gap:8px;padding:20px 24px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;z-index:1}
.pet-selector::-webkit-scrollbar{display:none}
.pet-chip{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:var(--radius-btn);background:var(--card);border:1.5px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.03);cursor:pointer;transition:all .2s}
.pet-chip.active{border-color:var(--brown);background:rgba(139,94,70,.06)}
.pet-chip:active{transform:scale(.96)}
.pet-chip-avatar{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,rgba(215,181,147,.2),rgba(215,181,147,.08));display:flex;align-items:center;justify-content:center;font-size:12px}
.pet-chip-name{font-size:12px;font-weight:500;color:var(--fg);white-space:nowrap}
.glass-card{margin:16px 20px 0;background:rgba(255,255,255,.72);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:24px;border:1px solid rgba(255,255,255,.6);box-shadow:0 8px 32px rgba(0,0,0,.06),inset 0 1px 0 rgba(255,255,255,.8);padding:20px;position:relative;z-index:1}
.glass-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.glass-card-title{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:600;color:var(--fg)}
.glass-card-title svg{width:18px;height:18px;color:var(--brown)}
.glass-card-badge{font-size:12px;color:var(--muted);background:rgba(0,0,0,.04);padding:4px 10px;border-radius:var(--radius-btn);font-weight:500}
.glass-card-more{font-size:13px;color:var(--brown);font-weight:500;cursor:pointer;display:flex;align-items:center;gap:2px}
.glass-card-more:active{opacity:.6}
.glass-card-more svg{width:14px;height:14px}
.record-item{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.record-item:last-child{border-bottom:none;padding-bottom:0}
.record-item:first-child{padding-top:0}
.record-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}
.record-icon.diet{background:rgba(139,94,70,.1)}
.record-icon.health{background:rgba(108,138,105,.1)}
.record-icon.symptom{background:rgba(255,59,48,.1)}
.record-content{flex:1;min-width:0}
.record-name{font-size:14px;font-weight:500;color:var(--fg);margin-bottom:2px}
.record-desc{font-size:12px;color:var(--muted);line-height:1.4}
.record-time{font-size:11px;color:var(--muted);white-space:nowrap;flex-shrink:0;margin-top:2px}
.record-del{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:4px;flex-shrink:0;opacity:.5}
.record-del:active{opacity:1;color:#FF3B30}
.weight-chart{height:120px;border-radius:16px;background:linear-gradient(135deg,rgba(139,94,70,.04),rgba(215,181,147,.08));display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.weight-value{position:absolute;top:8px;right:12px;font-size:20px;font-weight:600;color:var(--brown);font-family:var(--font-num)}
.weight-chart-dots{display:flex;align-items:flex-end;gap:24px;height:80px;position:relative;z-index:1}
.weight-dot{width:8px;height:8px;border-radius:50%;background:var(--brown);box-shadow:0 2px 8px rgba(139,94,70,.3)}
.allergy-tags{display:flex;flex-wrap:wrap;gap:8px}
.allergy-tag{padding:6px 14px;border-radius:var(--radius-btn);background:rgba(255,59,48,.06);border:1px solid rgba(255,59,48,.12);font-size:13px;color:#FF3B30;font-weight:500}
.timeline{position:relative;padding-left:20px}
.timeline::before{content:'';position:absolute;left:6px;top:8px;bottom:8px;width:2px;background:rgba(0,0,0,.06);border-radius:1px}
.timeline-item{position:relative;padding:0 0 16px 16px}
.timeline-item:last-child{padding-bottom:0}
.timeline-dot{position:absolute;left:-17px;top:6px;width:10px;height:10px;border-radius:50%;border:2px solid var(--brown);background:var(--card)}
.timeline-date{font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:500}
.timeline-text{font-size:13px;color:var(--fg);line-height:1.5}
.fab{position:fixed;bottom:calc(100px + var(--safe-bottom));right:24px;width:56px;height:56px;border-radius:50%;background:var(--brown);box-shadow:var(--shadow-btn);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:50;transition:transform .15s}
.fab:active{transform:scale(.9)}
.fab svg{width:24px;height:24px;color:#fff}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}
.anim-delay-2{animation-delay:.2s}
.anim-delay-3{animation-delay:.3s}
.anim-delay-4{animation-delay:.4s}
.anim-delay-5{animation-delay:.5s}
.anim-scale-in{opacity:0;animation:scaleIn .5s cubic-bezier(.22,1,.36,1) forwards}
</style>
