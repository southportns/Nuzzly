<template>
  <div class="edit-shell">
    <PageHeader title="提交使用反馈" :on-back="onBack" />

    <!-- 进度条 -->
    <div class="progress-bar">
      <div class="progress-track"><div class="progress-fill" :style="{ width: (step / 6 * 100) + '%' }"></div></div>
      <div class="progress-steps">
        <span v-for="(label, i) in STEP_LABELS" :key="label" :class="{ active: step === i + 1, done: step > i + 1 }">
          <svg v-if="step > i + 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <template v-else>{{ i + 1 }}</template>
          {{ label }}
        </span>
      </div>
    </div>

    <div class="edit-body">
      <!-- Step 1: 使用时长 -->
      <template v-if="step === 1">
        <h2 class="step-title">你已经使用这款产品多久了？</h2>
        <p class="step-sub">{{ productName || '选择产品使用时长' }}</p>
        <div class="duration-list">
          <button v-for="d in DURATION_BUCKETS" :key="d.value" class="duration-item" :class="{ active: form.usage_duration === d.value }" @click="selectDuration(d.value)">
            <div class="dur-info"><span class="dur-label">{{ d.label }}</span><span class="dur-days">{{ d.days }}</span></div>
            <span class="dur-trust">{{ trustLabel(d.value) }}</span>
          </button>
        </div>
        <div v-if="form.usage_duration === 'custom'" class="custom-days">
          <label class="form-label">具体使用天数</label>
          <input v-model="form.usage_duration_custom_days" type="number" min="1" max="3650" class="form-input" placeholder="例如 45" />
          <span class="form-hint">范围 1 - 3650 天</span>
        </div>
      </template>

      <!-- Step 2: 选择宠物 -->
      <template v-if="step === 2">
        <h2 class="step-title">选择使用该产品的宠物</h2>
        <p class="step-sub">基于宠物体质进行精准匹配</p>
        <div v-if="pets.length" class="pet-list">
          <button v-for="p in pets" :key="p.id" class="pet-item" :class="{ active: form.pet_id === p.id }" @click="form.pet_id = p.id">
            <div class="pet-avatar">{{ SPECIES_EMOJI[p.species] || '🐾' }}</div>
            <div class="pet-meta"><span class="pet-name">{{ p.name }}</span><span class="pet-breed">{{ p.breed || '未知品种' }}<template v-if="p.stomach_health === 'sensitive'"> · 肠胃敏感</template></span></div>
          </button>
        </div>
        <div v-else class="empty-mini">
          <p>还没有宠物档案</p>
          <button class="link-btn" @click="$router.push('/pet/create')">创建宠物档案</button>
        </div>
      </template>

      <!-- Step 3: 结构化评分 -->
      <template v-if="step === 3">
        <h2 class="step-title">结构化评分</h2>
        <p class="step-sub">请对以下维度进行评分（1=很差, 5=很好）</p>
        <div class="rating-list">
          <RatingRow v-for="r in RATING_ROWS" :key="r.key" :label="r.label" :desc="r.desc" :reverse="r.reverse" v-model="form[r.key]" />
        </div>
      </template>

      <!-- Step 4: 详细评价 -->
      <template v-if="step === 4">
        <h2 class="step-title">详细反馈</h2>
        <p class="step-sub">写下你的使用体验（可选但推荐，提高评价可信度）</p>
        <div class="form-group">
          <label class="form-label">评价内容</label>
          <textarea v-model="form.review_text" class="form-textarea" rows="4" placeholder="分享一下你家宠物的使用体验，其他铲屎官需要你的真实反馈…"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">优点 👍</label>
            <input v-model="form.pros" type="text" class="form-input" placeholder="例如：适口性好，便便正常" />
          </div>
          <div class="form-group">
            <label class="form-label">缺点 👎</label>
            <input v-model="form.cons" type="text" class="form-input" placeholder="例如：价格偏高" />
          </div>
        </div>
        <FormField v-model="form.transition_period_days" label="换粮过渡期（天）" type="number" :min="0" :max="30" placeholder="如从旧粮切换到新粮用了几天" />
        <FormField label="是否愿意复购？" required>
          <ChipGroup v-model="form.would_repurchase" :options="REPURCHASE_OPTIONS" />
        </FormField>
        <div class="form-group">
          <label class="verify-row">
            <input type="checkbox" v-model="form.verified_purchase" />
            <span>我已购买并使用过此产品</span>
          </label>
        </div>
      </template>

      <!-- Step 5: 凭证说明 -->
      <template v-if="step === 5">
        <h2 class="step-title">上传购买凭证</h2>
        <p class="step-sub">凭证可显著提升评价权重和信任分</p>
        <div class="voucher-info">
          <div class="voucher-icon">📋</div>
          <p class="voucher-title">凭证说明</p>
          <ul class="voucher-list">
            <li>购买小票 / 订单截图 / 包装正面照 / 批次号照片</li>
            <li>凭证将由 AI 系统进行真实性验证</li>
            <li>上传凭证可显著提升评价权重和信任分</li>
          </ul>
          <p class="voucher-note">移动端暂不支持凭证上传，可前往网页版上传。本次评价将直接提交。</p>
        </div>
      </template>

      <!-- Step 6: 提交确认 -->
      <template v-if="step === 6">
        <h2 class="step-title">确认提交</h2>
        <p class="step-sub">提交后系统将在 7/14/30/60/90/180 天后提醒你进行长期追踪反馈</p>
        <div class="summary-card">
          <div class="summary-row"><span class="summary-key">产品</span><span class="summary-val">{{ productName || '—' }}</span></div>
          <div class="summary-row"><span class="summary-key">使用时长</span><span class="summary-val">{{ durationLabel }}</span></div>
          <div class="summary-row"><span class="summary-key">宠物</span><span class="summary-val">{{ selectedPetName }}</span></div>
          <div class="summary-row"><span class="summary-key">总体评分</span><span class="summary-val">{{ form.overall_rating ? form.overall_rating + ' 星' : '未评分' }}</span></div>
          <div class="summary-row"><span class="summary-key">复购意愿</span><span class="summary-val">{{ form.would_repurchase === true ? '会复购' : form.would_repurchase === false ? '不会复购' : '未选' }}</span></div>
          <div v-if="form.review_text" class="summary-row"><span class="summary-key">评价</span><span class="summary-val">{{ form.review_text }}</span></div>
        </div>
      </template>
    </div>

    <footer class="edit-footer">
      <button v-if="step > 1" class="footer-btn ghost" @click="step--">上一步</button>
      <button v-if="step < 6" class="footer-btn primary" :disabled="!canNext" @click="step++">下一步</button>
      <button v-else class="footer-btn primary" :disabled="submitting" @click="handleSubmit">{{ submitting ? '提交中…' : '提交反馈' }}</button>
    </footer>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { supabase } from '../lib/supabase'
import { usePets } from '../composables/usePets'
import { useReviews } from '../composables/useReviews'
import PageHeader from '../components/PageHeader.vue'
import { emit, EVENTS } from '../lib/event-bus'

const route = useRoute()
const router = useRouter()
const { pets, fetchPets } = usePets()
const { submitting, submitReview, DURATION_BUCKETS } = useReviews()

const productId = route.query.productId

// 缺失参数时提前提示并回退，onMounted 内二次校验阻止后续请求
if (!productId) {
  Toast({ theme: 'error', message: '缺少产品参数' })
  router.back()
}

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }
const STEP_LABELS = ['时长', '宠物', '评分', '详细', '凭证', '提交']
const REPURCHASE_OPTIONS = [
  { value: true, label: '会复购' },
  { value: false, label: '不会复购' }
]
const step = ref(1)
const productName = ref('')

const RATING_ROWS = [
  { key: 'palatability_rating', label: '适口性', desc: '宠物是否爱吃' },
  { key: 'stool_rating', label: '排便情况', desc: '便便是否正常' },
  { key: 'black_chin_rating', label: '黑下巴', desc: '是否有黑下巴问题', reverse: true },
  { key: 'vomit_rating', label: '呕吐', desc: '是否有呕吐问题', reverse: true },
  { key: 'tear_stain_rating', label: '泪痕', desc: '泪痕情况', reverse: true },
  { key: 'shedding_rating', label: '掉毛', desc: '掉毛情况', reverse: true },
  { key: 'coat_rating', label: '毛发改善', desc: '毛发是否有改善' },
  { key: 'energy_rating', label: '精神状态', desc: '精力是否充沛' },
  { key: 'overall_rating', label: '总体评分', desc: '你的综合评价' }
]

const form = reactive({
  usage_duration: '',
  usage_duration_custom_days: '',
  pet_id: '',
  palatability_rating: null,
  stool_rating: null,
  coat_rating: null,
  energy_rating: null,
  overall_rating: null,
  black_chin_rating: null,
  vomit_rating: null,
  tear_stain_rating: null,
  shedding_rating: null,
  would_repurchase: null,
  review_text: '',
  pros: '',
  cons: '',
  transition_period_days: '',
  verified_purchase: false
})

function selectDuration(v) {
  form.usage_duration = v
  if (v !== 'custom') step.value = 2
}

function trustLabel(v) {
  if (v === 'gt_1y' || v === 'm6_to_1y') return '最高可信度'
  if (v === 'm6' || v === '1m_to_3m') return '高可信度'
  if (v === 'custom') return '按实际天数计分'
  return ''
}

const DURATION_LABELS = {
  lt_1w: '一周以内', '1w_to_2w': '半个月内', '2w_to_1m': '一个月内',
  '1m_to_3m': '三个月内', m6: '半年', 'm6_to_1y': '半年到一年',
  gt_1y: '一年以上', custom: '自定义'
}
const durationLabel = computed(() => {
  if (!form.usage_duration) return '—'
  let label = DURATION_LABELS[form.usage_duration] || form.usage_duration
  if (form.usage_duration === 'custom' && form.usage_duration_custom_days) {
    label += ` (${form.usage_duration_custom_days}天)`
  }
  return label
})
const selectedPetName = computed(() => pets.value.find(p => p.id === form.pet_id)?.name || '—')

const canNext = computed(() => {
  if (step.value === 1) {
    if (!form.usage_duration) return false
    if (form.usage_duration === 'custom' && (!form.usage_duration_custom_days || Number(form.usage_duration_custom_days) < 1 || Number(form.usage_duration_custom_days) > 3650)) return false
    return true
  }
  if (step.value === 2) return !!form.pet_id
  return true
})

function onBack() {
  if (step.value > 1) step.value--
  else router.back()
}

async function handleSubmit() {
  if (submitting.value) return
  try {
    await submitReview({ ...form, product_id: productId })
    Toast({ theme: 'success', message: '评价已提交！系统将在 7/14/30/60/90/180 天后提醒你进行长期追踪反馈。' })

    // 触发评价创建事件
    emit(EVENTS.REVIEW_CREATED, {
      productId: productId,
      rating: form.overall_rating
    })

    router.back()
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '提交失败' })
  }
}

// 内联 RatingRow 组件（避免新建独立文件）
const RatingRow = {
  props: ['label', 'desc', 'reverse', 'modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'rating-row' }, [
      h('div', { class: 'rating-info' }, [
        h('div', { class: 'rating-label' }, props.label),
        h('div', { class: 'rating-desc' }, props.desc)
      ]),
      h('div', { class: 'rating-stars' }, [1, 2, 3, 4, 5].map(i =>
        h('svg', {
          key: i,
          class: ['star', { active: props.modelValue >= i }],
          viewBox: '0 0 24 24',
          fill: props.modelValue >= i ? 'currentColor' : 'none',
          stroke: 'currentColor',
          'stroke-width': 1.5,
          onClick: () => emit('update:modelValue', i)
        }, [
          h('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' })
        ])
      ))
    ])
  }
}

onMounted(async () => {
  if (!productId) return
  await fetchPets()
  // 查询产品名
  const { data } = await supabase.from('products').select('name').eq('id', productId).maybeSingle()
  if (data) productName.value = data.name
})
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(100px + var(--safe-bottom));display:flex;flex-direction:column}
.progress-bar{padding:0 20px 16px}
.progress-track{height:3px;background:rgba(0,0,0,.06);border-radius:2px;overflow:hidden}
.progress-fill{height:100%;background:var(--brown);border-radius:2px;transition:width .3s}
.progress-steps{display:flex;justify-content:space-between;margin-top:8px}
.progress-steps span{font-size:10px;color:var(--muted);display:flex;align-items:center;gap:2px;font-weight:500}
.progress-steps span.active{color:var(--brown);font-weight:600}
.progress-steps span.done{color:var(--green)}
.progress-steps svg{width:10px;height:10px}
.edit-body{flex:1;padding:0 20px;overflow-y:auto}
.step-title{font-size:20px;font-weight:700;color:var(--fg);margin-bottom:6px;letter-spacing:-.01em}
.step-sub{font-size:13px;color:var(--muted);margin-bottom:20px}
.duration-list{display:flex;flex-direction:column;gap:10px}
.duration-item{display:flex;align-items:center;justify-content:space-between;padding:16px;border-radius:16px;background:var(--card);border:1.5px solid var(--border);cursor:pointer;transition:all .2s;text-align:left}
.duration-item.active{border-color:var(--brown);background:rgba(139,94,70,.04)}
.duration-item:active{transform:scale(.98)}
.dur-info{display:flex;flex-direction:column;gap:2px}
.dur-label{font-size:15px;font-weight:600;color:var(--fg)}
.dur-days{font-size:11px;color:var(--muted)}
.dur-trust{font-size:11px;color:var(--brown);background:rgba(139,94,70,.08);padding:4px 10px;border-radius:var(--radius-btn);white-space:nowrap}
.custom-days{margin-top:16px;padding:16px;border-radius:16px;background:rgba(0,0,0,.03);border:1px solid var(--border)}
.form-label{display:block;font-size:13px;font-weight:600;color:var(--fg);margin-bottom:8px}
.form-input{width:100%;height:44px;padding:0 14px;border-radius:12px;background:var(--card);border:1.5px solid var(--border);font-size:15px;color:var(--fg);outline:none;transition:border-color .2s}
.form-input:focus{border-color:var(--brown)}
.form-textarea{width:100%;padding:12px 14px;border-radius:12px;background:var(--card);border:1.5px solid var(--border);font-size:15px;color:var(--fg);outline:none;resize:none;font-family:var(--font-body);transition:border-color .2s}
.form-textarea:focus{border-color:var(--brown)}
.form-hint{display:block;font-size:11px;color:var(--muted);margin-top:6px}
.form-group{margin-bottom:16px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pet-list{display:flex;flex-direction:column;gap:10px}
.pet-item{display:flex;align-items:center;gap:12px;padding:14px;border-radius:16px;background:var(--card);border:1.5px solid var(--border);cursor:pointer;transition:all .2s;text-align:left}
.pet-item.active{border-color:var(--brown);background:rgba(139,94,70,.04)}
.pet-avatar{width:40px;height:40px;border-radius:50%;background:rgba(139,94,70,.08);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.pet-meta{display:flex;flex-direction:column;gap:2px}
.pet-name{font-size:15px;font-weight:600;color:var(--fg)}
.pet-breed{font-size:11px;color:var(--muted)}
.empty-mini{text-align:center;padding:40px 20px}
.empty-mini p{font-size:14px;color:var(--muted);margin-bottom:12px}
.link-btn{padding:8px 20px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:13px;font-weight:500;cursor:pointer}
.rating-list{display:flex;flex-direction:column;gap:20px}
.rating-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.rating-info{flex:1}
.rating-label{font-size:14px;font-weight:600;color:var(--fg);margin-bottom:2px}
.rating-desc{font-size:11px;color:var(--muted)}
.rating-stars{display:flex;gap:4px}
.rating-stars .star{width:24px;height:24px;color:#E0E0E0;cursor:pointer;transition:transform .15s}
.rating-stars .star.active{color:#FF9500}
.rating-stars .star:active{transform:scale(1.2)}
.chip-group{display:flex;gap:8px}
.chip{flex:1;text-align:center;padding:12px;border-radius:12px;background:var(--card);border:1.5px solid var(--border);font-size:14px;font-weight:500;color:var(--fg);cursor:pointer;transition:all .2s}
.chip.active{border-color:var(--brown);background:rgba(139,94,70,.06);color:var(--brown)}
.verify-row{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--fg)}
.verify-row input{width:18px;height:18px;accent-color:var(--brown)}
.voucher-info{padding:24px;border-radius:20px;background:var(--card);border:1px solid var(--border);text-align:center}
.voucher-icon{font-size:40px;margin-bottom:12px}
.voucher-title{font-size:15px;font-weight:600;color:var(--fg);margin-bottom:12px}
.voucher-list{text-align:left;font-size:12px;color:var(--muted);line-height:1.8;list-style:none;margin-bottom:12px}
.voucher-list li{padding-left:16px;position:relative}
.voucher-list li::before{content:'·';position:absolute;left:4px}
.voucher-note{font-size:11px;color:var(--brown);background:rgba(139,94,70,.06);padding:8px 12px;border-radius:8px;margin-top:8px}
.summary-card{background:var(--card);border-radius:20px;padding:16px;border:1px solid var(--border)}
.summary-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.summary-row:last-child{border-bottom:none;padding-bottom:0}
.summary-row:first-child{padding-top:0}
.summary-key{font-size:13px;color:var(--muted);flex-shrink:0}
.summary-val{font-size:13px;color:var(--fg);font-weight:500;text-align:right;word-break:break-word}
.edit-footer{display:flex;gap:12px;padding:16px 20px;background:rgba(245,243,241,.9);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.footer-btn{flex:1;height:48px;border-radius:var(--radius-btn);font-size:15px;font-weight:600;cursor:pointer;border:none;transition:transform .15s}
.footer-btn:active{transform:scale(.97)}
.footer-btn.primary{background:var(--brown);color:#fff;box-shadow:var(--shadow-btn)}
.footer-btn.ghost{background:var(--card);color:var(--fg);border:1px solid var(--border)}
.footer-btn:disabled{opacity:.4;cursor:not-allowed}
</style>
