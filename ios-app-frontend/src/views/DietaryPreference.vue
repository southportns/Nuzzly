<template>
  <div class="edit-shell">
    <PageHeader :title="completed ? '设置完成' : '饮食偏好'" />

    <!-- 完成状态 -->
    <div v-if="completed" class="complete-body">
      <div class="complete-icon">✅</div>
      <h3 class="complete-title">设置完成！</h3>
      <p class="complete-desc">{{ petName }}的饮食偏好已记录，系统将基于此提供更精准的推荐</p>
      <button class="complete-btn" @click="goHome">查看推荐</button>
    </div>

    <!-- 表单 -->
    <div v-else class="edit-body">
      <div class="quick-tip anim-fade-up">告诉我们 {{ petName }} 的饮食习惯</div>

      <FormField v-model="currentFood" label="当前吃的猫粮/狗粮" type="input" placeholder="如：渴望鸡肉猫粮" />

      <FormField label="肠胃状况">
        <ChipGroup v-model="stomachHealth" :options="STOMACH" />
      </FormField>

      <div class="allergy-section">
        <div class="allergy-header">
          <span class="allergy-label">⚠️ 过敏原</span>
        </div>
        <div v-if="allergies.length" class="allergy-tags">
          <span v-for="a in allergies" :key="a.id" class="allergy-tag">
            {{ a.allergen }} · {{ a.severityLabel }}
            <button class="allergy-del" @click="removeAllergy(a.id)">×</button>
          </span>
        </div>
        <div class="allergy-add-row">
          <input v-model="newAllergen" class="allergy-input" placeholder="如：鸡肉、谷物" @keydown.enter="addAllergy" />
          <select v-model="newSeverity" class="allergy-select">
            <option value="mild">轻微</option>
            <option value="moderate">中度</option>
            <option value="severe">严重</option>
          </select>
          <button class="allergy-add-btn" :disabled="!newAllergen.trim()" @click="addAllergy">+</button>
        </div>
      </div>

      <FormField v-model="notes" label="其他备注" type="textarea" placeholder="如：不喜欢湿粮、只吃冻干…" :rows="2" />

      <div class="submit-area">
        <button class="submit-btn" :disabled="saving" @click="handleSubmit">
          {{ saving ? '保存中…' : '保存并获取推荐' }}
        </button>
        <button class="skip-btn" @click="goHome">跳过，稍后设置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import { writeGateway } from '../lib/gateway'
import PageHeader from '../components/PageHeader.vue'
import FormField from '../components/FormField.vue'
import ChipGroup from '../components/ChipGroup.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const petId = computed(() => route.query.petId || '')
const petName = computed(() => route.query.petName || '宠物')

const currentFood = ref('')
const stomachHealth = ref('normal')
const allergies = ref([])
const newAllergen = ref('')
const newSeverity = ref('mild')
const notes = ref('')
const saving = ref(false)
const completed = ref(false)

const STOMACH = [
  { value: 'normal', label: '正常' },
  { value: 'sensitive', label: '敏感' },
  { value: 'very_sensitive', label: '极易敏感' }
]

const SEVERITY_LABEL = { mild: '轻微', moderate: '中度', severe: '严重' }

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function addAllergy() {
  if (!newAllergen.value.trim()) return
  allergies.value.push({
    id: genId(),
    allergen: newAllergen.value.trim(),
    severity: newSeverity.value,
    severityLabel: SEVERITY_LABEL[newSeverity.value]
  })
  newAllergen.value = ''
  newSeverity.value = 'mild'
}

function removeAllergy(id) {
  allergies.value = allergies.value.filter(a => a.id !== id)
}

async function handleSubmit() {
  if (!user.value || !petId.value) {
    Toast({ theme: 'error', message: '参数错误' })
    return
  }
  saving.value = true
  try {
    // 更新肠胃状况
    const { error: petErr } = await writeGateway('UPDATE_PET', { id: petId.value, stomach_health: stomachHealth.value })
    if (petErr) throw petErr

    // 保存过敏原（逐条检查错误）
    const allergyErrors = []
    for (const a of allergies.value) {
      const { error } = await writeGateway('CREATE_PET_ALLERGY', {
        pet_id: petId.value,
        allergen: a.allergen,
        severity: a.severity,
        confirmed: false
      })
      if (error) allergyErrors.push(`${a.allergen}: ${error}`)
    }
    if (allergyErrors.length > 0) {
      Toast({ theme: 'warning', message: `部分过敏原保存失败: ${allergyErrors.join(', ')}` })
    }

    // 保存当前饮食记录
    if (currentFood.value.trim()) {
      const { error: dietErr } = await writeGateway('CREATE_DIET_LOG', {
        pet_id: petId.value,
        profile_id: user.value.id,
        food_name: currentFood.value.trim(),
        food_type: 'dry_food',
        notes: notes.value.trim() || '建档时记录',
        logged_date: new Date().toISOString().slice(0, 10)
      })
      if (dietErr) console.error('[DietaryPreference] create diet log failed:', dietErr)
    }

    completed.value = true
    Toast({ theme: 'success', message: '饮食偏好已保存' })
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '保存失败' })
  } finally {
    saving.value = false
  }
}

function goHome() {
  router.replace('/')
}
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg);padding-top:var(--safe-top)}
.edit-body{padding:0 16px 40px}
.quick-tip{text-align:center;font-size:13px;color:var(--muted);padding:12px 0 20px}
.complete-body{display:flex;flex-direction:column;align-items:center;padding:60px 32px 40px}
.complete-icon{font-size:56px;margin-bottom:16px}
.complete-title{font-size:20px;font-weight:700;color:var(--fg);margin-bottom:8px}
.complete-desc{font-size:14px;color:var(--muted);text-align:center;line-height:1.6;margin-bottom:32px}
.complete-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;box-shadow:var(--shadow-btn)}
.complete-btn:active{transform:scale(.97)}
.allergy-section{margin-bottom:20px}
.allergy-header{margin-bottom:10px}
.allergy-label{font-size:13px;font-weight:500;color:var(--fg)}
.allergy-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.allergy-tag{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:var(--radius-btn);background:rgba(255,59,48,.06);border:1px solid rgba(255,59,48,.12);font-size:12px;color:#FF3B30;font-weight:500}
.allergy-del{background:none;border:none;color:#FF3B30;font-size:14px;cursor:pointer;padding:0 2px;opacity:.6}
.allergy-del:active{opacity:1}
.allergy-add-row{display:flex;gap:8px}
.allergy-input{flex:1;height:40px;border:1px solid var(--border);border-radius:12px;padding:0 12px;font-size:13px;background:var(--card);color:var(--fg);outline:none}
.allergy-input::placeholder{color:var(--muted)}
.allergy-select{width:80px;height:40px;border:1px solid var(--border);border-radius:12px;padding:0 8px;font-size:12px;background:var(--card);color:var(--fg);outline:none}
.allergy-add-btn{width:40px;height:40px;border-radius:12px;background:var(--brown);color:#fff;border:none;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.allergy-add-btn:disabled{opacity:.4;cursor:default}
.allergy-add-btn:active{transform:scale(.95)}
.submit-area{margin-top:24px;display:flex;flex-direction:column;gap:12px}
.submit-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;box-shadow:var(--shadow-btn)}
.submit-btn:disabled{opacity:.5;cursor:default}
.submit-btn:active{transform:scale(.97)}
.skip-btn{background:none;border:none;font-size:13px;color:var(--muted);cursor:pointer;padding:8px;text-align:center}
.skip-btn:active{color:var(--fg)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
</style>
