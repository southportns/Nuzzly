<template>
  <div class="edit-shell" ref="shellRef" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <!-- 下拉刷新指示器 -->
    <div class="pull-refresh" :class="{ active: isRefreshing, pulling: isPulling }" :style="{ transform: `translateY(${pullDistance}px)` }">
      <svg v-if="!isRefreshing" class="refresh-icon" :style="{ transform: `rotate(${pullDistance * 2}deg)` }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
      <svg v-else class="refresh-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
    </div>

    <PageHeader title="长期追踪" />

    <div class="seg-bar">
      <div v-for="s in SEGS" :key="s.value" class="seg-item" :class="{ active: tab === s.value }" @click="switchTab(s.value)">
        {{ s.label }}
        <span v-if="counts[s.value]" class="seg-badge">{{ counts[s.value] }}</span>
      </div>
    </div>

    <div class="list-body">
      <div v-if="loading" class="loading-list">
        <div v-for="i in 3" :key="i" class="sk-card">
          <div class="sk-img shimmer"></div>
          <div class="sk-info"><div class="sk-line w60 shimmer"></div><div class="sk-line w90 shimmer"></div></div>
        </div>
      </div>

      <div v-else-if="schedules.length" class="schedule-list">
        <div
          v-for="s in schedules"
          :key="s.id"
          v-memo="[s.id, s.status, s.followup_day, s.due_date, s.product_reviews?.products?.image_url, s.product_reviews?.products?.name, s.product_reviews?.products?.brand, s.product_reviews?.pets?.name, s.product_reviews?.pets?.breed]"
          class="schedule-card anim-fade-up"
          @click="onTap(s)"
        >
          <div class="card-img-area">
            <img v-if="s.product_reviews?.products?.image_url" :src="s.product_reviews.products.image_url" :alt="s.product_reviews.products.name" loading="lazy" />
            <span v-else class="img-ph">{{ s.product_reviews?.products?.brand?.slice(0,1) || '🐾' }}</span>
          </div>
          <div class="card-content">
            <div class="card-brand">{{ s.product_reviews?.products?.brand }}</div>
            <div class="card-name">{{ s.product_reviews?.products?.name }}</div>
            <div class="card-meta">
              <span class="meta-pet">{{ s.product_reviews?.pets?.name }} · {{ s.product_reviews?.pets?.breed || '未知' }}</span>
            </div>
            <div class="card-foot">
              <span class="day-tag">Day {{ s.followup_day }}</span>
              <span class="due-tag">到期：{{ formatDate(s.due_date) }}</span>
              <span class="status-tag" :class="s.status">{{ statusLabel(s.status) }}</span>
            </div>
          </div>
          <svg v-if="s.status === 'pending' || s.status === 'reminded'" class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      <EmptyState
        v-else
        :icon="tab === 'pending' ? '📝' : tab === 'completed' ? '✅' : '⏰'"
        :title="emptyTitle"
        :description="emptyDesc"
        :action-text="tab === 'pending' ? '去产品库评价' : ''"
        @action="$router.push('/products')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFollowups } from '../composables/useFollowups'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'

const router = useRouter()
const { schedules, loading, fetchSchedules, STATUS_LABEL } = useFollowups()

// 下拉刷新
const shellRef = ref(null)
const pullDistance = ref(0)
const isRefreshing = ref(false)
const isPulling = ref(false)
let startY = 0
const PULL_THRESHOLD = 60

function onTouchStart(e) {
  if (isRefreshing.value) return
  if (shellRef.value && shellRef.value.scrollTop === 0) {
    startY = e.touches[0].clientY
    isPulling.value = true
  }
}

function onTouchMove(e) {
  if (!isPulling.value || isRefreshing.value) return
  const currentY = e.touches[0].clientY
  const distance = currentY - startY
  if (distance > 0) {
    pullDistance.value = Math.min(distance * 0.5, 100)
  }
}

async function onTouchEnd() {
  if (!isPulling.value || isRefreshing.value) return
  isPulling.value = false
  if (pullDistance.value >= PULL_THRESHOLD) {
    isRefreshing.value = true
    pullDistance.value = 50
    await refresh()
    isRefreshing.value = false
  }
  pullDistance.value = 0
}

async function refresh() {
  await loadCounts()
  await fetchSchedules(tab.value)
}

const SEGS = [
  { value: 'pending', label: '待填写' },
  { value: 'completed', label: '已完成' },
  { value: 'overdue', label: '已过期' }
]
const tab = ref('pending')
const counts = ref({ pending: 0, completed: 0, overdue: 0 })

const emptyTitle = computed(() => {
  if (tab.value === 'pending') return '暂无待填写的追踪'
  if (tab.value === 'completed') return '暂无已完成的追踪'
  return '暂无过期追踪'
})
const emptyDesc = computed(() => {
  if (tab.value === 'pending') return '提交产品评价后，系统会自动生成 7/14/30/60/90/180 天追踪计划'
  return ''
})

function statusLabel(s) { return STATUS_LABEL[s] || s }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

async function loadCounts() {
  // 并行查三个状态的数量（silent 模式不污染 schedules.value）
  const [pending, completed, overdue] = await Promise.all([
    fetchSchedules('pending', { silent: true }),
    fetchSchedules('completed', { silent: true }),
    fetchSchedules('overdue', { silent: true })
  ])
  counts.value = { pending: pending.length, completed: completed.length, overdue: overdue.length }
}

async function switchTab(v) {
  tab.value = v
  await fetchSchedules(v)
}

function onTap(s) {
  if (s.status === 'pending' || s.status === 'reminded' || s.status === 'overdue') {
    router.push('/followups/' + s.id)
  }
}

onMounted(async () => {
  await loadCounts()
  await fetchSchedules('pending')
})
</script>

<style scoped>
/* 下拉刷新 */
.pull-refresh{position:absolute;top:-50px;left:50%;transform:translateX(-50%);width:40px;height:40px;display:flex;align-items:center;justify-content:center;transition:transform 0.3s ease;pointer-events:none;z-index:10}
.pull-refresh.active{transform:translateX(-50%) translateY(50px)}
.refresh-icon{width:24px;height:24px;color:var(--brown);transition:transform 0.2s}
.refresh-icon.spinning{animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

.edit-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(100px + var(--safe-bottom));display:flex;flex-direction:column;position:relative}
.seg-bar{display:flex;gap:4px;margin:0 20px 16px;padding:4px;background:rgba(0,0,0,.03);border-radius:var(--radius-btn)}
.seg-item{flex:1;text-align:center;padding:10px 4px;border-radius:var(--radius-btn);font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:4px}
.seg-item.active{background:var(--card);color:var(--brown);font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.seg-badge{font-size:10px;background:var(--brown);color:#fff;padding:1px 6px;border-radius:var(--radius-btn);font-weight:600}
.list-body{flex:1;padding:0 20px;overflow-y:auto}
.schedule-list{display:flex;flex-direction:column;gap:12px}
.schedule-card{display:flex;align-items:center;gap:14px;padding:14px;background:var(--card);border-radius:20px;box-shadow:var(--shadow-card);border:1px solid var(--border);cursor:pointer;transition:transform .15s}
.schedule-card:active{transform:scale(.98)}
.card-img-area{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,rgba(215,181,147,.18),rgba(215,181,147,.06));display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.card-img-area img{width:100%;height:100%;object-fit:cover}
.img-ph{font-size:24px;color:var(--brown);opacity:.4;font-weight:700}
.card-content{flex:1;min-width:0}
.card-brand{font-size:11px;color:var(--muted);font-weight:500}
.card-name{font-size:14px;font-weight:600;color:var(--fg);margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-meta{font-size:11px;color:var(--muted)}
.card-foot{display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap}
.day-tag{font-size:11px;font-weight:600;color:var(--brown);background:rgba(139,94,70,.08);padding:3px 8px;border-radius:var(--radius-btn)}
.due-tag{font-size:10px;color:var(--muted)}
.status-tag{font-size:10px;padding:2px 8px;border-radius:var(--radius-btn);font-weight:500}
.status-tag.pending,.status-tag.reminded{color:#FF9500;background:rgba(255,149,0,.1)}
.status-tag.completed{color:var(--green);background:rgba(108,138,105,.12)}
.status-tag.overdue{color:#FF3B30;background:rgba(255,59,48,.1)}
.card-arrow{width:18px;height:18px;color:var(--muted);flex-shrink:0}
.loading-list{display:flex;flex-direction:column;gap:12px}
.sk-card{display:flex;gap:14px;padding:14px;background:var(--card);border-radius:20px;border:1px solid var(--border)}
.sk-img{width:64px;height:64px;border-radius:16px;flex-shrink:0}
.sk-info{flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px}
.sk-line{height:12px;border-radius:6px}
.sk-line.w60{width:60%}
.sk-line.w90{width:90%}
.shimmer{background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
</style>
