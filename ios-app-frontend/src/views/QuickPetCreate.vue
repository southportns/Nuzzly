<template>
  <div class="edit-shell">
    <PageHeader title="快速建档" action-text="创建" :action-loading="saving" :action-disabled="saving" @action="handleSave" />
    <div class="edit-body">
      <div class="quick-tip anim-fade-up">只需 3 个信息即可开始获得推荐</div>

      <FormField v-model="form.name" label="名字" type="input" placeholder="你家主子的名字" required />

      <FormField label="物种">
        <ChipGroup v-model="form.species" :options="SPECIES" />
      </FormField>

      <FormField v-model="form.breed" label="品种" type="input" placeholder="如：英国短毛猫" />

      <div class="form-row">
        <FormField v-model="form.age_years" label="年龄（岁）" type="number" :min="0" :max="30" placeholder="0" half />
        <FormField v-model="form.age_months" label="月" type="number" :min="0" :max="11" placeholder="0" half />
      </div>

      <div class="quick-actions">
        <button class="quick-full-btn" @click="$router.replace('/pet/create')">填写完整档案（可选）</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { usePets } from '../composables/usePets'
import { validateForm, required, petName, range } from '../lib/validation'
import PageHeader from '../components/PageHeader.vue'
import FormField from '../components/FormField.vue'
import ChipGroup from '../components/ChipGroup.vue'

const router = useRouter()
const { createPet } = usePets()
const saving = ref(false)

const SPECIES = [
  { value: 'cat', label: '猫', emoji: '🐱' },
  { value: 'dog', label: '狗', emoji: '🐶' },
  { value: 'bird', label: '鸟', emoji: '🐦' },
  { value: 'rabbit', label: '兔', emoji: '🐰' }
]

const form = reactive({
  name: '',
  species: 'cat',
  breed: '',
  age_years: 0,
  age_months: 0
})

async function handleSave() {
  if (saving.value) return
  const { valid, errors } = validateForm({
    name: [required('请填写名字'), petName('名字 1-20 个字符')],
    age_months: [range(0, 11, '月份应为 0-11')]
  }, {
    name: form.name,
    age_months: form.age_months
  })
  if (!valid) {
    Toast({ theme: 'error', message: Object.values(errors)[0] })
    return
  }
  const years = Number(form.age_years) || 0
  const months = Number(form.age_months) || 0
  if (years < 0 || years > 30) {
    Toast({ theme: 'error', message: '年龄（岁）需在 0-30 之间' })
    return
  }

  saving.value = true
  try {
    const pet = await createPet({
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || null,
      age_years: years,
      age_months: months,
      is_active: true
    })
    Toast({ theme: 'success', message: '创建成功' })
    router.replace({ path: '/dietary-preference', query: { petId: pet.id, petName: form.name.trim() } })
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '创建失败' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg);padding-top:var(--safe-top)}
.edit-body{padding:0 16px 40px}
.quick-tip{text-align:center;font-size:13px;color:var(--muted);padding:12px 0 20px}
.form-row{display:flex;gap:12px}
.quick-actions{margin-top:24px;text-align:center}
.quick-full-btn{background:none;border:none;font-size:13px;color:var(--brown);cursor:pointer;padding:8px 16px}
.quick-full-btn:active{opacity:.7}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
</style>
