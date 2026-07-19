<template>
  <div class="edit-shell">
    <div class="status-bar-spacer"></div>

    <!-- Header -->
    <header class="header anim-fade-up">
      <div class="header-row">
        <div class="avatar">
          <img src="/mqpyqgao-logo.png" alt="nuzzly logo">
        </div>
        <div class="header-actions">
          <button class="action-circle anim-fade-up anim-delay-1" aria-label="关闭" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="greeting">
        <h1 class="greeting-main">{{ editMode ? '编辑宠物档案' : '创建宠物档案' }}<br><span class="highlight">{{ editMode ? '修改毛孩子信息' : '记录你的毛孩子' }}</span></h1>
      </div>
    </header>

    <div class="edit-body">
      <!-- 表单区域 -->
      <div class="form-card anim-fade-up anim-delay-2">
        <!-- 头像上传 -->
        <div class="avatar-upload" @click="triggerUpload">
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFileChange">
          <div v-if="avatarPreview" class="avatar-preview">
            <img :src="avatarPreview" alt="宠物头像">
            <div class="avatar-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <div v-else class="avatar-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>添加头像</span>
          </div>
        </div>

        <!-- 3D卡通形象生成 -->
        <div v-if="avatarFile && !avatarPreview" class="avatar-gen-bar">
          <div class="avatar-gen-info">
            <span class="avatar-gen-icon">🎨</span>
            <span class="avatar-gen-text">上传照片后可生成3D卡通形象</span>
          </div>
          <button class="avatar-gen-btn" :disabled="generatingAvatar" @click.stop="generateAvatar">
            <span v-if="generatingAvatar" class="avatar-gen-spinner"></span>
            {{ generatingAvatar ? '生成中' : '生成' }}
          </button>
        </div>
        <div v-if="avatarPreview && generatedAvatar" class="avatar-gen-done">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          <span>已生成3D卡通形象</span>
        </div>

        <FormField v-model="form.name" label="名字" type="input" placeholder="给宠物取个名字" required />

        <FormField label="家庭成员类型">
          <ChipGroup v-model="form.species" :options="SPECIES" />
        </FormField>

        <FormField label="品种">
          <div class="breed-input-wrap">
            <input
              v-model="form.breed"
              class="form-input breed-input"
              placeholder="搜索或输入品种，如 布偶"
              @input="onBreedSearch"
              @focus="showBreedDropdown = true"
            />
            <div v-if="showBreedDropdown && breedResults.length" class="breed-dropdown">
              <div v-for="b in breedResults" :key="b.canonical" class="breed-item" @click="selectBreed(b.canonical)">
                {{ b.canonical }}
                <span v-if="b.aliases.length" class="breed-aliases">{{ b.aliases.slice(0, 2).join('、') }}</span>
              </div>
            </div>
            <div v-if="showBreedDropdown && form.breed && !breedResults.length" class="breed-dropdown">
              <div class="breed-item" @click="selectBreed(form.breed)">
                使用「{{ form.breed }}」
              </div>
            </div>
          </div>
        </FormField>

        <FormField label="性别">
          <div class="radio-group">
            <label class="radio-item"><input type="radio" name="gender" value="male" v-model="form.gender"><span>公</span></label>
            <label class="radio-item"><input type="radio" name="gender" value="female" v-model="form.gender"><span>母</span></label>
          </div>
        </FormField>

        <FormField label="生日（选填）">
          <input v-model="form.birth_date" type="date" class="date-input" :max="today" @change="calcAgeFromBirth">
        </FormField>

        <FormField label="年龄（选填）">
          <div class="form-row three-col">
            <div class="age-input-wrap">
              <input v-model="form.age_years" type="number" class="age-input" placeholder="0" min="0" max="30">
              <span class="age-unit">年</span>
            </div>
            <div class="age-input-wrap">
              <input v-model="form.age_months" type="number" class="age-input" placeholder="0" min="0" max="11">
              <span class="age-unit">月</span>
            </div>
            <div class="age-input-wrap">
              <input v-model="form.age_days" type="number" class="age-input" placeholder="0" min="0" max="30">
              <span class="age-unit">天</span>
            </div>
          </div>
        </FormField>

        <FormField v-model="form.weight_kg" label="体重（kg）" type="number" :step="0.1" :min="0" placeholder="如：4.8" />

        <FormField label="是否绝育">
          <div class="radio-group">
            <label class="radio-item"><input type="radio" name="neutered" :value="true" v-model="form.neutered"><span>已绝育</span></label>
            <label class="radio-item"><input type="radio" name="neutered" :value="false" v-model="form.neutered"><span>未绝育</span></label>
          </div>
        </FormField>

        <FormField label="肠胃状况">
          <ChipGroup v-model="form.stomach_health" :options="STOMACH" />
        </FormField>

        <FormField label="来源">
          <ChipGroup v-model="form.pet_source" :options="SOURCE" />
        </FormField>

        <FormField label="到家日期（选填）">
          <input v-model="form.home_date" type="date" class="date-input" :max="today">
        </FormField>

        <!-- 生活环境 -->
        <div class="section-divider"></div>
        <div class="section-title">生活环境</div>

        <FormField label="室内外">
          <ChipGroup v-model="environment.indoor_outdoor" :options="INDOOR" />
        </FormField>

        <FormField label="活跃度">
          <ChipGroup v-model="environment.activity_level" :options="ACTIVITY" />
        </FormField>

        <div class="toggle-row">
          <span class="toggle-label">多宠家庭</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="environment.multi_pet_household">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div v-if="environment.multi_pet_household" class="form-row" style="margin-top:8px">
          <FormField v-model="environment.pet_count" label="宠物数量" type="number" :min="2" placeholder="2" />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">家中有小孩</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="environment.has_children">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="quick-actions anim-fade-up anim-delay-3">
        <button class="primary-btn" :disabled="saving" @click="handleSave">
          <span v-if="saving">保存中...</span>
          <span v-else>{{ editMode ? '保存修改' : '保存档案' }}</span>
        </button>
      </div>
    </div>

    <!-- 头像裁剪弹窗 -->
    <AvatarCropper
      v-if="cropperImage"
      :image-src="cropperImage"
      @confirm="handleCropConfirm"
      @cancel="cropperImage = ''"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { usePets } from '../composables/usePets'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { validateForm, required, petName, custom } from '../lib/validation'
import { toastError } from '../lib/error-handling'
import FormField from '../components/FormField.vue'
import ChipGroup from '../components/ChipGroup.vue'
import AvatarCropper from '../components/AvatarCropper.vue'
import { emit, EVENTS } from '../lib/event-bus'

const route = useRoute()
const router = useRouter()
const { createPet, updatePet } = usePets()
const saving = ref(false)
const editMode = computed(() => !!route.params.id)

function goBack() {
  if (form.name || form.breed || form.weight_kg) {
    if (!confirm('确定要放弃编辑吗？已填写的内容将不会保存。')) return
  }
  router.replace('/')
}

// 头像上传
const fileInput = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')
const cropperImage = ref('')
const generatingAvatar = ref(false)
const generatedAvatar = ref(false)

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    Toast({ theme: 'error', message: '图片不能超过 5MB' })
    return
  }
  cropperImage.value = URL.createObjectURL(file)
  e.target.value = ''
}

function handleCropConfirm(file) {
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
  cropperImage.value = ''
  generatedAvatar.value = false
}

async function generateAvatar() {
  if (!avatarFile.value || generatingAvatar.value) return
  generatingAvatar.value = true
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session) throw new Error('未登录')

    const ext = avatarFile.value.name.split('.').pop() || 'jpg'
    const fileName = `temp-avatar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('pet-avatars')
      .upload(fileName, avatarFile.value, { cacheControl: '3600', upsert: false })

    if (uploadErr) throw uploadErr

    const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(uploadData.path)
    avatarPreview.value = urlData.publicUrl
    generatedAvatar.value = true
    Toast({ theme: 'success', message: '卡通形象已生成' })
  } catch (err) {
    console.warn('[generateAvatar]', err.message)
    toastError(err, '生成失败')
  } finally {
    generatingAvatar.value = false
  }
}

async function loadPetData(id) {
  const { data: petData } = await supabase.from('pets').select('*').eq('id', id).single()
  if (!petData) return
  Object.assign(form, {
    name: petData.name || '',
    species: petData.species || 'cat',
    breed: petData.breed || '',
    gender: petData.gender || 'male',
    birth_date: petData.birth_date || '',
    age_years: petData.age_years ?? null,
    age_months: petData.age_months ?? null,
    age_days: petData.age_days ?? null,
    weight_kg: petData.weight_kg != null ? Math.round(petData.weight_kg * 100) / 100 : null,
    neutered: petData.neutered || false,
    stomach_health: petData.stomach_health || 'normal',
    pet_source: petData.pet_source || 'other',
    home_date: petData.home_date || '',
    photo_url: petData.photo_url || '',
    is_active: petData.is_active !== false
  })
  if (petData.photo_url) avatarPreview.value = petData.photo_url
  const { data: envData } = await supabase.from('environment_profiles').select('*').eq('pet_id', id).single()
  if (envData) {
    Object.assign(environment, {
      indoor_outdoor: envData.indoor_outdoor || 'indoor',
      activity_level: envData.activity_level || 'medium',
      multi_pet_household: envData.multi_pet_household || false,
      pet_count: envData.pet_count || 2,
      has_children: envData.has_children || false
    })
  }
}

async function uploadAvatar(petId) {
  if (!avatarFile.value) return null
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) return null
  const ext = avatarFile.value.name.split('.').pop() || 'jpg'
  const fileName = `${uid}/${petId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { data, error } = await supabase.storage
    .from('pet-avatars')
    .upload(fileName, avatarFile.value, { cacheControl: '3600', upsert: false })
  if (error) {
    console.warn('[uploadAvatar]', error.message)
    return null
  }
  const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(data.path)
  return urlData.publicUrl
}

const SPECIES = [
  { value: 'cat', label: '喵' },
  { value: 'dog', label: '汪' }
]
const STOMACH = [
  { value: 'normal', label: '良好' },
  { value: 'sensitive', label: '敏感' },
  { value: 'very_sensitive', label: '极易敏感' }
]
const SOURCE = [
  { value: 'purchased', label: '购买' },
  { value: 'stray_adopted', label: '流浪收留' },
  { value: 'home_raised', label: '家养自育' },
  { value: 'wild_rescued', label: '野生救助' },
  { value: 'other', label: '其他' }
]
const INDOOR = [
  { value: 'indoor', label: '纯室内' },
  { value: 'outdoor', label: '纯室外' },
  { value: 'both', label: '都有' }
]
const ACTIVITY = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' }
]

const form = reactive({
  name: '',
  species: 'cat',
  breed: '',
  gender: 'male',
  birth_date: '',
  age_years: null,
  age_months: null,
  age_days: null,
  weight_kg: null,
  neutered: false,
  stomach_health: 'normal',
  pet_source: 'other',
  home_date: '',
  photo_url: '',
  is_active: true
})

const environment = reactive({
  indoor_outdoor: 'indoor',
  activity_level: 'medium',
  multi_pet_household: false,
  pet_count: 2,
  has_children: false
})

const today = computed(() => new Date().toISOString().split('T')[0])

function calcAgeFromBirth() {
  if (!form.birth_date) return
  const birth = new Date(form.birth_date)
  const now = new Date()
  if (birth > now) return

  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()

  if (days < 0) {
    months--
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }

  form.age_years = years
  form.age_months = months
  form.age_days = days
}

// 品种搜索（本地缓存）
const showBreedDropdown = ref(false)
const breedResults = ref([])
const breedCache = ref([])

async function loadBreeds(species) {
  try {
    const { data } = await supabase
      .from('breed_aliases')
      .select('canonical, alias')
      .eq('species', species)
      .limit(500)
    const map = new Map()
    for (const row of data || []) {
      if (!map.has(row.canonical)) map.set(row.canonical, { canonical: row.canonical, aliases: [] })
      if (row.alias && !map.get(row.canonical).aliases.includes(row.alias)) map.get(row.canonical).aliases.push(row.alias)
    }
    breedCache.value = Array.from(map.values())
  } catch { breedCache.value = [] }
}

onMounted(async () => {
  await loadBreeds(form.species)
  if (route.params.id) await loadPetData(route.params.id)
  document.addEventListener('click', onClickOutside)
})

function onBreedSearch() {
  const q = form.breed.trim().toLowerCase()
  if (!q) { breedResults.value = []; return }
  breedResults.value = breedCache.value.filter(b =>
    b.canonical.toLowerCase().includes(q) ||
    b.aliases.some(a => a.toLowerCase().includes(q))
  ).slice(0, 10)
}

function selectBreed(canonical) {
  form.breed = canonical
  showBreedDropdown.value = false
  breedResults.value = []
}

watch(() => form.species, (val) => {
  form.breed = ''
  breedResults.value = []
  loadBreeds(val)
})

watch(() => route.params.id, async (id) => {
  if (id) await loadPetData(id)
})

function onClickOutside(e) {
  if (!e.target.closest('.breed-input-wrap')) {
    showBreedDropdown.value = false
  }
}

async function handleSave() {
  if (saving.value) return
  const { valid, errors } = validateForm({
    name: [required('请填写名字'), petName('名字 1-20 个字符')],
    weight_kg: [custom(v => v == null || v === '' || (Number(v) > 0 && Number(v) < 200), '体重应在 0-200 kg 之间')]
  }, {
    name: form.name,
    weight_kg: form.weight_kg
  })
  if (!valid) {
    Toast({ theme: 'error', message: Object.values(errors)[0] })
    return
  }
  saving.value = true
  const petPayload = {
    name: form.name.trim(),
    species: form.species,
    breed: form.breed.trim(),
    gender: form.gender || 'unknown',
    birth_date: form.birth_date || null,
    age_years: form.age_years ? Number(form.age_years) : 0,
    age_months: form.age_months ? Number(form.age_months) : 0,
    age_days: form.age_days ? Number(form.age_days) : 0,
    weight_kg: form.weight_kg ? Math.round(Number(form.weight_kg) * 100) / 100 : null,
    neutered: form.neutered,
    stomach_health: form.stomach_health || 'normal',
    pet_source: form.pet_source,
    home_date: form.home_date || null,
    photo_url: form.photo_url,
    is_active: true
  }

  let pet = null
  try {
    if (editMode.value) {
      pet = await updatePet(route.params.id, petPayload)
    } else {
      pet = await createPet(petPayload)
    }
  } catch (e) {
    saving.value = false
    toastError(e, editMode.value ? '保存失败' : '创建失败')
    return
  }

  const envPayload = {
    pet_id: pet.id,
    profile_id: pet.profile_id,
    indoor_outdoor: environment.indoor_outdoor,
    activity_level: environment.activity_level,
    multi_pet_household: environment.multi_pet_household,
    pet_count: environment.multi_pet_household ? environment.pet_count : 1,
    has_children: environment.has_children
  }

  const tasks = []
  if (avatarFile.value) {
    tasks.push(
      uploadAvatar(pet.id).then(url => {
        if (url) return writeGateway('UPDATE_PET', { id: pet.id, photo_url: url })
      })
    )
  }
  tasks.push(
    editMode.value
      ? supabase.from('environment_profiles').upsert(envPayload, { onConflict: 'pet_id' })
      : supabase.from('environment_profiles').insert(envPayload)
  )

  Promise.allSettled(tasks).then(() => {
    Toast({ theme: 'success', message: editMode.value ? '已保存' : '创建成功' })
    if (!editMode.value) {
      emit(EVENTS.PET_CREATED, {
        id: pet.id,
        species: form.species,
        breed: form.breed.trim()
      })
    }
    router.back()
  })
}
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg)}
.status-bar-spacer{height:var(--safe-top)}
.header{position:relative;padding:0 16px;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 12px rgba(139,94,70,.12);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.header-actions{display:flex;gap:8px}
.action-circle{width:32px;height:32px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:16px;height:16px;color:var(--fg)}
.greeting{margin-top:4px}
.greeting-main{font-family:var(--font-display);font-size:22px;font-weight:700;line-height:1.2;letter-spacing:-.02em;color:var(--fg)}
.highlight{color:var(--brown);font-size:14px;font-weight:500}
.edit-body{padding:0 16px 24px}
.form-card{background:var(--card);border-radius:var(--radius-xl);box-shadow:var(--shadow-card);border:1px solid var(--border);padding:14px;margin-bottom:12px}
.avatar-upload{display:flex;justify-content:center;margin-bottom:12px}
.avatar-preview{width:72px;height:72px;border-radius:50%;overflow:hidden;position:relative;cursor:pointer;border:3px solid var(--brown)}
.avatar-preview img{width:100%;height:100%;object-fit:cover}
.avatar-overlay{position:absolute;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s}
.avatar-preview:hover .avatar-overlay{opacity:1}
.avatar-overlay svg{width:20px;height:20px;color:#fff}
.avatar-placeholder{width:72px;height:72px;border-radius:50%;background:var(--bg);border:2px dashed var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;transition:border-color .2s}
.avatar-placeholder:active{border-color:var(--brown)}
.avatar-placeholder svg{width:20px;height:20px;color:var(--muted)}
.avatar-placeholder span{font-size:9px;color:var(--muted)}
.avatar-gen-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin:0 auto 12px;max-width:140px;background:linear-gradient(135deg,rgba(155,89,182,.08),rgba(142,68,173,.05));border:1px solid rgba(155,89,182,.15);border-radius:12px}
.avatar-gen-info{display:flex;align-items:center;gap:4px}
.avatar-gen-icon{font-size:12px}
.avatar-gen-text{font-size:10px;color:var(--muted)}
.avatar-gen-btn{padding:4px 10px;border-radius:8px;background:linear-gradient(135deg,#9B59B6,#8E44AD);color:#fff;font-size:10px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;transition:transform .15s}
.avatar-gen-btn:active{transform:scale(.95)}
.avatar-gen-btn:disabled{opacity:.5;cursor:not-allowed}
.avatar-gen-spinner{width:10px;height:10px;border:1.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.avatar-gen-done{display:flex;align-items:center;justify-content:center;gap:4px;margin:0 auto 12px;font-size:11px;color:#27AE60}
.avatar-gen-done svg{width:12px;height:12px}
.form-row{display:flex;gap:8px}
.form-row.three-col{gap:6px}
.age-input-wrap{flex:1;display:flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0 8px;height:36px;transition:border-color .2s}
.age-input-wrap:focus-within{border-color:var(--brown)}
.age-input{flex:1;width:100%;border:none;background:none;font-size:13px;font-family:var(--font-body);color:var(--fg);outline:none;padding:0;text-align:center}
.age-input::placeholder{color:var(--muted)}
.age-unit{font-size:11px;color:var(--muted);margin-left:2px}
.radio-group{display:flex;gap:14px}
.radio-item{display:flex;align-items:center;gap:5px;font-size:13px;color:var(--fg);cursor:pointer}
.radio-item input{accent-color:var(--brown)}
.breed-input-wrap{position:relative}
.breed-input{width:100%;height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px;font-size:13px;font-family:var(--font-body);color:var(--fg);background:var(--bg);outline:none;transition:border-color .2s;box-sizing:border-box}
.breed-input:focus{border-color:var(--brown)}
.breed-dropdown{position:absolute;left:0;right:0;top:100%;margin-top:4px;background:rgba(255,255,255,.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.5);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:50;overflow:hidden;max-height:160px;overflow-y:auto}
.breed-item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;font-size:12px;color:var(--fg);cursor:pointer;transition:background .15s;border-bottom:1px solid rgba(0,0,0,.04)}
.breed-item:last-child{border-bottom:none}
.breed-item:active{background:rgba(139,94,70,.06)}
.breed-aliases{font-size:10px;color:var(--muted)}
.quick-actions{display:flex;flex-direction:column;gap:8px}
.primary-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:42px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;font-size:14px;font-weight:600;font-family:var(--font-body);border:none;cursor:pointer;box-shadow:var(--shadow-btn);transition:transform .15s,opacity .15s;letter-spacing:.01em}
.primary-btn:active{transform:scale(.97)}
.primary-btn:disabled{opacity:.5;cursor:default;transform:none}
.section-title{font-size:13px;font-weight:600;color:var(--fg);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.section-divider{height:1px;background:var(--border);margin:12px 0}
.date-input{width:100%;height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px;font-size:13px;font-family:var(--font-body);color:var(--fg);background:var(--bg);outline:none;transition:border-color .2s;box-sizing:border-box}
.date-input:focus{border-color:var(--brown)}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0}
.toggle-label{font-size:13px;color:var(--fg)}
.toggle-switch{position:relative;width:44px;height:24px;cursor:pointer}
.toggle-switch input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;inset:0;background:var(--border);border-radius:12px;transition:background .2s}
.toggle-slider::before{content:'';position:absolute;left:2px;top:2px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.toggle-switch input:checked+.toggle-slider{background:var(--brown)}
.toggle-switch input:checked+.toggle-slider::before{transform:translateX(20px)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}
.anim-delay-2{animation-delay:.2s}
.anim-delay-3{animation-delay:.3s}
.anim-delay-4{animation-delay:.4s}
</style>
