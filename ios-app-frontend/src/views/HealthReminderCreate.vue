<template>
  <div class="create-shell">
    <div class="create-bg"></div>

    <div class="card-wrapper anim-scale-in">
      <div class="glass-card">
        <!-- 顶部关闭 -->
        <div class="card-top">
          <button class="close-btn" @click="$router.back()" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <h2 class="card-title">新建提醒</h2>

        <!-- 提醒类型 -->
        <div class="field">
          <label class="field-label">提醒类型</label>
          <div class="type-grid">
            <div v-for="t in TYPE_OPTIONS" :key="t.value" class="type-btn" :class="{ active: form.type === t.value }" @click="form.type = t.value">
              <span class="type-icon">{{ t.icon }}</span>
              <span class="type-text">{{ t.label }}</span>
            </div>
          </div>
        </div>

        <!-- 标题 -->
        <div class="field">
          <label class="field-label">标题</label>
          <input v-model="form.title" class="field-input" placeholder="例如：猫三联加强针" />
        </div>

        <!-- 描述 -->
        <div class="field">
          <label class="field-label">描述 <span class="optional">可选</span></label>
          <input v-model="form.description" class="field-input" placeholder="补充说明…" />
        </div>

        <!-- 到期日期 -->
        <div class="field">
          <label class="field-label">到期日期</label>
          <input v-model="form.dueDate" type="date" class="field-input" />
        </div>

        <!-- 循环提醒 -->
        <div class="field">
          <label class="field-label">循环提醒</label>
          <div class="repeat-row">
            <div v-for="r in REPEAT_OPTIONS" :key="r.value" class="repeat-chip" :class="{ active: form.repeat === r.value }" @click="form.repeat = r.value">
              {{ r.label }}
            </div>
          </div>
        </div>

        <!-- 提交 -->
        <button class="submit-btn" :disabled="!canSubmit || submitting" @click="handleCreate">
          {{ submitting ? '创建中…' : '创建提醒' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHealthReminders } from '../composables/useHealthReminders'

const router = useRouter()
const route = useRoute()
const { addReminder } = useHealthReminders()

const petId = computed(() => route.query.petId || '')
const submitting = ref(false)

const form = ref({
  type: 'vaccination',
  title: '',
  description: '',
  dueDate: '',
  repeat: 'none',
})

const TYPE_OPTIONS = [
  { value: 'vaccination', label: '疫苗', icon: '💉' },
  { value: 'medication', label: '用药', icon: '💊' },
  { value: 'checkup', label: '体检', icon: '🩺' },
  { value: 'custom', label: '自定义', icon: '📌' },
]

const REPEAT_OPTIONS = [
  { value: 'none', label: '不循环' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' },
  { value: 'yearly', label: '每年' },
]

const canSubmit = computed(() => form.value.title.trim() && form.value.dueDate && petId.value)

async function handleCreate() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    await addReminder({
      pet_id: petId.value,
      reminder_type: form.value.type,
      title: form.value.title.trim(),
      description: form.value.description.trim() || null,
      due_date: form.value.dueDate,
      repeat_interval: form.value.repeat,
    })
    router.back()
  } catch (e) {
    console.warn('创建失败:', e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-shell{width:100%;min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
.create-bg{position:fixed;inset:0;background:linear-gradient(160deg,rgba(215,181,147,.15) 0%,rgba(245,240,235,.6) 40%,rgba(108,138,105,.08) 100%);z-index:0}
.card-wrapper{position:relative;z-index:1;width:100%;max-width:400px}
.glass-card{background:rgba(255,255,255,.72);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border-radius:28px;border:1px solid rgba(255,255,255,.6);box-shadow:0 24px 80px rgba(0,0,0,.08),0 8px 32px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.8);padding:28px 24px 32px;position:relative}
.card-top{display:flex;justify-content:flex-end;margin-bottom:4px}
.close-btn{width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.05);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s}
.close-btn:active{transform:scale(.85)}
.close-btn svg{width:18px;height:18px;color:var(--muted)}
.card-title{font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--fg);text-align:center;margin-bottom:24px;letter-spacing:-.01em}
.field{margin-bottom:18px}
.field-label{display:block;font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:500;letter-spacing:.01em}
.optional{font-weight:400;opacity:.6}
.field-input{width:100%;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:12px 16px;font-size:14px;background:rgba(255,255,255,.6);color:var(--fg);outline:none;font-family:var(--font-body);transition:border-color .2s,box-shadow .2s}
.field-input:focus{border-color:var(--brown);box-shadow:0 0 0 3px rgba(139,94,70,.08)}
.field-input::placeholder{color:var(--muted)}
.type-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.type-btn{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.5);border:1.5px solid rgba(0,0,0,.06);cursor:pointer;transition:all .2s}
.type-btn:active{transform:scale(.96)}
.type-btn.active{background:rgba(139,94,70,.08);border-color:var(--brown)}
.type-icon{font-size:18px}
.type-text{font-size:13px;font-weight:500;color:var(--fg)}
.repeat-row{display:flex;gap:6px;flex-wrap:wrap}
.repeat-chip{padding:8px 16px;border-radius:var(--radius-btn);background:rgba(255,255,255,.5);border:1.5px solid rgba(0,0,0,.06);font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s}
.repeat-chip:active{transform:scale(.96)}
.repeat-chip.active{background:rgba(139,94,70,.08);border-color:var(--brown);color:var(--brown)}
.submit-btn{width:100%;height:50px;border-radius:16px;background:var(--brown);color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(139,94,70,.25);margin-top:8px;transition:transform .15s,box-shadow .15s;letter-spacing:.01em}
.submit-btn:disabled{opacity:.35;cursor:default;box-shadow:none}
.submit-btn:active:not(:disabled){transform:scale(.97);box-shadow:0 4px 12px rgba(139,94,70,.2)}
@keyframes scaleIn{from{opacity:0;transform:scale(.92) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
.anim-scale-in{opacity:0;animation:scaleIn .45s cubic-bezier(.22,1,.36,1) forwards}
</style>
