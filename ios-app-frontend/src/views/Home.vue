<template>
  <div class="app-shell" ref="appShell">

    <!-- Header -->
    <header class="header anim-fade-up">
      <div class="header-row">
        <div class="avatar">
          <img src="/mqpyqgao-logo.png" alt="nuzzly logo">
        </div>
        <div class="header-actions">
          <button class="action-circle anim-fade-up anim-delay-1" aria-label="通知" style="margin-top:18px;position:relative" @click="$router.push('/notifications')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.134 11C18.715 16.375 21 18 21 18H3s3-2.133 3-9.6c0-1.697.632-3.325 1.757-4.525S10.41 2 12 2q.507 0 1 .09M19 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m-5.27 13a2 2 0 0 1-3.46 0"/></svg>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>
        </div>
      </div>
      <div class="greeting">
        <h1 class="greeting-main">HI,<span class="pet-name">{{ userName }}</span><br>欢迎来到毛球镇</h1>
      </div>
    </header>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="qa-btn primary anim-scale-in anim-delay-2" aria-label="镇长" @click="$router.push('/ai')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(-30deg)"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
        <span class="qa-label">镇长</span>
      </button>
      <button class="qa-btn anim-scale-in anim-delay-3" aria-label="宠物" @click="$router.push(hasPets ? '/profile' : '/pet/create')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        <span class="qa-label">{{ hasPets ? '宠物管理' : '宠物建档' }}</span>
      </button>
    </div>

    <!-- Hero Task Card -->
    <div class="hero-card anim-fade-up anim-delay-3">
      <div class="hero-left">
        <div class="hero-tag" :class="taskStatusColor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13l4 4L19 7"/></svg>
          {{ taskStatusText }}
        </div>
        <div class="hero-score">{{ animatedScore }}<span class="hero-score-unit">%</span></div>
        <div class="hero-progress">
          <div class="hero-progress-bar">
            <div class="hero-progress-fill" :style="{ width: todayScore + '%' }" :class="taskStatusColor"></div>
          </div>
        </div>
        <button class="hero-cta" @click="$router.push('/tasks/' + currentPetId)">
          管理任务
        </button>
      </div>
      <div class="hero-right">
        <div class="hero-model-container">
          <div class="hero-model-glow"></div>
          <div class="hero-model-shadow"></div>
          <model-viewer
            src="/qiuqiu.glb"
            alt="球球 镇长 3D 模型"
            interaction-prompt="none"
            camera-orbit="0deg 70deg 1.5m"
            field-of-view="35deg"
            shadow-intensity="0.3"
            shadow-softness="1"
            exposure="1.1"
            loading="eager"
            reveal="auto"
            class="hero-model"
          ></model-viewer>
        </div>
      </div>
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard">
      <WeightCarousel
        :items="weightCarouselItems"
        class="anim-fade-up anim-delay-4"
        @record="$router.push('/record/create?type=weight')"
      />

      <div class="dash-card anim-fade-up anim-delay-4" @click="$router.push('/health-reminders')">
        <div class="dash-icon green"></div>
        <div class="dash-value">{{ dueReminderCount }}<span class="dash-unit">条</span></div>
        <div class="dash-label">健康提醒</div>
        <div class="dash-action">
          查看全部
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19L19 6m0 0v12.48M19 6H6.52"/></svg>
        </div>
      </div>

      <div class="dash-card accent-bg anim-fade-up anim-delay-5">
        <div class="dash-icon green"></div>
        <div class="dash-value" v-html="petAgeText"></div>
        <div class="dash-label">{{ mainPetName }}的年龄</div>
      </div>

      <div class="dash-card green-bg anim-fade-up anim-delay-5" @click="$router.push('/profile')">
        <div class="dash-icon gray"></div>
        <div class="dash-value">{{ todayDietCount }}<span class="dash-unit">次 / 今日</span></div>
        <div class="dash-label">饮食记录</div>
        <div class="dash-action" @click.stop="$router.push('/record/create?type=diet')">
          添加
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h6m6 0h-6m0 0V6m0 6v6"/></svg>
        </div>
      </div>
    </div>

    <!-- Onboarding Guide (shown when no pets) -->
  </div>

  <!-- Tab Bar -->
  <TabBar active-tab="home" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TabBar from '../components/TabBar.vue'
import WeightCarousel from '../components/WeightCarousel.vue'
import { useAuth } from '../composables/useAuth'
import { usePets } from '../composables/usePets'
import { useDietLogs } from '../composables/useDietLogs'
import { useHealthRecords } from '../composables/useHealthRecords'
import { useHealthReminders } from '../composables/useHealthReminders'
import { useNotifications } from '../composables/useNotifications'
import { useDailyTasks } from '../composables/useDailyTasks'
import { supabase } from '../lib/supabase'

const router = useRouter()
const { profile } = useAuth()
const { pets, fetchPets } = usePets()
const hasPets = computed(() => pets.value.length > 0)
const { dietLogs, fetchDietLogs } = useDietLogs()
const { weightRecords, fetchHealthRecords } = useHealthRecords()
const { dueCount: dueReminderCount, fetchReminders } = useHealthReminders()
const { unreadCount, fetchNotifications } = useNotifications()

const appShell = ref(null)
const animatedScore = ref(0)

// 主要宠物（第一只）
const mainPet = computed(() => pets.value[0] || null)

// 每日任务评分
const currentPetId = computed(() => mainPet.value?.id)
const { todayScore, todayProgress } = useDailyTasks(currentPetId)
const targetScore = computed(() => todayScore.value || 0)
const userName = computed(() => profile.value?.display_name || profile.value?.username || '铲屎官')
const todayWeight = computed(() => {
  const w = weightRecords.value[0]?.weight_kg
  return w ? Number(w).toFixed(1) : '--'
})
const petAgeText = computed(() => {
  const p = mainPet.value
  if (!p) return '— 岁 — 月'
  return `${p.age_years || 0}<span class="dash-unit">岁 ${p.age_months || 0} 月</span>`
})
const todayDietCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return dietLogs.value.filter(d => (d.logged_date || '').slice(0, 10) === today).length
})
const mainPetPhoto = computed(() => mainPet.value?.avatar_url || null)
const mainPetName = computed(() => mainPet.value?.name || '毛毛')

// 任务状态
const taskStatusText = computed(() => {
  if (todayProgress.value.totalCount === 0) return '暂无到期任务'
  if (todayProgress.value.completedCount === todayProgress.value.totalCount) return '今日任务全部完成'
  return `今日完成 ${todayProgress.value.completedCount}/${todayProgress.value.totalCount} 项`
})

const taskStatusColor = computed(() => {
  const s = todayScore.value
  if (s >= 80) return 'good'
  if (s >= 50) return 'warn'
  return 'bad'
})

// 每只宠物的最新体重（独立查询，不受共享 composable 状态影响）
const petLatestWeight = ref({})
async function fetchPerPetWeights() {
  if (!pets.value.length) return
  const uid = (await supabase.auth.getSession())?.data?.session?.user?.id
  if (!uid) return
  for (const p of pets.value) {
    const { data } = await supabase
      .from('health_records')
      .select('weight_kg')
      .eq('profile_id', uid)
      .eq('record_type', 'weight')
      .eq('pet_id', p.id)
      .order('record_time', { ascending: false })
      .limit(1)
    if (data?.length && data[0].weight_kg != null) {
      petLatestWeight.value = { ...petLatestWeight.value, [p.id]: data[0].weight_kg }
    }
  }
}

const weightCarouselItems = computed(() => {
  return pets.value.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar_url || p.photo_url,
    weight: petLatestWeight.value[p.id] != null
      ? Number(petLatestWeight.value[p.id]).toFixed(1)
      : (p.weight_kg != null ? Number(p.weight_kg).toFixed(1) : null),
    emoji: p.species === 'dog' ? '🐕' : p.species === 'cat' ? '🐱' : '🐾',
    color: p.species === 'dog' ? 'rgba(139,94,70,.1)' : 'rgba(215,181,147,.2)'
  }))
})

let animFrame = null
let startTime = null

function countUp(ts) {
  if (!startTime) startTime = ts
  const progress = Math.min((ts - startTime) / 1200, 1)
  const ease = 1 - Math.pow(1 - progress, 3)
  animatedScore.value = Math.round(ease * targetScore.value)
  if (progress < 1) animFrame = requestAnimationFrame(countUp)
}

onMounted(async () => {
  setTimeout(() => { animFrame = requestAnimationFrame(countUp) }, 500)

  if (appShell.value) {
    appShell.value.addEventListener('scroll', () => {
      const s = appShell.value.scrollTop
      const header = appShell.value.querySelector('.header')
      if (header) {
        header.style.opacity = Math.max(0, 1 - s / 200)
        header.style.transform = 'translateY(' + (-s * 0.15) + 'px)'
      }
    }, { passive: true })
  }

  // 非阻塞加载：先渲染页面骨架，数据到达后响应式更新
  Promise.all([
    fetchPets(),
    fetchHealthRecords(),
    fetchDietLogs(),
    fetchNotifications()
  ]).then(() => {
    fetchPerPetWeights()
    if (mainPet.value) fetchReminders(mainPet.value.id)
  })
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
.watermark{position:fixed;top:12%;right:-10%;width:min(340px,80vw);aspect-ratio:1;opacity:.035;pointer-events:none;z-index:0;background-repeat:no-repeat;background-size:contain;background-position:center}
.header{position:relative;padding:0 24px;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 2px 12px rgba(139,94,70,.12);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.header-actions{display:flex;gap:12px}
.action-circle{width:41.31px;height:41.31px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:20px;height:20px;color:var(--fg)}
.greeting{margin-top:0}
.greeting-main{font-family:var(--font-display);font-size:20px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--fg)}
.greeting-main .pet-name{color:var(--brown)}
.quick-actions{display:flex;gap:16px;padding:0 24px;position:relative;z-index:1;margin-top:20px}
.qa-btn{width:45px;height:45px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s;flex-shrink:0;position:relative}
.qa-btn:active{transform:scale(.9)}
.qa-btn svg{width:18px;height:18px;color:var(--fg)}
.qa-btn.primary{background:var(--brown);border:none;box-shadow:var(--shadow-btn)}
.qa-btn.primary svg{color:#fff}
.qa-btn .qa-label{position:absolute;bottom:-20px;font-size:11px;color:var(--muted);white-space:nowrap;letter-spacing:.01em}
.hero-card{margin:28px 24px 0;background:var(--card);border-radius:var(--radius-card);box-shadow:var(--shadow-card);border:1px solid var(--border);padding:16px 16px 13px;display:flex;align-items:flex-end;gap:12px;position:relative;z-index:1;overflow:visible}
.hero-card.no-image{min-height:auto;padding:16px 22px}
.hero-left{flex:0 0 48%;display:flex;flex-direction:column;gap:8px;padding-left:3px}
.hero-tag{display:inline-flex;align-items:center;gap:4px;background:rgba(108,138,105,.1);color:var(--green);font-size:11px;font-weight:500;padding:3px 8px;border-radius:var(--radius-btn);width:100%;box-sizing:border-box;letter-spacing:.02em;white-space:nowrap}
.hero-tag svg{width:10px;height:10px;flex-shrink:0}
.hero-score{font-family:var(--font-num);font-size:clamp(28px,8vw,42px);font-weight:600;line-height:1;letter-spacing:-.03em;color:var(--fg)}
.hero-score-unit{font-size:20px;font-weight:500;color:var(--muted)}
.hero-cta{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--brown);color:#fff;font-size:13px;font-weight:500;padding:10px 19px;border-radius:var(--radius-btn);box-shadow:var(--shadow-btn);border:none;cursor:pointer;width:100%;box-sizing:border-box;transition:transform .15s;letter-spacing:.01em;white-space:nowrap}
.hero-cta:active{transform:scale(.96)}
.hero-cta svg{width:12px;height:12px}
.hero-tag.good{background:rgba(108,138,105,.1);color:var(--green)}
.hero-tag.warn{background:rgba(255,149,0,.1);color:#FF9500}
.hero-tag.bad{background:rgba(255,59,48,.1);color:#FF3B30}
.hero-progress{margin-top:0;width:100%}
.hero-progress-bar{width:100%;height:4px;border-radius:2px;background:rgba(0,0,0,.06);overflow:hidden}
.hero-progress-fill{height:100%;border-radius:2px;transition:width .4s ease}
.hero-progress-fill.good{background:linear-gradient(90deg,var(--green),#34C759)}
.hero-progress-fill.warn{background:linear-gradient(90deg,#FF9500,#FFCC02)}
.hero-progress-fill.bad{background:linear-gradient(90deg,#FF3B30,#FF9500)}
.hero-right{width:48%;display:flex;align-items:flex-end;justify-content:flex-start;z-index:10;position:relative}
.hero-pet-img{width:80%;height:auto;object-fit:contain;object-position:center bottom;pointer-events:none;user-select:none;display:block}
.hero-model-container{width:100%;height:clamp(120px,35vw,180px);position:relative;display:flex;align-items:flex-end;justify-content:center}
.hero-model-glow{position:absolute;top:40%;left:50%;width:100px;height:100px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,184,154,0.3) 0%,rgba(255,212,196,0.2) 40%,transparent 70%);filter:blur(16px);animation:hero-pulse 3s ease-in-out infinite;pointer-events:none;z-index:0}
.hero-model-shadow{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:60px;height:6px;border-radius:50%;background:rgba(139,94,70,0.1);filter:blur(3px);animation:hero-shadow 3s ease-in-out infinite;pointer-events:none;z-index:0}
.hero-model{width:100%;height:100%;--poster-color:transparent;background:transparent!important;position:relative;z-index:1;pointer-events:none;transform:scale(1.3);transform-origin:center bottom}
.hero-model::part(default-progress-bar){display:none}
@keyframes hero-pulse{0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}}
@keyframes hero-shadow{0%,100%{transform:translateX(-50%) scaleX(1);opacity:0.6}50%{transform:translateX(-50%) scaleX(0.9);opacity:0.4}}
.dashboard{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:28px 24px 0;position:relative;z-index:1}
.dash-card{background:var(--card);border-radius:var(--radius-card);box-shadow:var(--shadow-card);border:1px solid var(--border);padding:24px;width:100%;aspect-ratio:1;display:flex;flex-direction:column;gap:8px;cursor:pointer;transition:transform .2s;position:relative;overflow:hidden}
.dash-card:active{transform:scale(.97)}
.dash-card.accent-bg{background:rgba(215,181,147,.12)}
.dash-card.green-bg{background:rgba(108,138,105,.08)}
.dash-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px}
.dash-icon.brown{background:rgba(139,94,70,.1)}
.dash-icon.beige{background:rgba(215,181,147,.2)}
.dash-icon.green{background:rgba(108,138,105,.12)}
.dash-icon.gray{background:rgba(0,0,0,.04)}
.dash-value{font-family:var(--font-num);font-size:clamp(24px,7vw,36px);font-weight:600;line-height:1.1;letter-spacing:-.02em;color:var(--fg)}
.dash-unit{font-size:16px;font-weight:400;color:var(--muted);margin-left:2px}
.dash-label{font-size:14px;color:var(--muted);letter-spacing:.01em}
.dash-action{font-size:14px;color:var(--brown);font-weight:500;display:flex;align-items:center;gap:4px;margin-top:auto;letter-spacing:.01em}
.dash-action svg{width:14px;height:14px}
.notif-badge{position:absolute;top:8px;right:8px;min-width:16px;height:16px;border-radius:8px;background:#FF3B30;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1}
</style>
