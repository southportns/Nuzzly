<template>
  <div class="app-shell">
    <div class="status-bar-spacer"></div>

    <!-- Header (与首页一致) -->
    <header class="header anim-fade-up">
      <div class="header-row">
        <div class="avatar">
          <img src="/mqpyqgao-logo.png" alt="nuzzly logo">
        </div>
        <div class="header-actions">
          <button class="action-circle" aria-label="搜索">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 17l4 4M3 11a8 8 0 1 0 16 0a8 8 0 0 0-16 0"/></svg>
          </button>
          <button class="action-circle" aria-label="通知" @click="$router.push('/notifications')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.134 11C18.715 16.375 21 18 21 18H3s3-2.133 3-9.6c0-1.697.632-3.325 1.757-4.525S10.41 2 12 2q.507 0 1 .09M19 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m-5.27 13a2 2 0 0 1-3.46 0"/></svg>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>
        </div>
      </div>
      <div class="greeting">
        <h1 class="greeting-main">HI,<span class="pet-name">{{ userName }}</span><br><span class="greeting-sub">我是毛球镇管家，有什么可以帮您</span></h1>
      </div>
    </header>

    <!-- Tab 切换 -->
    <div class="seg-bar anim-fade-up anim-delay-1">
      <div v-for="t in TABS" :key="t.value" class="seg-item" :class="{ active: tab === t.value }" @click="tab = t.value">
        {{ t.label }}
      </div>
    </div>

    <!-- 智能推荐 -->
    <div v-if="tab === 'recommend'" class="tab-content anim-fade-up anim-delay-2">
      <div class="card">
        <div class="card-header">
          <span class="card-icon">✨</span>
          <span class="card-title">AI 智能产品推荐</span>
        </div>
        <p class="card-desc">基于社区真实长期反馈数据，为你的宠物精准匹配最适合的产品</p>

        <div v-if="loadingPets" class="skeleton-line"></div>
        <div v-else-if="!pets.length" class="empty-hint">
          还没有宠物档案，请先 <span class="link" @click="$router.push('/pet/quick')">添加宠物</span>
        </div>
        <template v-else>
          <div class="field" style="position:relative">
            <label class="field-label">选择宠物</label>
            <div class="custom-select" @click="showPetPicker = !showPetPicker">
              <span v-if="selectedPet" class="select-value">{{ selectedPet.name }} · {{ selectedPet.breed || '未知品种' }}{{ selectedPet.stomach_health === 'sensitive' ? ' · 肠胃敏感' : '' }}</span>
              <span v-else class="select-placeholder">选择要推荐的宠物…</span>
              <svg class="select-arrow" :class="{ open: showPetPicker }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div v-if="showPetPicker" class="dropdown-menu">
              <div v-for="p in pets" :key="p.id" class="dropdown-item" :class="{ active: selectedPetId === p.id }" @click="selectPet(p.id)">
                <span class="dd-emoji">{{ SPECIES_EMOJI[p.species] || '🐾' }}</span>
                <div class="dd-info">
                  <span class="dd-name">{{ p.name }}</span>
                  <span class="dd-meta">{{ p.breed || '未知品种' }}{{ p.stomach_health === 'sensitive' ? ' · 肠胃敏感' : '' }}</span>
                </div>
                <span v-if="selectedPetId === p.id" class="dd-check">✓</span>
              </div>
            </div>
          </div>
          <div class="field">
            <label class="field-label">具体需求或症状（可选）</label>
            <input v-model="recommendQuery" class="field-input" placeholder="例如：布偶猫长期软便、低敏幼猫粮…" />
          </div>
          <button class="submit-btn" :disabled="!selectedPetId || recommendLoading" @click="handleRecommend">
            {{ recommendLoading ? '正在分析…' : '获取智能推荐' }}
          </button>
        </template>
      </div>

      <!-- 推荐结果 -->
      <div v-if="recommendError" class="error-card">{{ recommendError }}</div>

      <div v-if="recommendResult" class="result-area">
        <div class="summary-card">
          <span class="summary-label">分析结果</span>
          <span class="summary-text">{{ recommendResult.summary }}</span>
        </div>

        <div v-if="recommendResult.pet_context" class="context-tags">
          <span class="ctx-tag">品种：{{ recommendResult.pet_context.breed }}</span>
          <span class="ctx-tag">年龄：{{ recommendResult.pet_context.age }}</span>
          <span class="ctx-tag" :class="{ warn: recommendResult.pet_context.stomach_health === 'sensitive' || recommendResult.pet_context.stomach_health === 'very_sensitive' }">
            肠胃：{{ stomachLabel(recommendResult.pet_context.stomach_health) }}
          </span>
        </div>

        <div v-for="(r, i) in recommendResult.recommendations" :key="r.product.id" class="rec-card">
          <div class="rec-rank">#{{ i + 1 }}</div>
          <div class="rec-body">
            <div class="rec-name">{{ r.product.name }}</div>
            <div class="rec-brand">{{ r.product.brand }}</div>
            <div v-if="r.product.price_max" class="rec-price">¥{{ r.product.price_max }}</div>
            <div class="rec-score" :style="{ color: scoreColor(r.score) }">{{ Math.round(r.score * 100) }}分</div>
            <div v-if="r.explanation" class="rec-reason">{{ r.explanation }}</div>
            <div class="rec-dims">
              <span v-for="(v, k) in r.dimensions" :key="k" class="dim-chip">{{ dimLabel(k) }} {{ Math.round(v * 100) }}%</span>
            </div>
          </div>
        </div>

        <div v-if="recommendResult.warnings?.length" class="warning-card">
          <div class="warning-title">⚠️ 风险提示</div>
          <div v-for="w in recommendResult.warnings" :key="w.product.id" class="warning-item">
            <span>{{ w.product.brand }} {{ w.product.name }}</span>
            <span class="warning-reason">{{ w.reason }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 成分分析 -->
    <div v-if="tab === 'ingredients'" class="tab-content anim-fade-up anim-delay-2">
      <div class="card">
        <div class="card-header">
          <span class="card-icon">🧪</span>
          <span class="card-title">成分分析</span>
        </div>
        <p class="card-desc">粘贴猫粮包装上的成分表，AI 将自动分析风险等级和适配性</p>
        <textarea v-model="ingredientInput" class="field-textarea" rows="5" placeholder="例如：鸡肉粉、鱼肉、玉米、糙米、鸡脂肪、啤酒酵母…"></textarea>
        <button class="submit-btn" :disabled="!ingredientInput.trim() || ingredientLoading" @click="handleAnalyze">
          {{ ingredientLoading ? '分析中…' : '开始分析' }}
        </button>
      </div>
      <div v-if="ingredientError" class="error-card">{{ ingredientError }}</div>
      <div v-if="ingredientResult" class="card result-card">
        <div class="result-label">AI 分析摘要</div>
        <div class="result-text">{{ ingredientResult }}</div>
      </div>
      <div class="tip-card">
        <div class="tip-title">使用示例</div>
        <div class="tip-item">• 粘贴猫粮包装背面的成分表</div>
        <div class="tip-item">• AI 会识别主要蛋白来源、填充物、添加剂等</div>
        <div class="tip-item">• 给出风险评估和品种适配建议</div>
      </div>
    </div>

    <!-- 产品对比 -->
    <div v-if="tab === 'compare'" class="tab-content anim-fade-up anim-delay-2">
      <div class="card">
        <div class="card-header">
          <span class="card-icon">⚖️</span>
          <span class="card-title">产品对比</span>
        </div>
        <p class="card-desc">从数据库选取或手动输入 2-4 款产品，AI 将多维度对比分析</p>
        <div class="compare-list">
          <div v-for="(p, i) in compareProducts" :key="i" class="compare-row">
            <span class="compare-num">{{ i + 1 }}</span>
            <div class="compare-input-wrap">
              <input
                v-model="compareProducts[i]"
                class="field-input compare-input"
                placeholder="搜索或输入产品名称…"
                @focus="openProductSearch(i)"
                @input="onCompareSearch(i)"
              />
              <div v-if="searchOpenIdx === i && searchResults.length" class="compare-dropdown">
                <div v-for="item in searchResults" :key="item.id" class="compare-dd-item" @click="pickCompareProduct(i, item)">
                  <span class="dd-prod-name">{{ item.name }}</span>
                  <span class="dd-prod-brand">{{ item.brand }}</span>
                </div>
              </div>
            </div>
            <button v-if="compareProducts.length > 2" class="compare-del" @click="removeProduct(i)">×</button>
          </div>
        </div>
        <button v-if="compareProducts.length < 4" class="add-btn" @click="addProduct">+ 添加产品</button>
        <button class="submit-btn" :disabled="compareProducts.filter(p => p.trim()).length < 2 || compareLoading" @click="handleCompare">
          {{ compareLoading ? '对比中…' : '开始对比' }}
        </button>
      </div>
      <div v-if="compareError" class="error-card">{{ compareError }}</div>
      <div v-if="compareResult" class="card result-card">
        <div class="result-text">{{ compareResult }}</div>
      </div>
      <div class="tip-card">
        <div class="tip-title">对比维度</div>
        <div class="tip-grid">
          <span>• 适口性评分</span><span>• 软便反馈率</span>
          <span>• 复购率</span><span>• 成分优劣</span>
          <span>• 价格区间</span><span>• 适合品种</span>
        </div>
      </div>
    </div>

    <!-- 自由问答 (复用 Butler 的聊天模式) -->
    <div v-if="tab === 'chat'" class="tab-content chat-tab anim-fade-up anim-delay-2">
      <div v-if="!chatMessages.length" class="chat-welcome">
        <div class="chat-welcome-icon">✨</div>
        <h3 class="chat-welcome-title">AI 宠物营养助手</h3>
        <p class="chat-welcome-desc">基于社区真实长期反馈数据，为你的宠物提供个性化推荐与分析</p>
        <div class="chat-suggestions">
          <div v-for="s in CHAT_SUGGESTIONS" :key="s" class="suggestion-chip" @click="sendChatMessage(s)">{{ s }}</div>
        </div>
      </div>
      <div v-else class="chat-messages" ref="chatMessagesRef">
        <div v-for="(m, i) in chatMessages" :key="i" class="chat-row" :class="m.role">
          <div v-if="m.role === 'assistant'" class="chat-avatar ai">✨</div>
          <div class="chat-bubble" :class="m.role">
            <template v-if="m.role === 'typing'">
              <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
            </template>
            <template v-else>{{ m.content }}</template>
          </div>
          <div v-if="m.role === 'user'" class="chat-avatar user">👤</div>
        </div>
      </div>
      <div class="chat-input-bar">
        <input v-model="chatInput" class="chat-input" placeholder="问我任何关于宠物食品的问题…" @keydown.enter.prevent="sendChatMessage(chatInput)" />
        <button class="chat-send" :disabled="!chatInput.trim() || chatLoading" @click="sendChatMessage(chatInput)">发送</button>
      </div>
    </div>
  </div>

  <TabBar active-tab="butler" />
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import TabBar from '../components/TabBar.vue'
import { useAuth } from '../composables/useAuth'
import { usePets } from '../composables/usePets'
import { useNotifications } from '../composables/useNotifications'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

const { user, profile } = useAuth()
const { pets, fetchPets } = usePets()
const { unreadCount, fetchNotifications } = useNotifications()

const userName = computed(() => profile.value?.display_name || profile.value?.username || '铲屎官')

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶', bird: '🐦', rabbit: '🐰' }
const showPetPicker = ref(false)
const selectedPet = computed(() => pets.value.find(p => p.id === selectedPetId.value) || null)

function selectPet(id) {
  selectedPetId.value = id
  showPetPicker.value = false
}

const TABS = [
  { value: 'recommend', label: '智能推荐' },
  { value: 'ingredients', label: '成分分析' },
  { value: 'compare', label: '产品对比' },
  { value: 'chat', label: '自由问答' },
]
const tab = ref('recommend')

// === 推荐 ===
const selectedPetId = ref('')
const recommendQuery = ref('')
const recommendLoading = ref(false)
const recommendResult = ref(null)
const recommendError = ref('')
const loadingPets = ref(true)

async function handleRecommend() {
  if (!selectedPetId.value) return
  recommendLoading.value = true
  recommendError.value = ''
  recommendResult.value = null
  try {
    const data = await api('/api/ai/recommend', {
      method: 'POST',
      body: JSON.stringify({ petId: selectedPetId.value, query: recommendQuery.value })
    })
    if (data.error) throw new Error(data.error)
    recommendResult.value = data
  } catch (e) {
    recommendError.value = e.message || '推荐失败'
  } finally {
    recommendLoading.value = false
  }
}

function stomachLabel(v) {
  return v === 'sensitive' ? '敏感' : v === 'very_sensitive' ? '极易敏感' : '正常'
}
function scoreColor(s) {
  const pct = Math.round(s * 100)
  return pct >= 80 ? '#34C759' : pct >= 60 ? '#FF9500' : '#FF3B30'
}
function dimLabel(k) {
  const map = { overall_rating: '评分', stomach_match: '肠胃匹配', stool_safety: '软便安全', long_term_stability: '长期稳定', repurchase_rate: '复购率', breed_match: '品种适配' }
  return map[k] || k
}

// === 成分分析 ===
const ingredientInput = ref('')
const ingredientLoading = ref(false)
const ingredientResult = ref('')
const ingredientError = ref('')

async function handleAnalyze() {
  if (!ingredientInput.value.trim()) return
  ingredientLoading.value = true
  ingredientError.value = ''
  ingredientResult.value = ''
  try {
    const data = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: `请分析以下猫粮成分表，给出每个成分的风险等级、主要蛋白来源、适合的猫咪品种，以及整体评价：\n\n${ingredientInput.value}` })
    })
    if (data.error) throw new Error(data.error)
    ingredientResult.value = data.reply || '分析完成'
  } catch (e) {
    ingredientError.value = e.message || '分析失败'
  } finally {
    ingredientLoading.value = false
  }
}

// === 产品对比 ===
const compareProducts = ref(['', ''])
const compareLoading = ref(false)
const compareResult = ref('')
const compareError = ref('')
const searchOpenIdx = ref(-1)
const searchResults = ref([])
let searchTimer = null

function addProduct() { if (compareProducts.value.length < 4) compareProducts.value.push('') }
function removeProduct(i) {
  compareProducts.value.splice(i, 1)
  if (searchOpenIdx.value === i) { searchOpenIdx.value = -1; searchResults.value = [] }
}

function openProductSearch(i) {
  searchOpenIdx.value = i
  if (compareProducts.value[i].trim()) onCompareSearch(i)
}

async function onCompareSearch(i) {
  clearTimeout(searchTimer)
  const q = compareProducts.value[i].trim()
  if (!q) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, brand')
        .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
        .limit(6)
      searchResults.value = data || []
    } catch { searchResults.value = [] }
  }, 300)
}

function pickCompareProduct(i, item) {
  compareProducts.value[i] = `${item.brand} ${item.name}`
  searchOpenIdx.value = -1
  searchResults.value = []
}

async function handleCompare() {
  const valid = compareProducts.value.filter(p => p.trim())
  if (valid.length < 2) return
  compareLoading.value = true
  compareError.value = ''
  compareResult.value = ''
  try {
    const data = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: `请对比以下猫粮产品，从适口性、软便率、复购率、价格、成分优劣、适合品种等维度进行详细对比分析：\n\n${valid.map((p, i) => `${i + 1}. ${p}`).join('\n')}` })
    })
    if (data.error) throw new Error(data.error)
    compareResult.value = data.reply || '对比分析完成'
  } catch (e) {
    compareError.value = e.message || '对比失败'
  } finally {
    compareLoading.value = false
  }
}

// === 自由问答 ===
const CHAT_SUGGESTIONS = [
  '5岁布偶猫，肠胃敏感，应该选什么猫粮？',
  '如何判断猫粮蛋白质来源是否优质？',
  '渴望六种鱼和爱肯拿农场盛宴哪个好？',
  '无谷猫粮真的比有谷猫粮好吗？'
]
const chatMessages = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatMessagesRef = ref(null)

async function sendChatMessage(text) {
  if (!text?.trim() || chatLoading.value) return
  text = text.trim()
  chatInput.value = ''
  chatMessages.value.push({ role: 'user', content: text })
  chatMessages.value.push({ role: 'typing', content: '' })
  chatLoading.value = true
  await nextTick()
  if (chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight

  try {
    const data = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: chatMessages.value.filter(m => m.role !== 'typing') })
    })
    const typingIdx = chatMessages.value.findIndex(m => m.role === 'typing')
    if (typingIdx !== -1) chatMessages.value.splice(typingIdx, 1)
    chatMessages.value.push({ role: 'assistant', content: data.reply || data.message || '收到，让我想想…' })
  } catch {
    const typingIdx = chatMessages.value.findIndex(m => m.role === 'typing')
    if (typingIdx !== -1) chatMessages.value.splice(typingIdx, 1)
    chatMessages.value.push({ role: 'assistant', content: '连接失败，请稍后重试。' })
  } finally {
    chatLoading.value = false
    await nextTick()
    if (chatMessagesRef.value) chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

onMounted(async () => {
  await Promise.all([fetchPets(), fetchNotifications()])
  loadingPets.value = false
  if (pets.value.length) selectedPetId.value = pets.value[0].id
})
</script>

<style scoped>
.app-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(88px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.header{position:relative;padding:20px 24px 0;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 2px 12px rgba(139,94,70,.12);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.header-actions{display:flex;gap:12px}
.action-circle{width:44px;height:44px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s;position:relative}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:20px;height:20px;color:var(--fg)}
.notif-badge{position:absolute;top:6px;right:6px;min-width:16px;height:16px;border-radius:8px;background:#FF3B30;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1}
.greeting{margin-top:16px}
.greeting-main{font-family:var(--font-display);font-size:28px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--fg)}
.greeting-main .pet-name{color:var(--brown)}
.greeting-sub{font-size:14px;font-weight:600;color:var(--muted)}
.seg-bar{display:flex;gap:4px;margin:16px 20px 0;padding:4px;background:rgba(0,0,0,.03);border-radius:var(--radius-btn)}
.seg-item{flex:1;text-align:center;padding:10px 4px;border-radius:var(--radius-btn);font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s}
.seg-item.active{background:var(--card);color:var(--brown);font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.tab-content{padding:16px 20px}
.card{background:var(--card);border-radius:20px;padding:16px;box-shadow:var(--shadow-card);border:1px solid var(--border);margin-bottom:12px}
.card-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.card-icon{font-size:18px}
.card-title{font-size:15px;font-weight:700;color:var(--fg)}
.card-desc{font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.5}
.field{margin-bottom:12px}
.field-label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}
.field-input,.field-select,.field-textarea{width:100%;border:1px solid var(--border);border-radius:12px;padding:10px 14px;font-size:14px;background:var(--card);color:var(--fg);outline:none;font-family:var(--font-body)}
.custom-select{display:flex;align-items:center;justify-content:space-between;width:100%;border:1px solid var(--border);border-radius:12px;padding:10px 14px;font-size:14px;background:var(--card);color:var(--fg);cursor:pointer;transition:border-color .2s}
.custom-select:active{border-color:var(--brown)}
.select-value{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.select-placeholder{flex:1;color:var(--muted)}
.select-arrow{width:16px;height:16px;color:var(--muted);flex-shrink:0;transition:transform .2s}
.select-arrow.open{transform:rotate(180deg)}
.dropdown-menu{position:absolute;left:0;right:0;top:100%;margin-top:6px;background:rgba(255,255,255,.82);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,.6);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:50;overflow:hidden;max-height:240px;overflow-y:auto}
.dropdown-item{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;transition:background .15s}
.dropdown-item:active{background:rgba(0,0,0,.04)}
.dropdown-item.active{background:rgba(139,94,70,.08)}
.dd-emoji{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,rgba(215,181,147,.2),rgba(215,181,147,.08));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.dd-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.dd-name{font-size:14px;font-weight:600;color:var(--fg)}
.dd-meta{font-size:11px;color:var(--muted)}
.dd-check{color:var(--brown);font-size:15px;font-weight:700}
.field-input::placeholder,.field-textarea::placeholder{color:var(--muted)}
.field-textarea{resize:vertical;min-height:80px}
.submit-btn{width:100%;height:44px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer;box-shadow:var(--shadow-btn)}
.submit-btn:disabled{opacity:.4;cursor:default}
.submit-btn:active{transform:scale(.97)}
.skeleton-line{height:40px;border-radius:12px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.empty-hint{text-align:center;padding:16px;font-size:13px;color:var(--muted)}
.link{color:var(--brown);font-weight:500}
.error-card{background:rgba(255,59,48,.05);border:1px solid rgba(255,59,48,.15);border-radius:12px;padding:12px 14px;font-size:13px;color:#FF3B30;margin-bottom:12px}
.result-area{margin-top:12px}
.summary-card{background:rgba(255,122,89,.05);border:1px solid rgba(255,122,89,.15);border-radius:12px;padding:12px 14px;margin-bottom:12px}
.summary-label{font-size:13px;font-weight:600;color:var(--brown)}
.summary-text{font-size:13px;color:var(--muted);margin-left:6px}
.context-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.ctx-tag{font-size:12px;padding:5px 12px;border-radius:var(--radius-btn);background:rgba(0,0,0,.04);color:var(--fg)}
.ctx-tag.warn{background:rgba(255,59,48,.08);color:#FF3B30}
.rec-card{display:flex;gap:12px;background:var(--card);border-radius:16px;padding:14px;box-shadow:var(--shadow-card);border:1px solid var(--border);margin-bottom:10px}
.rec-rank{font-size:18px;font-weight:800;color:var(--brown);font-family:var(--font-num);width:32px;text-align:center;flex-shrink:0}
.rec-body{flex:1;min-width:0}
.rec-name{font-size:14px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rec-brand{font-size:11px;color:var(--muted)}
.rec-price{font-size:14px;font-weight:700;color:var(--brown);font-family:var(--font-num);margin-top:4px}
.rec-score{font-size:20px;font-weight:700;font-family:var(--font-num);margin-top:4px}
.rec-reason{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5}
.rec-dims{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.dim-chip{font-size:10px;padding:3px 8px;border-radius:var(--radius-btn);background:rgba(0,0,0,.04);color:var(--muted)}
.warning-card{background:rgba(255,149,0,.05);border:1px solid rgba(255,149,0,.15);border-radius:12px;padding:12px 14px;margin-top:12px}
.warning-title{font-size:13px;font-weight:600;color:#FF9500;margin-bottom:8px}
.warning-item{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.warning-item:last-child{border-bottom:none}
.warning-reason{color:var(--muted)}
.result-card{margin-top:12px}
.result-label{font-size:13px;font-weight:600;color:var(--fg);margin-bottom:8px}
.result-text{font-size:13px;color:var(--muted);line-height:1.7;white-space:pre-wrap}
.tip-card{background:var(--card);border:1px dashed var(--border);border-radius:16px;padding:14px;margin-top:12px}
.tip-title{font-size:13px;font-weight:600;color:var(--fg);margin-bottom:8px}
.tip-item{font-size:12px;color:var(--muted);line-height:1.8}
.tip-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.tip-grid span{font-size:12px;color:var(--muted)}
.compare-list{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}
.compare-row{display:flex;align-items:center;gap:8px}
.compare-num{width:24px;height:24px;border-radius:50%;background:rgba(255,122,89,.1);color:var(--brown);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.compare-input{flex:1}
.compare-input-wrap{flex:1;position:relative}
.compare-dropdown{position:absolute;left:0;right:0;top:100%;margin-top:4px;background:rgba(255,255,255,.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.5);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:50;overflow:hidden}
.compare-dd-item{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;cursor:pointer;transition:background .15s;border-bottom:1px solid rgba(0,0,0,.04)}
.compare-dd-item:last-child{border-bottom:none}
.compare-dd-item:active{background:rgba(139,94,70,.06)}
.dd-prod-name{font-size:13px;font-weight:500;color:var(--fg)}
.dd-prod-brand{font-size:11px;color:var(--muted)}
.compare-del{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:4px}
.compare-del:active{color:#FF3B30}
.add-btn{background:none;border:none;color:var(--brown);font-size:13px;cursor:pointer;padding:4px 0;margin-bottom:12px}
.add-btn:active{opacity:.7}
/* Chat */
.chat-tab{display:flex;flex-direction:column;height:calc(100vh - 200px)}
.chat-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.chat-welcome-icon{font-size:40px;margin-bottom:12px}
.chat-welcome-title{font-size:18px;font-weight:700;color:var(--fg);margin-bottom:6px}
.chat-welcome-desc{font-size:13px;color:var(--muted);text-align:center;max-width:280px;margin-bottom:20px}
.chat-suggestions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.suggestion-chip{padding:10px 14px;border-radius:16px;background:var(--card);border:1px solid var(--border);font-size:12px;color:var(--fg);cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.03);max-width:260px}
.suggestion-chip:active{background:var(--brown);color:#fff;border-color:var(--brown)}
.chat-messages{flex:1;overflow-y:auto;padding:12px 0;display:flex;flex-direction:column;gap:10px}
.chat-row{display:flex;gap:8px;align-items:flex-end}
.chat-row.user{flex-direction:row-reverse}
.chat-avatar{width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.chat-avatar.ai{background:var(--brown);color:#fff}
.chat-avatar.user{background:rgba(0,0,0,.06)}
.chat-bubble{padding:12px 16px;border-radius:18px;font-size:13px;line-height:1.6;max-width:75%;word-break:break-word}
.chat-bubble.ai{background:var(--card);border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.03);border-bottom-left-radius:4px;color:var(--fg)}
.chat-bubble.user{background:var(--brown);color:#fff;border-bottom-right-radius:4px}
.typing-indicator{display:flex;gap:4px;padding:4px 0}
.typing-dot{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:typingBounce 1.2s ease-in-out infinite}
.typing-dot:nth-child(2){animation-delay:.2s}
.typing-dot:nth-child(3){animation-delay:.4s}
@keyframes typingBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
.chat-input-bar{display:flex;gap:8px;padding:12px 0 0;border-top:1px solid var(--border)}
.chat-input{flex:1;height:40px;border:1px solid var(--border);border-radius:20px;padding:0 16px;font-size:14px;background:var(--card);color:var(--fg);outline:none;font-family:var(--font-body)}
.chat-input::placeholder{color:var(--muted)}
.chat-send{padding:0 18px;height:40px;border-radius:20px;background:var(--brown);color:#fff;border:none;font-size:13px;font-weight:500;cursor:pointer}
.chat-send:disabled{opacity:.4;cursor:default}
.chat-send:active{transform:scale(.95)}
.status-bar-spacer{height:var(--safe-top)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}.anim-delay-2{animation-delay:.2s}
</style>
