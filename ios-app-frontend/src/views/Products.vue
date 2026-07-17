<template>
  <div class="products-shell" ref="shellRef" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <!-- 下拉刷新指示器 -->
    <div class="pull-refresh" :class="{ active: isRefreshing, pulling: isPulling }" :style="{ transform: `translateY(${pullDistance}px)` }">
      <svg v-if="!isRefreshing" class="refresh-icon" :style="{ transform: `rotate(${pullDistance * 2}deg)` }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
      <svg v-else class="refresh-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
    </div>

    <header class="products-header anim-fade-up">
      <div class="products-header-top">
        <div>
          <h1 class="products-title">产品库</h1>
          <p class="products-subtitle">专注猫咪消费领域，查看真实长期反馈数据</p>
        </div>
        <button class="action-circle" aria-label="通知" @click="$router.push('/notifications')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.134 11C18.715 16.375 21 18 21 18H3s3-2.133 3-9.6c0-1.697.632-3.325 1.757-4.525S10.41 2 12 2q.507 0 1 .09M19 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m-5.27 13a2 2 0 0 1-3.46 0"/></svg>
        </button>
      </div>
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="keyword" type="text" placeholder="搜索猫粮、品牌、成分…" @input="onSearch" />
      </div>
    </header>

    <div class="category-bar anim-fade-up anim-delay-1">
      <div v-for="c in categoryList" :key="c.slug || 'all'" class="cat-chip" :class="{ active: activeCategory === (c.slug || '') }" @click="selectCategory(c.slug || '')">
        {{ c.name }}
      </div>
    </div>

    <div class="filter-row anim-fade-up anim-delay-2">
      <div class="hot-toggle" :class="{ active: hotOnly }" @click="toggleHot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
        热门产品
      </div>
      <span class="result-count">{{ products.length }} 款产品</span>
    </div>

    <div v-if="loading" class="grid">
      <div v-for="i in 6" :key="i" class="product-card skeleton-card">
        <div class="card-img-area shimmer"></div>
        <div class="card-body">
          <div class="shimmer-line w70"></div>
          <div class="shimmer-line w90"></div>
          <div class="shimmer-line w40"></div>
        </div>
      </div>
    </div>

    <div v-else-if="products.length" class="grid anim-fade-up anim-delay-3">
      <div
        v-for="p in products"
        :key="p.id"
        v-memo="[p.id, p.image_url, p.name, p.brand, p.price_min, p.price_max, p.transparency_score]"
        class="product-card"
        @click="$router.push('/products/' + p.id)"
      >
        <div class="card-img-area">
          <img v-if="p.image_url" :src="p.image_url" :alt="p.name" loading="lazy" />
          <span v-else class="img-placeholder">{{ p.brand?.slice(0,1) || '🐾' }}</span>
        </div>
        <div class="card-body">
          <div class="card-brand">{{ p.brand }}</div>
          <div class="card-name">{{ p.name }}</div>
          <div class="card-meta">
            <span v-if="p.price_min" class="card-price">¥{{ Number(p.price_min) }}<template v-if="p.price_max && p.price_max !== p.price_min">-{{ Number(p.price_max) }}</template></span>
            <span v-if="p.transparency_score != null" class="card-score">透明度 {{ p.transparency_score }}</span>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      class="anim-fade-up anim-delay-3"
      icon="📦"
      title="暂无匹配的产品"
      description="试试其他关键词或分类"
    />
  </div>

  <TabBar active-tab="products" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import TabBar from '../components/TabBar.vue'
import EmptyState from '../components/EmptyState.vue'
import { useProducts } from '../composables/useProducts'

const { products, categories, loading, fetchCategories, fetchProducts } = useProducts()

const keyword = ref('')
const activeCategory = ref('')
const hotOnly = ref(false)
let searchTimer = null

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
    await reload()
    isRefreshing.value = false
  }
  pullDistance.value = 0
}

const categoryList = ref([{ name: '全部', slug: '' }])

async function loadCategories() {
  await fetchCategories()
  categoryList.value = [{ name: '全部', slug: '' }, ...categories.value]
}

async function reload() {
  await fetchProducts({
    categorySlug: activeCategory.value || undefined,
    hot: hotOnly.value ? '1' : undefined,
    keyword: keyword.value || undefined
  })
}

function selectCategory(slug) {
  activeCategory.value = slug
  reload()
}

function toggleHot() {
  hotOnly.value = !hotOnly.value
  reload()
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, 350)
}

onMounted(async () => {
  await loadCategories()
  reload()
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped>
/* 下拉刷新 */
.pull-refresh{position:absolute;top:-50px;left:50%;transform:translateX(-50%);width:40px;height:40px;display:flex;align-items:center;justify-content:center;transition:transform 0.3s ease;pointer-events:none}
.pull-refresh.active{transform:translateX(-50%) translateY(50px)}
.refresh-icon{width:24px;height:24px;color:var(--brown);transition:transform 0.2s}
.refresh-icon.spinning{animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

.products-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(100px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;position:relative}
.products-header{padding:20px 24px 0}
.products-header-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.products-title{font-family:var(--font-display);font-size:34px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--fg)}
.products-subtitle{margin-top:6px;font-size:14px;color:var(--muted);line-height:1.5}
.action-circle{width:41.31px;height:41.31px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s;flex-shrink:0}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:20px;height:20px;color:var(--fg)}
.search-bar{margin-top:18px;display:flex;align-items:center;gap:10px;height:44px;padding:0 16px;border-radius:var(--radius-btn);background:var(--card);border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.search-bar svg{width:18px;height:18px;color:var(--muted);flex-shrink:0}
.search-bar input{flex:1;border:none;background:transparent;font-size:15px;color:var(--fg);outline:none}
.search-bar input::placeholder{color:var(--muted)}
.category-bar{display:flex;gap:8px;padding:16px 24px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.category-bar::-webkit-scrollbar{display:none}
.cat-chip{flex-shrink:0;padding:8px 16px;border-radius:var(--radius-btn);background:var(--card);border:1px solid var(--border);font-size:13px;font-weight:500;color:var(--fg);cursor:pointer;transition:all .2s;white-space:nowrap}
.cat-chip.active{background:var(--brown);color:#fff;border-color:var(--brown);box-shadow:var(--shadow-btn)}
.cat-chip:active{transform:scale(.96)}
.filter-row{display:flex;align-items:center;justify-content:space-between;padding:14px 24px 0}
.hot-toggle{display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:var(--radius-btn);background:var(--card);border:1px solid var(--border);font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s}
.hot-toggle.active{color:var(--brown);border-color:var(--brown);background:rgba(139,94,70,.06)}
.hot-toggle svg{width:14px;height:14px}
.hot-toggle:active{transform:scale(.96)}
.result-count{font-size:12px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(8px,2vw,14px);padding:16px 20px 0}
.product-card{background:var(--card);border-radius:24px;overflow:hidden;box-shadow:var(--shadow-card);border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s}
.product-card:active{transform:scale(.97);box-shadow:0 4px 16px rgba(0,0,0,.08)}
.card-img-area{width:100%;aspect-ratio:1/1;background:linear-gradient(135deg,rgba(215,181,147,.18),rgba(215,181,147,.06));display:flex;align-items:center;justify-content:center;overflow:hidden}
.card-img-area img{width:100%;height:100%;object-fit:cover}
.img-placeholder{font-size:36px;color:var(--brown);opacity:.4;font-weight:700}
.card-body{padding:12px 14px 14px}
.card-brand{font-size:11px;color:var(--muted);font-weight:500;margin-bottom:2px}
.card-name{font-size:14px;font-weight:600;color:var(--fg);line-height:1.3;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:36px}
.card-meta{display:flex;align-items:center;justify-content:space-between;gap:6px}
.card-price{font-size:14px;font-weight:700;color:var(--brown);font-family:var(--font-num)}
.card-score{font-size:10px;color:var(--muted);background:rgba(0,0,0,.04);padding:3px 8px;border-radius:var(--radius-btn);font-weight:500}
.shimmer{background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.shimmer-line{height:12px;border-radius:6px;margin-bottom:8px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
.shimmer-line.w70{width:70%}
.shimmer-line.w90{width:90%}
.shimmer-line.w40{width:40%}
</style>
