<template>
  <div class="edit-shell">
    <PageHeader title="追踪反馈" :on-back="onBack" />

    <div v-if="loading" class="loading-state">
      <div class="shimmer-block shimmer"></div>
    </div>

    <template v-else-if="schedule">
      <div class="context-bar">
        <span class="ctx-product">{{ schedule.product_reviews?.products?.name }}</span>
        <span class="ctx-sep">·</span>
        <span class="ctx-pet">{{ schedule.product_reviews?.pets?.name }}</span>
        <span class="ctx-sep">·</span>
        <span class="ctx-day">Day {{ schedule.followup_day }}</span>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar">
        <div class="progress-track"><div class="progress-fill" :style="{ width: (step / 5 * 100) + '%' }"></div></div>
        <div class="progress-steps">
          <span v-for="(label, i) in STEP_LABELS" :key="label" :class="{ active: step === i + 1, done: step > i + 1 }">
            <svg v-if="step > i + 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <template v-else>{{ label }}</template>
          </span>
        </div>
      </div>

      <div class="edit-body">
        <!-- Step 1: 排便 -->
        <template v-if="step === 1">
          <div class="step-emoji">💩</div>
          <h2 class="step-title">排便情况如何？</h2>
          <p class="step-sub">使用 {{ productName }} 后，{{ petName }} 的排便状况</p>
          <div class="opt-list">
            <button v-for="o in IMPROVE_OPTS" :key="o.value" class="opt-item" :class="{ active: form.stool_status === o.value }" @click="pick('stool_status', o.value)">
              <span class="opt-emoji">{{ o.emoji }}</span>
              <div class="opt-info"><span class="opt-label">{{ o.label }}</span><span class="opt-desc">{{ o.desc }}</span></div>
            </button>
          </div>
          <button class="skip-btn" @click="pick('stool_status', 'not_applicable')">跳过此问题</button>
        </template>

        <!-- Step 2: 毛发 -->
        <template v-if="step === 2">
          <div class="step-emoji">✨</div>
          <h2 class="step-title">毛发变化如何？</h2>
          <p class="step-sub">使用后的毛发状态变化</p>
          <div class="opt-list">
            <button v-for="o in COAT_OPTS" :key="o.value" class="opt-item" :class="{ active: form.coat_status === o.value }" @click="pick('coat_status', o.value)">
              <span class="opt-emoji">{{ o.emoji }}</span>
              <div class="opt-info"><span class="opt-label">{{ o.label }}</span><span class="opt-desc">{{ o.desc }}</span></div>
            </button>
          </div>
          <button class="skip-btn" @click="pick('coat_status', 'not_applicable')">跳过此问题</button>
        </template>

        <!-- Step 3: 精神 -->
        <template v-if="step === 3">
          <div class="step-emoji">⚡</div>
          <h2 class="step-title">精神状态如何？</h2>
          <p class="step-sub">宠物的精力和活跃程度</p>
          <div class="opt-list">
            <button v-for="o in ENERGY_OPTS" :key="o.value" class="opt-item" :class="{ active: form.energy_status === o.value }" @click="pick('energy_status', o.value)">
              <span class="opt-emoji">{{ o.emoji }}</span>
              <div class="opt-info"><span class="opt-label">{{ o.label }}</span><span class="opt-desc">{{ o.desc }}</span></div>
            </button>
          </div>
          <button class="skip-btn" @click="pick('energy_status', 'not_applicable')">跳过此问题</button>
        </template>

        <!-- Step 4: 是否继续喂食 -->
        <template v-if="step === 4">
          <div class="step-emoji">🍽️</div>
          <h2 class="step-title">是否继续喂食？</h2>
          <p class="step-sub">你会继续给 {{ petName }} 吃 {{ productName }} 吗？</p>
          <div class="opt-list">
            <button class="opt-item" :class="{ active: form.continued_usage === true }" @click="pick('continued_usage', true)">
              <span class="opt-emoji">✅</span>
              <div class="opt-info"><span class="opt-label">是，继续喂食</span></div>
            </button>
            <button class="opt-item" :class="{ active: form.continued_usage === false }" @click="pick('continued_usage', false)">
              <span class="opt-emoji">❌</span>
              <div class="opt-info"><span class="opt-label">不，已经停了</span></div>
            </button>
          </div>
        </template>

        <!-- Step 5: 复购意愿 + 备注 + 提交 -->
        <template v-if="step === 5">
          <div class="step-emoji">❤️</div>
          <h2 class="step-title">是否愿意复购？</h2>
          <p class="step-sub">你会再次购买这个产品吗？</p>
          <div class="opt-list">
            <button v-for="o in REPURCHASE_OPTS" :key="o.value" class="opt-item" :class="{ active: form.repurchase_intent === o.value }" @click="form.repurchase_intent = o.value">
              <span class="opt-emoji">{{ o.emoji }}</span>
              <div class="opt-info"><span class="opt-label">{{ o.label }}</span><span class="opt-desc">{{ o.desc }}</span></div>
            </button>
          </div>
          <div class="form-group">
            <label class="form-label">还有什么想补充的吗？（可选）</label>
            <textarea v-model="form.health_notes" class="form-textarea" rows="3" placeholder="补充说明…"></textarea>
          </div>
        </template>
      </div>

      <footer class="edit-footer">
        <button v-if="step > 1" class="footer-btn ghost" @click="step--">上一步</button>
        <button v-if="step < 5" class="footer-btn primary" :disabled="!canNext" @click="step++">下一步</button>
        <button v-else class="footer-btn primary" :disabled="submitting" @click="handleSubmit">{{ submitting ? '提交中…' : '提交追踪反馈' }}</button>
      </footer>
    </template>

    <EmptyState
      v-else
      icon="🔍"
      title="追踪计划不存在"
      action-text="返回列表"
      @action="$router.push('/followups')"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useFollowups } from '../composables/useFollowups'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const { submitting, fetchSchedule, submitFollowupEntry } = useFollowups()
const schedule = ref(null)
const loading = ref(true)

const STEP_LABELS = ['排便', '毛发', '精神', '喂食', '复购']
const step = ref(1)

const IMPROVE_OPTS = [
  { value: 'improved', emoji: '🙂', label: '很好', desc: '成型正常，无异味加重' },
  { value: 'unchanged', emoji: '😐', label: '一般', desc: '和之前差不多' },
  { value: 'worsened', emoji: '😞', label: '不好', desc: '软便、腹泻或便秘' }
]
const COAT_OPTS = [
  { value: 'improved', emoji: '✨', label: '更好了', desc: '毛发更亮、更顺滑' },
  { value: 'unchanged', emoji: '😐', label: '没变化', desc: '和之前一样' },
  { value: 'worsened', emoji: '😞', label: '更差了', desc: '干燥、掉毛增多' }
]
const ENERGY_OPTS = [
  { value: 'improved', emoji: '⚡', label: '活跃', desc: '比之前更有精力' },
  { value: 'unchanged', emoji: '😐', label: '正常', desc: '和平时一样' },
  { value: 'worsened', emoji: '😴', label: '低迷', desc: '比之前更懒散' }
]
const REPURCHASE_OPTS = [
  { value: 'will_repurchase', emoji: '❤️', label: '会复购', desc: '愿意再次购买' },
  { value: 'undecided', emoji: '🤔', label: '不确定', desc: '还在考虑' },
  { value: 'will_not', emoji: '❌', label: '不会复购', desc: '不会再买' }
]

const form = reactive({
  stool_status: '',
  coat_status: '',
  energy_status: '',
  continued_usage: null,
  repurchase_intent: '',
  health_notes: ''
})

const productName = computed(() => schedule.value?.product_reviews?.products?.name || '该产品')
const petName = computed(() => schedule.value?.product_reviews?.pets?.name || '宠物')

const canNext = computed(() => {
  if (step.value === 1) return !!form.stool_status
  if (step.value === 2) return !!form.coat_status
  if (step.value === 3) return !!form.energy_status
  if (step.value === 4) return form.continued_usage !== null
  return true
})

function pick(key, value) {
  form[key] = value
  // 选择后自动进入下一步（复购步不自动跳，因为还要填备注）
  if (step.value < 5) {
    setTimeout(() => step.value++, 200)
  }
}

function onBack() {
  if (step.value > 1) step.value--
  else router.back()
}

async function handleSubmit() {
  if (submitting.value) return
  try {
    await submitFollowupEntry({
      schedule_id: route.params.id,
      stool_status: form.stool_status,
      coat_status: form.coat_status,
      energy_status: form.energy_status,
      continued_usage: form.continued_usage,
      repurchase_intent: form.repurchase_intent,
      health_notes: form.health_notes
    })
    Toast({ theme: 'success', message: `Day ${schedule.value.followup_day} 追踪反馈已提交！` })
    router.replace('/followups')
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '提交失败' })
  }
}

onMounted(async () => {
  schedule.value = await fetchSchedule(route.params.id)
  loading.value = false
})
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(100px + var(--safe-bottom));display:flex;flex-direction:column}
.context-bar{display:flex;align-items:center;gap:6px;padding:0 20px 12px;font-size:12px;color:var(--muted);flex-wrap:wrap}
.ctx-product{color:var(--brown);font-weight:600}
.ctx-day{color:var(--brown);font-weight:600}
.progress-bar{padding:0 20px 16px}
.progress-track{height:3px;background:rgba(0,0,0,.06);border-radius:2px;overflow:hidden}
.progress-fill{height:100%;background:var(--brown);border-radius:2px;transition:width .3s}
.progress-steps{display:flex;justify-content:space-between;margin-top:8px}
.progress-steps span{font-size:10px;color:var(--muted);display:flex;align-items:center;gap:2px;font-weight:500}
.progress-steps span.active{color:var(--brown);font-weight:600}
.progress-steps span.done{color:var(--green)}
.progress-steps svg{width:10px;height:10px}
.edit-body{flex:1;padding:0 20px;overflow-y:auto}
.step-emoji{font-size:48px;text-align:center;margin:8px 0 16px}
.step-title{font-size:22px;font-weight:700;color:var(--fg);text-align:center;margin-bottom:6px;letter-spacing:-.01em}
.step-sub{font-size:13px;color:var(--muted);text-align:center;margin-bottom:24px}
.opt-list{display:flex;flex-direction:column;gap:10px}
.opt-item{display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;background:var(--card);border:1.5px solid var(--border);cursor:pointer;transition:all .2s;text-align:left}
.opt-item.active{border-color:var(--brown);background:rgba(139,94,70,.04)}
.opt-item:active{transform:scale(.98)}
.opt-emoji{font-size:28px;flex-shrink:0}
.opt-info{display:flex;flex-direction:column;gap:2px}
.opt-label{font-size:15px;font-weight:600;color:var(--fg)}
.opt-desc{font-size:12px;color:var(--muted)}
.skip-btn{display:block;width:100%;text-align:center;padding:14px;background:transparent;border:none;font-size:13px;color:var(--muted);cursor:pointer;margin-top:8px}
.skip-btn:active{opacity:.6}
.form-group{margin-top:20px}
.form-label{display:block;font-size:13px;font-weight:600;color:var(--fg);margin-bottom:8px}
.form-textarea{width:100%;padding:12px 14px;border-radius:12px;background:var(--card);border:1.5px solid var(--border);font-size:14px;color:var(--fg);outline:none;resize:none;font-family:var(--font-body);transition:border-color .2s}
.form-textarea:focus{border-color:var(--brown)}
.edit-footer{display:flex;gap:12px;padding:16px 20px;background:rgba(245,243,241,.9);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
.footer-btn{flex:1;height:48px;border-radius:var(--radius-btn);font-size:15px;font-weight:600;cursor:pointer;border:none;transition:transform .15s}
.footer-btn:active{transform:scale(.97)}
.footer-btn.primary{background:var(--brown);color:#fff;box-shadow:var(--shadow-btn)}
.footer-btn.ghost{background:var(--card);color:var(--fg);border:1px solid var(--border)}
.footer-btn:disabled{opacity:.4;cursor:not-allowed}
.loading-state{padding:20px}
.shimmer-block{height:300px;border-radius:24px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
</style>
