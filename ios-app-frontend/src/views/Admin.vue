<template>
  <div class="app-shell">
    <header class="header anim-fade-up">
      <div class="header-row">
        <button class="back-btn" @click="$router.back()" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 class="page-title">管理员控制台</h1>
        <span class="admin-badge">Admin</span>
      </div>
    </header>

    <div v-if="loading" class="list-body">
      <div v-for="i in 3" :key="i" class="skeleton-card shimmer"></div>
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="stats-grid anim-fade-up anim-delay-1">
        <div v-for="s in statCards" :key="s.label" class="stat-card" :style="{ borderLeftColor: s.accent }">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>

      <!-- 最近评价 -->
      <div class="section anim-fade-up anim-delay-2">
        <div class="section-header">
          <h2 class="section-title">最近评价</h2>
          <span class="section-count">共 {{ recentReviews.length }} 条</span>
        </div>
        <div v-if="recentReviews.length" class="review-list">
          <div v-for="r in recentReviews" :key="r.id" class="review-item">
            <div class="review-rating">{{ r.overall_rating ?? '—' }}</div>
            <div class="review-info">
              <div class="review-product">{{ r.products?.name ?? '—' }}</div>
              <div class="review-text">{{ r.review_text || '（无内容）' }}</div>
              <div class="review-meta">@{{ r.profiles?.username ?? '未知' }} · {{ formatTime(r.created_at) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-mini">暂无最近评价</div>
      </div>

      <!-- 被标记用户 -->
      <div class="section anim-fade-up anim-delay-3">
        <div class="section-header">
          <h2 class="section-title">被标记用户</h2>
        </div>
        <div v-if="flaggedUsers.length" class="user-list">
          <div v-for="u in flaggedUsers" :key="u.id" class="user-item">
            <div class="user-avatar">{{ (u.display_name || u.username || '?').charAt(0) }}</div>
            <div class="user-info">
              <div class="user-name">{{ u.display_name || u.username }}</div>
              <div class="user-reason">{{ u.flag_reason || '已标记' }}</div>
            </div>
            <div class="user-score">信任分 {{ u.trust_score ?? 0 }}</div>
          </div>
        </div>
        <div v-else class="empty-mini">
          <span style="color:var(--green)">社区秩序良好</span>，暂无被标记用户
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'

const router = useRouter()
const { profile } = useAuth()
const loading = ref(true)
const stats = ref({})
const recentReviews = ref([])
const flaggedUsers = ref([])

const isAdmin = computed(() => profile.value?.is_admin)

const statCards = computed(() => [
  { label: '总用户', value: stats.value.userCount ?? 0, accent: '#7BA7BC' },
  { label: '总宠物', value: stats.value.petCount ?? 0, accent: '#A8C5A0' },
  { label: '产品数', value: stats.value.productCount ?? 0, accent: '#E8A87C' },
  { label: '评价数', value: stats.value.reviewCount ?? 0, accent: '#FF7A59' },
  { label: '近7天新评价', value: stats.value.reviewLast7d ?? 0, accent: '#B59BD8' },
  { label: '被标记用户', value: stats.value.flaggedCount ?? 0, accent: '#ff3b30' },
])

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

async function loadStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const [users, pets, products, reviews, recent, flagged, recentCount] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('pets').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('product_reviews').select('id', { count: 'exact', head: true }),
    supabase.from('product_reviews').select('id, overall_rating, review_text, created_at, profiles(username), products(name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select('id, username, display_name, trust_score, flag_reason').eq('is_flagged', true).limit(5),
    supabase.from('product_reviews').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo)
  ])

  stats.value = {
    userCount: users.count ?? 0,
    petCount: pets.count ?? 0,
    productCount: products.count ?? 0,
    reviewCount: reviews.count ?? 0,
    reviewLast7d: recentCount.count ?? 0,
    flaggedCount: flagged.data?.length ?? 0
  }

  recentReviews.value = recent.data || []
  flaggedUsers.value = flagged.data || []
}

onMounted(async () => {
  if (!isAdmin.value) {
    loading.value = false
    router.replace('/profile')
    return
  }
  await loadStats()
  loading.value = false
})
</script>

<style scoped>
.app-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(88px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.header{position:relative;padding:4px 24px 0;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.back-btn{width:36px;height:36px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s;flex-shrink:0}
.back-btn:active{transform:scale(.9)}
.back-btn svg{width:18px;height:18px;color:var(--fg)}
.page-title{font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--fg)}
.admin-badge{font-size:10px;font-weight:600;color:#4A7A91;background:rgba(123,167,188,.12);padding:4px 10px;border-radius:var(--radius-btn)}
.list-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.skeleton-card{height:80px;border-radius:20px}
.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:16px 20px 0}
.stat-card{background:var(--card);border-radius:16px;padding:14px;box-shadow:var(--shadow-card);border:1px solid var(--border);border-left:3px solid transparent}
.stat-value{font-size:24px;font-weight:700;color:var(--fg);font-family:var(--font-num)}
.stat-label{font-size:11px;color:var(--muted);margin-top:4px}
.section{padding:20px 20px 0}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.section-title{font-size:17px;font-weight:700;color:var(--fg)}
.section-count{font-size:12px;color:var(--muted);background:rgba(0,0,0,.04);padding:3px 10px;border-radius:var(--radius-btn)}
.review-list{background:var(--card);border-radius:20px;overflow:hidden;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.review-item{display:flex;align-items:flex-start;gap:12px;padding:14px;border-bottom:1px solid var(--border)}
.review-item:last-child{border-bottom:none}
.review-rating{width:32px;height:32px;border-radius:50%;background:rgba(255,122,89,.1);color:#FF7A59;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.review-info{flex:1;min-width:0}
.review-product{font-size:13px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.review-text{font-size:12px;color:var(--muted);margin-top:2px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.review-meta{font-size:11px;color:var(--muted);margin-top:4px;opacity:.6}
.user-list{background:var(--card);border-radius:20px;overflow:hidden;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.user-item{display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid var(--border)}
.user-item:last-child{border-bottom:none}
.user-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,59,48,.1);color:#FF3B30;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0}
.user-info{flex:1;min-width:0}
.user-name{font-size:13px;font-weight:600;color:var(--fg)}
.user-reason{font-size:11px;color:#FF3B30;margin-top:2px}
.user-score{font-size:11px;color:var(--muted);background:rgba(255,59,48,.08);padding:3px 8px;border-radius:var(--radius-btn);flex-shrink:0}
.empty-mini{text-align:center;padding:24px 16px;font-size:14px;color:var(--muted);background:var(--card);border-radius:20px;border:1px solid var(--border)}
.shimmer{background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.status-bar-spacer{height:var(--safe-top)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}.anim-delay-2{animation-delay:.2s}.anim-delay-3{animation-delay:.3s}
</style>
