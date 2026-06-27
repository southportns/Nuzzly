<template>
  <div class="detail-shell">
    <header class="detail-header">
      <button class="back-btn" @click="$router.back()" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="header-actions">
        <button class="action-icon" :class="{ active: bookmarked }" @click="onBookmark">
          <svg viewBox="0 0 24 24" :fill="bookmarked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="shimmer-block"></div>
      <div class="shimmer-line w60"></div>
      <div class="shimmer-line w90"></div>
    </div>

    <template v-else-if="product">
      <!-- 产品基础信息 -->
      <div class="hero anim-fade-up">
        <div class="hero-img-area">
          <img v-if="product.image_url" :src="product.image_url" :alt="product.name" loading="lazy" />
          <span v-else class="hero-placeholder">{{ product.brand?.slice(0,1) || '🐾' }}</span>
        </div>
        <div class="hero-info">
          <div class="hero-brand">{{ product.product_categories?.name || '产品' }} · {{ product.brand }}</div>
          <h1 class="hero-name">{{ product.name }}</h1>
          <p v-if="product.description" class="hero-desc">{{ product.description }}</p>
          <div class="hero-tags">
            <span v-if="product.price_min" class="tag price">¥{{ Number(product.price_min) }}<template v-if="product.price_max && product.price_max !== product.price_min">-{{ Number(product.price_max) }}</template></span>
            <span v-if="product.origin_country" class="tag">产地：{{ product.origin_country }}</span>
            <span class="tag">{{ speciesLabel }}</span>
            <span class="tag">{{ ageLabel }}</span>
          </div>
          <button class="review-btn" @click="$router.push('/review/create?productId=' + product.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            提交使用反馈
          </button>
        </div>
      </div>

      <!-- 产品标签 -->
      <div v-if="productTags.length" class="tag-cloud anim-fade-up anim-delay-1">
        <span v-for="t in productTags" :key="t.id" class="cloud-tag" :style="{ color: tagColor(t.tag_type), background: tagColor(t.tag_type) + '14' }">
          {{ tagLabel(t.tag_type) }} · {{ t.tag_value }}
        </span>
      </div>

      <!-- 指标卡 -->
      <div class="stats-grid anim-fade-up anim-delay-2">
        <div class="stat-card">
          <div class="stat-label">综合评分</div>
          <div class="stat-value-row"><span class="stat-value">{{ avgRating ?? '--' }}</span><span class="stat-unit">/5</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">软便反馈率</div>
          <div class="stat-value-row"><span class="stat-value">{{ stoolRateLabel }}</span></div>
          <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: stoolRatePct + '%', background: '#FF3B30' }"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">复购率</div>
          <div class="stat-value-row"><span class="stat-value">{{ repurchaseRateLabel }}</span></div>
          <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: repurchaseRatePct + '%', background: 'var(--green)' }"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">透明度评分</div>
          <div class="stat-value-row"><span class="stat-value">{{ product.transparency_score ?? '--' }}</span><span class="stat-unit">/100</span></div>
        </div>
      </div>

      <!-- 长期监控指标 -->
      <div v-if="monitorTags.length" class="monitor-section anim-fade-up anim-delay-3">
        <h2 class="section-title">长期监控指标</h2>
        <div class="monitor-chips">
          <div v-for="m in monitorTags" :key="m.label" class="monitor-chip">
            <span class="monitor-priority" :style="{ color: m.color }">{{ m.priority }}</span>
            <span class="monitor-label">{{ m.label }}</span>
            <span class="monitor-value">{{ m.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 风险情报摘要 -->
      <div v-if="riskSummary" class="risk-intel-section anim-fade-up anim-delay-3">
        <h2 class="section-title">风险情报</h2>
        <div class="risk-intel-card">
          <div class="risk-intel-grid">
            <div class="risk-intel-item">
              <div class="risk-intel-label">风险事件</div>
              <div class="risk-intel-value" :class="riskSummary.total > 3 ? 'danger' : riskSummary.total > 0 ? 'warn' : 'ok'">{{ riskSummary.total }}</div>
            </div>
            <div class="risk-intel-item">
              <div class="risk-intel-label">严重/高风险</div>
              <div class="risk-intel-value" :class="riskSummary.highCount > 0 ? 'danger' : 'ok'">{{ riskSummary.highCount }}</div>
            </div>
            <div class="risk-intel-item">
              <div class="risk-intel-label">已解决</div>
              <div class="risk-intel-value ok">{{ riskSummary.resolved }}</div>
            </div>
          </div>
          <div v-if="riskSummary.recentEvent" class="risk-intel-recent">
            <span class="risk-intel-recent-label">最近事件：</span>
            <span class="risk-intel-recent-text">{{ riskSummary.recentEvent }}</span>
          </div>
        </div>
      </div>

      <!-- 分段切换 -->
      <div class="segment-bar anim-fade-up anim-delay-4">
        <div v-for="t in SEGS" :key="t.value" class="segment-item" :class="{ active: seg === t.value, disabled: t.disabled }" @click="!t.disabled && (seg = t.value)">
          {{ t.label }}
          <svg v-if="t.value === 'risks'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
      </div>

      <!-- 长期反馈 -->
      <div v-if="seg === 'reviews'" class="seg-content anim-fade-up anim-delay-5">
        <!-- 骨架屏加载状态 -->
        <div v-if="reviewsLoading" class="review-skeleton-list">
          <div v-for="i in 3" :key="i" class="review-skeleton">
            <div class="skeleton-head">
              <div class="skeleton-avatar shimmer"></div>
              <div class="skeleton-info">
                <div class="skeleton-line w60 shimmer"></div>
                <div class="skeleton-line w40 shimmer"></div>
              </div>
              <div class="skeleton-line w30 shimmer"></div>
            </div>
            <div class="skeleton-stars shimmer"></div>
            <div class="skeleton-line w90 shimmer"></div>
            <div class="skeleton-line w70 shimmer"></div>
          </div>
        </div>
        <!-- 评价列表 -->
        <div v-else-if="reviews.length" class="review-list">
          <div
            v-for="r in reviews"
            :key="r.id"
            v-memo="[r.id, r.overall_rating, r.usage_duration, r.review_text, r.pros, r.cons, r.profiles?.display_name, r.pets?.name, r.pets?.breed, r.pets?.stomach_health]"
            class="review-card"
          >
            <div class="review-head">
              <div>
                <div class="review-user">{{ r.profiles?.display_name || '匿名用户' }}</div>
                <div class="review-pet">{{ r.pets?.name }} · {{ r.pets?.breed || '未知品种' }} · {{ r.pets?.stomach_health === 'sensitive' ? '肠胃敏感' : '肠胃正常' }}</div>
              </div>
              <span class="review-duration">{{ durationLabel(r.usage_duration) }}</span>
            </div>
            <div class="review-stars">
              <svg v-for="i in 5" :key="i" viewBox="0 0 24 24" :fill="i <= (r.overall_rating || 3) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <p v-if="r.review_text" class="review-text">{{ r.review_text }}</p>
            <p v-if="r.pros" class="review-pros">👍 {{ r.pros }}</p>
            <p v-if="r.cons" class="review-cons">👎 {{ r.cons }}</p>
          </div>
        </div>
        <div v-else class="empty-mini">暂无评价。成为第一个评价此产品的人！</div>
      </div>

      <!-- 成分分析 -->
      <div v-else-if="seg === 'ingredients'" class="seg-content anim-fade-up anim-delay-5">
        <div v-if="ingredients.length" class="ingredient-list">
          <div v-for="ing in ingredients" :key="ing.id" class="ingredient-row">
            <div class="ing-left">
              <span class="ing-name">{{ ing.ingredient_name }}</span>
              <span v-if="ing.allergen_risk && ing.allergen_risk.length" class="ing-allergen">过敏风险</span>
            </div>
            <div class="ing-right">
              <span v-if="ing.percentage" class="ing-pct">{{ ing.percentage }}%</span>
              <span class="ing-type">{{ ing.ingredient_type }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-mini">暂无成分数据</div>

        <!-- 营养保证值 -->
        <div v-if="currentVersion?.nutrition_snapshot && Object.keys(currentVersion.nutrition_snapshot).length" class="nutrition-section">
          <h3 class="section-title">营养保证值</h3>
          <div class="nutrition-grid">
            <div v-for="(value, key) in currentVersion.nutrition_snapshot" :key="key" class="nutrition-card">
              <div class="nutrition-value">{{ value }}%</div>
              <div class="nutrition-key">{{ key }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 版本时间轴 -->
      <div v-else-if="seg === 'timeline'" class="seg-content anim-fade-up anim-delay-5">
        <div v-if="versions.length" class="version-timeline">
          <div v-for="(v, i) in versions" :key="v.id" class="version-item">
            <div class="version-dot-wrap">
              <div class="version-dot" :class="{ current: v.is_current }"></div>
              <div v-if="i < versions.length - 1" class="version-line"></div>
            </div>
            <div class="version-content">
              <div class="version-name">{{ v.version_name }}<span v-if="v.is_current" class="version-current-tag">当前</span></div>
              <div v-if="v.effective_date" class="version-date">{{ formatDate(v.effective_date) }}<template v-if="v.end_date"> — {{ formatDate(v.end_date) }}</template></div>
              <p v-if="v.formula_changes" class="version-changes">{{ v.formula_changes }}</p>
            </div>
          </div>
        </div>
        <div v-else class="empty-mini">暂无版本记录</div>
      </div>

      <!-- 风险记录 -->
      <div v-else-if="seg === 'risks'" class="seg-content anim-fade-up anim-delay-5">
        <div v-if="riskEvents.length" class="risk-list">
          <div v-for="ev in riskEvents" :key="ev.id" class="risk-card">
            <div class="risk-head">
              <span class="risk-title">{{ ev.title }}</span>
              <span class="risk-sev" :class="ev.severity">{{ severityLabel(ev.severity) }}</span>
            </div>
            <p class="risk-desc">{{ ev.description }}</p>
            <div class="risk-meta">
              <span>{{ formatDate(ev.event_date) }}</span>
              <span>·</span>
              <span>{{ ev.report_count }} 条报告</span>
              <span v-if="ev.resolved" class="risk-resolved">已解决</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-mini">暂无风险记录</div>
      </div>
    </template>

    <EmptyState
      v-else
      icon="🔍"
      title="产品不存在"
      action-text="返回上一页"
      @action="$router.back()"
    />
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useProducts } from '../composables/useProducts'
import { useReviews } from '../composables/useReviews'
import EmptyState from '../components/EmptyState.vue'
import { emit, EVENTS } from '../lib/event-bus'

const route = useRoute()
const {
  fetchProduct, fetchIngredients, fetchVersions, fetchProductTags,
  fetchMetrics, fetchRiskEvents, isBookmarked, toggleBookmark
} = useProducts()
const { reviews, fetchReviews } = useReviews()

const loading = ref(true)
const product = ref(null)
const reviewsLoading = ref(false)
// 列表整体替换，使用 shallowRef 减少深度响应式开销
const ingredients = shallowRef([])
const versions = shallowRef([])
const productTags = shallowRef([])
const metrics = shallowRef([])
const riskEvents = shallowRef([])
const bookmarked = ref(false)
const seg = ref('reviews')

const SEGS = computed(() => [
  { value: 'reviews', label: '长期反馈' },
  { value: 'ingredients', label: '成分分析' },
  { value: 'timeline', label: '时间轴' },
  { value: 'risks', label: '风险记录', disabled: !riskEvents.value.length }
])

const speciesLabel = computed(() => {
  const s = product.value?.applicable_species
  return s === 'cats' ? '猫咪专用' : s === 'dogs' ? '狗狗专用' : '猫狗通用'
})
const ageLabel = computed(() => {
  const a = product.value?.applicable_age
  return a === 'kitten' ? '幼年' : a === 'senior' ? '老年' : '全年龄段'
})

const avgRating = computed(() => {
  // 与 web 端一致：取最新一条有 average_rating 的 daily 指标
  const m = metrics.value.find(m => m.average_rating != null)
  return m ? Number(m.average_rating).toFixed(1) : null
})
const latestMetric = computed(() => metrics.value[0] || {})
const stoolRateLabel = computed(() => latestMetric.value.stool_issue_rate != null ? `${(Number(latestMetric.value.stool_issue_rate) * 100).toFixed(1)}%` : '--')
const stoolRatePct = computed(() => Number(latestMetric.value.stool_issue_rate ?? 0) * 100)
const repurchaseRateLabel = computed(() => latestMetric.value.repurchase_rate != null ? `${(Number(latestMetric.value.repurchase_rate) * 100).toFixed(0)}%` : '--')
const repurchaseRatePct = computed(() => Number(latestMetric.value.repurchase_rate ?? 0) * 100)

const currentVersion = computed(() => versions.value.find(v => v.is_current) || null)

const riskSummary = computed(() => {
  const events = riskEvents.value
  if (!events.length) return null
  const highCount = events.filter(e => e.severity === 'critical' || e.severity === 'high').length
  const resolved = events.filter(e => e.resolved).length
  const sorted = [...events].sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
  return {
    total: events.length,
    highCount,
    resolved,
    recentEvent: sorted[0]?.title || null
  }
})

// 长期监控指标 chips（与 web 详情页 SSS/SS/S 优先级 + 反转逻辑一致）
// 所有 chips 均为"问题率"视角：越高越差，故适口性/长期稳定/毛发改善/复购需反转
const monitorTags = computed(() => {
  const m = latestMetric.value
  const tags = [
    { label: '软便', value: m.stool_issue_rate, priority: 'SSS', color: '#E85D4A' },
    { label: '黑下巴', value: m.black_chin_rate, priority: 'SSS', color: '#E85D4A' },
    { label: '呕吐', value: m.vomit_rate, priority: 'SSS', color: '#E85D4A' },
    { label: '泪痕', value: m.tear_stain_rate, priority: 'SS', color: '#E8A87C' },
    { label: '适口性', value: m.average_rating != null ? 1 - Number(m.average_rating) / 5 : null, priority: 'SS', color: '#E8A87C' },
    { label: '长期稳定', value: m.long_term_stability_score != null ? 1 - Number(m.long_term_stability_score) / 100 : null, priority: 'SS', color: '#E8A87C' },
    { label: '翻车', value: m.dispute_rate, priority: 'SS', color: '#E8A87C' },
    { label: '掉毛', value: m.shedding_rate, priority: 'S', color: '#6B7B6B' },
    { label: '毛发改善', value: m.coat_improve_rate != null ? 1 - Number(m.coat_improve_rate) : null, priority: 'S', color: '#6B7B6B' },
    { label: '复购', value: m.repurchase_rate != null ? 1 - Number(m.repurchase_rate) : null, priority: 'S', color: '#6B7B6B' }
  ].filter(t => t.value != null)
  return tags.map(t => ({ ...t, pct: (Number(t.value) * 100).toFixed(1) }))
})

const DURATION_LABELS = {
  lt_1w: '一周以内', '1w_to_2w': '半个月内', '2w_to_1m': '一个月内',
  '1m_to_3m': '三个月内', m6: '半年', 'm6_to_1y': '半年到一年',
  gt_1y: '一年以上', custom: '自定义', just_started: '刚开始'
}
function durationLabel(d) { return DURATION_LABELS[d] || d }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

const TAG_COLORS = { ingredient: '#34C759', suitable_for: '#FF9500', risk: '#FF3B30', certification: '#5856D6', feature: '#8B5E46' }
const TAG_LABELS = { ingredient: '成分', suitable_for: '适用', risk: '风险', certification: '认证', feature: '特点' }
function tagColor(t) { return TAG_COLORS[t] || '#6B7B6B' }
function tagLabel(t) { return TAG_LABELS[t] || t }

const SEVERITY_LABELS = { critical: '严重', high: '高风险', medium: '中风险', low: '低风险' }
function severityLabel(s) { return SEVERITY_LABELS[s] || s }

async function onBookmark() {
  try {
    bookmarked.value = await toggleBookmark(product.value.id)
    Toast({ theme: 'success', message: bookmarked.value ? '已收藏' : '已取消收藏' })

    // 触发产品收藏事件
    emit(EVENTS.PRODUCT_BOOKMARKED, {
      productId: product.value.id,
      bookmarked: bookmarked.value
    })
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '操作失败' })
  }
}

onMounted(async () => {
  const id = route.params.id
  const [p, ing, ver, tags, met, risks, bked] = await Promise.all([
    fetchProduct(id),
    fetchIngredients(id),
    fetchVersions(id),
    fetchProductTags(id),
    fetchMetrics(id),
    fetchRiskEvents(id),
    isBookmarked(id)
  ])
  product.value = p
  ingredients.value = ing
  versions.value = ver
  productTags.value = tags
  metrics.value = met
  riskEvents.value = risks
  bookmarked.value = bked
  reviewsLoading.value = true
  await fetchReviews(id)
  reviewsLoading.value = false
  loading.value = false

  // 触发产品浏览事件
  if (p) {
    emit(EVENTS.PRODUCT_VIEWED, {
      id: p.id,
      name: p.name,
      category: p.category
    })
  }
})
</script>

<style scoped>
.detail-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(100px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.detail-header{position:sticky;top:var(--safe-top);z-index:10;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(245,243,241,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.back-btn{width:40px;height:40px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer}
.back-btn:active{transform:scale(.92)}
.back-btn svg{width:20px;height:20px;color:var(--fg)}
.header-actions{display:flex;gap:10px}
.action-icon{width:40px;height:40px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;color:var(--muted)}
.action-icon.active{color:var(--brown)}
.action-icon:active{transform:scale(.92)}
.action-icon svg{width:20px;height:20px}
.hero{padding:8px 20px 0}
.hero-img-area{width:100%;aspect-ratio:4/3;border-radius:24px;background:linear-gradient(135deg,rgba(215,181,147,.18),rgba(215,181,147,.06));display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:16px}
.hero-img-area img{width:100%;height:100%;object-fit:cover}
.hero-placeholder{font-size:64px;color:var(--brown);opacity:.4;font-weight:700}
.hero-brand{font-size:13px;color:var(--muted);font-weight:500;margin-bottom:4px}
.hero-name{font-family:var(--font-display);font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-.02em;color:var(--fg);margin-bottom:8px}
.hero-desc{font-size:14px;color:var(--muted);line-height:1.5;margin-bottom:12px}
.hero-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.tag{font-size:12px;color:var(--muted);background:rgba(0,0,0,.04);padding:5px 12px;border-radius:var(--radius-btn);font-weight:500}
.tag.price{color:var(--brown);background:rgba(139,94,70,.08);font-weight:600;font-family:var(--font-num)}
.review-btn{display:flex;align-items:center;gap:6px;width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;justify-content:center;box-shadow:var(--shadow-btn);transition:transform .15s}
.review-btn:active{transform:scale(.97)}
.review-btn svg{width:18px;height:18px}
.tag-cloud{display:flex;flex-wrap:wrap;gap:8px;padding:16px 20px 0}
.cloud-tag{font-size:12px;padding:5px 12px;border-radius:var(--radius-btn);font-weight:500}
.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:16px 20px 0}
.stat-card{background:var(--card);border-radius:20px;padding:16px;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.stat-label{font-size:12px;color:var(--muted);margin-bottom:8px}
.stat-value-row{display:flex;align-items:baseline;gap:2px}
.stat-value{font-size:26px;font-weight:700;color:var(--fg);font-family:var(--font-num)}
.stat-unit{font-size:13px;color:var(--muted)}
.stat-bar{height:4px;border-radius:2px;background:rgba(0,0,0,.06);margin-top:8px;overflow:hidden}
.stat-bar-fill{height:100%;border-radius:2px;transition:width .4s}
.monitor-section{padding:20px 20px 0}
.section-title{font-size:17px;font-weight:700;color:var(--fg);margin-bottom:12px}
.monitor-chips{display:flex;flex-wrap:wrap;gap:8px}
.monitor-chip{display:flex;align-items:center;gap:6px;background:var(--card);padding:8px 14px;border-radius:var(--radius-btn);box-shadow:0 2px 8px rgba(0,0,0,.04);border:1px solid var(--border)}
.monitor-priority{font-size:10px;font-weight:700}
.monitor-label{font-size:12px;font-weight:600;color:var(--fg)}
.monitor-value{font-size:12px;color:var(--muted);font-family:var(--font-num)}
.segment-bar{display:flex;gap:4px;padding:20px 20px 0;background:rgba(0,0,0,.03);border-radius:var(--radius-btn);margin:20px 20px 0;padding:4px}
.segment-item{flex:1;text-align:center;padding:10px 4px;border-radius:var(--radius-btn);font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:4px}
.segment-item.active{background:var(--card);color:var(--brown);font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.segment-item.disabled{opacity:.4;cursor:not-allowed}
.segment-item svg{width:13px;height:13px}
.seg-content{padding:16px 20px 0}
.review-list{display:flex;flex-direction:column;gap:12px}
.review-card{background:var(--card);border-radius:20px;padding:16px;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.review-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.review-user{font-size:14px;font-weight:600;color:var(--fg)}
.review-pet{font-size:11px;color:var(--muted);margin-top:2px}
.review-duration{font-size:11px;color:var(--muted);background:rgba(0,0,0,.04);padding:4px 10px;border-radius:var(--radius-btn);white-space:nowrap}
.review-stars{display:flex;gap:2px;margin-bottom:8px}
.review-stars svg{width:14px;height:14px;color:#FF9500}
.review-text{font-size:14px;color:var(--fg);line-height:1.5;margin-bottom:6px}
.review-pros{font-size:13px;color:var(--green);margin-bottom:2px}
.review-cons{font-size:13px;color:var(--muted)}
.ingredient-list{background:var(--card);border-radius:20px;padding:16px;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.ingredient-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)}
.ingredient-row:last-child{border-bottom:none;padding-bottom:0}
.ingredient-row:first-child{padding-top:0}
.ing-left{display:flex;align-items:center;gap:8px}
.ing-name{font-size:14px;font-weight:600;color:var(--fg)}
.ing-allergen{font-size:10px;color:#FF3B30;background:rgba(255,59,48,.1);padding:2px 8px;border-radius:var(--radius-btn)}
.ing-right{display:flex;align-items:center;gap:8px}
.ing-pct{font-size:13px;color:var(--muted);font-family:var(--font-num)}
.ing-type{font-size:11px;color:var(--muted);background:rgba(0,0,0,.04);padding:3px 8px;border-radius:var(--radius-btn)}
.version-timeline{padding-left:8px}
.version-item{display:flex;gap:16px;padding-bottom:16px}
.version-item:last-child{padding-bottom:0}
.version-dot-wrap{display:flex;flex-direction:column;align-items:center}
.version-dot{width:12px;height:12px;border-radius:50%;background:#E0E0E0;flex-shrink:0;margin-top:4px}
.version-dot.current{background:var(--green)}
.version-line{width:2px;flex:1;background:rgba(0,0,0,.08);margin-top:4px;min-height:24px}
.version-content{flex:1;padding-bottom:4px}
.version-name{font-size:14px;font-weight:600;color:var(--fg);display:flex;align-items:center;gap:8px}
.version-current-tag{font-size:10px;color:var(--green);background:rgba(108,138,105,.12);padding:2px 8px;border-radius:var(--radius-btn)}
.version-date{font-size:11px;color:var(--muted);margin-top:2px}
.version-changes{font-size:13px;color:var(--muted);margin-top:4px;line-height:1.5}
.risk-list{display:flex;flex-direction:column;gap:12px}
.risk-card{background:var(--card);border-radius:20px;padding:16px;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.risk-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.risk-title{font-size:14px;font-weight:600;color:var(--fg)}
.risk-sev{font-size:11px;padding:3px 10px;border-radius:var(--radius-btn);font-weight:500}
.risk-sev.critical,.risk-sev.high{color:#FF3B30;background:rgba(255,59,48,.1)}
.risk-sev.medium{color:#FF9500;background:rgba(255,149,0,.1)}
.risk-sev.low{color:var(--muted);background:rgba(0,0,0,.04)}
.risk-desc{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:6px}
.risk-meta{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}
.risk-resolved{color:var(--green);background:rgba(108,138,105,.12);padding:2px 8px;border-radius:var(--radius-btn)}
.empty-mini{text-align:center;padding:32px 16px;font-size:14px;color:var(--muted);background:var(--card);border-radius:20px;border:1px solid var(--border)}
/* 评价列表骨架屏 */
.review-skeleton-list{display:flex;flex-direction:column;gap:16px}
.review-skeleton{background:var(--card);border-radius:20px;padding:16px;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.skeleton-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.skeleton-avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
.skeleton-info{flex:1;display:flex;flex-direction:column;gap:6px}
.skeleton-line{height:14px;border-radius:7px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
.skeleton-line.w30{width:30%}
.skeleton-line.w40{width:40%}
.skeleton-line.w60{width:60%}
.skeleton-line.w70{width:70%}
.skeleton-line.w90{width:90%}
.skeleton-stars{height:20px;border-radius:10px;margin-bottom:10px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
.back-link{padding:10px 24px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer}
.loading-state{padding:20px}
.shimmer-block{height:200px;border-radius:24px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;margin-bottom:16px}
.shimmer-line{height:16px;border-radius:8px;margin-bottom:10px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
.shimmer-line.w60{width:60%}
.shimmer-line.w90{width:90%}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.nutrition-section{margin-top:16px}
.nutrition-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.nutrition-card{background:var(--card);border-radius:16px;padding:14px;text-align:center;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.nutrition-value{font-size:22px;font-weight:700;color:var(--fg);font-family:var(--font-num)}
.nutrition-key{font-size:11px;color:var(--muted);margin-top:4px;text-transform:capitalize}
.risk-intel-section{padding:20px 20px 0}
.risk-intel-card{background:var(--card);border-radius:20px;padding:16px;box-shadow:var(--shadow-card);border:1px solid var(--border)}
.risk-intel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.risk-intel-item{text-align:center;padding:12px 8px;background:rgba(0,0,0,.03);border-radius:14px}
.risk-intel-label{font-size:11px;color:var(--muted);margin-bottom:6px}
.risk-intel-value{font-size:24px;font-weight:700;font-family:var(--font-num)}
.risk-intel-value.ok{color:var(--green)}
.risk-intel-value.warn{color:#FF9500}
.risk-intel-value.danger{color:#FF3B30}
.risk-intel-recent{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
.risk-intel-recent-label{font-weight:500}
.risk-intel-recent-text{color:var(--fg)}
</style>
