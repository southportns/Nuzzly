<template>
  <div class="app-shell" ref="appShell">
    <div class="status-bar-spacer"></div>

    <!-- Header -->
    <header class="header anim-fade-up">
      <div class="header-row">
        <div class="avatar">
          <img src="/mqpyqgao-logo.png" alt="nuzzly logo">
        </div>
        <div class="header-actions">
          <button class="action-circle anim-fade-up anim-delay-1" aria-label="搜索" style="margin-top:18px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 17l4 4M3 11a8 8 0 1 0 16 0a8 8 0 0 0-16 0"/></svg>
          </button>
          <button class="action-circle anim-fade-up anim-delay-2" aria-label="通知" style="margin-top:18px;position:relative" @click="$router.push('/notifications')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.134 11C18.715 16.375 21 18 21 18H3s3-2.133 3-9.6c0-1.697.632-3.325 1.757-4.525S10.41 2 12 2q.507 0 1 .09M19 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m-5.27 13a2 2 0 0 1-3.46 0"/></svg>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>
        </div>
      </div>
      <div class="greeting">
        <h1 class="greeting-main">HI,<span class="pet-name">陈家军</span><br>欢迎来到毛球镇</h1>
      </div>
    </header>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="qa-btn primary anim-scale-in anim-delay-2" aria-label="AI 问诊">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.4a2 2 0 0 0 1.3 1.3L21 12l-5.8 2.3a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.4a2 2 0 0 0-1.3-1.3L3 12l5.8-2.3a2 2 0 0 0 1.3-1.3z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></svg>
        <span class="qa-label">AI 诊</span>
      </button>
      <button class="qa-btn anim-scale-in anim-delay-3" aria-label="疫苗提醒">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.272 10.445L18 2m-8.684 8.632L5 2m7.762 8.048L8.835 2m5.525 0l-1.04 2.5M6 16a6 6 0 1 0 12 0a6 6 0 0 0-12 0"/></svg>
        <span class="qa-label">疫苗</span>
      </button>
      <button class="qa-btn anim-scale-in anim-delay-3" aria-label="产品库" @click="$router.push('/products')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        <span class="qa-label">产品</span>
      </button>
    </div>

    <!-- Hero Health Card -->
    <div class="hero-card anim-fade-up anim-delay-3">
      <div class="hero-left">
        <div class="hero-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13l4 4L19 7"/></svg>
          健康状况良好
        </div>
        <div class="hero-score">{{ animatedScore }}</div>
        <div class="hero-score-label">综合健康评分</div>
        <button class="hero-cta">
          查看报告
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19L19 6m0 0v12.48M19 6H6.52"/></svg>
        </button>
      </div>
      <div class="hero-right">
        <img :src="mainPetPhoto" :alt="mainPetName" class="hero-pet-img" loading="lazy">
      </div>
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard">
      <div class="dash-card anim-fade-up anim-delay-4">
        <div class="dash-icon brown"></div>
        <div class="dash-value">4.8<span class="dash-unit">kg</span></div>
        <div class="dash-label">今日体重</div>
        <div class="dash-action" @click="$router.push('/record/create?type=weight')">
          记录
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19L19 6m0 0v12.48M19 6H6.52"/></svg>
        </div>
      </div>

      <div class="dash-card diary anim-fade-up anim-delay-4">
        <div class="dash-icon beige"></div>
        <div class="diary-title">养宠日记</div>
        <div class="diary-desc">记录毛毛每天的点滴成长</div>
        <div class="diary-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19L19 6m0 0v12.48M19 6H6.52"/></svg>
        </div>
      </div>

      <div class="dash-card accent-bg anim-fade-up anim-delay-5">
        <div class="dash-icon green"></div>
        <div class="dash-value">2<span class="dash-unit">岁 3 月</span></div>
        <div class="dash-label">毛毛的年龄</div>
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
    <OnboardingGuide v-if="!hasPets" />

    <div class="bottom-spacer"></div>
  </div>

  <!-- Tab Bar -->
  <TabBar active-tab="home" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TabBar from '../components/TabBar.vue'
import OnboardingGuide from '../components/OnboardingGuide.vue'
import { useAuth } from '../composables/useAuth'
import { usePets } from '../composables/usePets'
import { useDietLogs } from '../composables/useDietLogs'
import { useHealthRecords } from '../composables/useHealthRecords'
import { useNotifications } from '../composables/useNotifications'

const router = useRouter()
const { profile } = useAuth()
const { pets, fetchPets } = usePets()
const hasPets = computed(() => pets.value.length > 0)
const { dietLogs, fetchDietLogs } = useDietLogs()
const { weightRecords, fetchHealthRecords } = useHealthRecords()
const { unreadCount, fetchNotifications } = useNotifications()

const appShell = ref(null)
const animatedScore = ref(0)
const targetScore = computed(() => profile.value?.trust_score || 96)

// 主要宠物（第一只）
const mainPet = computed(() => pets.value[0] || null)
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
const mainPetPhoto = computed(() => mainPet.value?.photo_url || '/cat.png')
const mainPetName = computed(() => mainPet.value?.name || '毛毛')

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

  // 拉取数据（失败时 composables 内部降级 mock）
  await Promise.all([
    fetchPets(),
    fetchHealthRecords(),
    fetchDietLogs(),
    fetchNotifications()
  ])
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
.watermark{position:fixed;top:12%;right:-10%;width:340px;height:340px;opacity:.035;pointer-events:none;z-index:0;background-repeat:no-repeat;background-size:contain;background-position:center}
.header{position:relative;padding:20px 24px 0;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 2px 12px rgba(139,94,70,.12);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.header-actions{display:flex;gap:12px}
.action-circle{width:44px;height:44px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:20px;height:20px;color:var(--fg)}
.greeting{margin-top:20px}
.greeting-main{font-family:var(--font-display);font-size:34px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--fg)}
.greeting-main .pet-name{color:var(--brown)}
.quick-actions{display:flex;gap:16px;padding:24px 24px 0;position:relative;z-index:1}
.qa-btn{width:64px;height:64px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s;flex-shrink:0;position:relative}
.qa-btn:active{transform:scale(.9)}
.qa-btn svg{width:26px;height:26px;color:var(--fg)}
.qa-btn.primary{background:var(--brown);border:none;box-shadow:var(--shadow-btn)}
.qa-btn.primary svg{color:#fff}
.qa-btn .qa-label{position:absolute;bottom:-20px;font-size:11px;color:var(--muted);white-space:nowrap;letter-spacing:.01em}
.hero-card{margin:36px 24px 0;background:var(--card);border-radius:var(--radius-card);box-shadow:var(--shadow-card);border:1px solid var(--border);padding:28px 28px 24px;display:flex;align-items:center;gap:20px;position:relative;z-index:1;overflow:visible;min-height:200px}
.hero-left{flex:0 0 42%;display:flex;flex-direction:column;gap:12px}
.hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(108,138,105,.1);color:var(--green);font-size:13px;font-weight:500;padding:5px 12px;border-radius:var(--radius-btn);width:fit-content;letter-spacing:.02em}
.hero-tag svg{width:14px;height:14px}
.hero-score{font-family:var(--font-num);font-size:56px;font-weight:600;line-height:1;letter-spacing:-.03em;color:var(--fg)}
.hero-score-label{font-size:14px;color:var(--muted);margin-top:-4px}
.hero-cta{display:inline-flex;align-items:center;gap:8px;background:var(--brown);color:#fff;font-size:15px;font-weight:500;padding:14px 24px;border-radius:var(--radius-btn);box-shadow:var(--shadow-btn);border:none;cursor:pointer;width:fit-content;transition:transform .15s;letter-spacing:.01em}
.hero-cta:active{transform:scale(.96)}
.hero-cta svg{width:16px;height:16px}
.hero-right{flex:1;display:flex;align-items:flex-end;justify-content:center;position:relative;min-height:0;padding-bottom:4px}
.hero-pet-img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;object-position:center bottom;pointer-events:none;user-select:none;display:block;transform:scale(1.15);transform-origin:center bottom;position:relative;z-index:10}
.dashboard{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:28px 24px 0;position:relative;z-index:1}
.dash-card{background:var(--card);border-radius:var(--radius-card);box-shadow:var(--shadow-card);border:1px solid var(--border);padding:24px;width:155px;height:155px;display:flex;flex-direction:column;gap:8px;cursor:pointer;transition:transform .2s;position:relative;overflow:hidden}
.dash-card:active{transform:scale(.97)}
.dash-card.accent-bg{background:rgba(215,181,147,.12)}
.dash-card.green-bg{background:rgba(108,138,105,.08)}
.dash-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px}
.dash-icon.brown{background:rgba(139,94,70,.1)}
.dash-icon.beige{background:rgba(215,181,147,.2)}
.dash-icon.green{background:rgba(108,138,105,.12)}
.dash-icon.gray{background:rgba(0,0,0,.04)}
.dash-value{font-family:var(--font-num);font-size:36px;font-weight:600;line-height:1.1;letter-spacing:-.02em;color:var(--fg)}
.dash-unit{font-size:16px;font-weight:400;color:var(--muted);margin-left:2px}
.dash-label{font-size:14px;color:var(--muted);letter-spacing:.01em}
.dash-action{font-size:14px;color:var(--brown);font-weight:500;display:flex;align-items:center;gap:4px;margin-top:auto;letter-spacing:.01em}
.dash-action svg{width:14px;height:14px}
.dash-card.diary{justify-content:space-between}
.diary-title{font-family:var(--font-display);font-size:20px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.diary-desc{font-size:13px;color:var(--muted);line-height:1.5}
.diary-arrow{width:36px;height:36px;border-radius:50%;background:var(--brown);display:flex;align-items:center;justify-content:center;align-self:flex-end}
.diary-arrow svg{width:16px;height:16px;color:#fff}
.bottom-spacer{height:calc(80px + var(--safe-bottom))}
.status-bar-spacer{height:var(--safe-top)}
.notif-badge{position:absolute;top:8px;right:8px;min-width:16px;height:16px;border-radius:8px;background:#FF3B30;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1}
</style>
