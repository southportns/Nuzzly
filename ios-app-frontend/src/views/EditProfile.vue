<template>
  <div class="edit-shell">
    <PageHeader title="编辑资料" />
    <div class="edit-body">
      <div class="avatar-section" @click="triggerAvatarUpload">
        <div class="edit-avatar"><img :src="form.avatar_url || '/mqpyqgao-logo.png'" alt="头像" loading="lazy"></div>
        <span class="change-avatar">更换头像</span>
        <input ref="avatarInput" type="file" accept="image/*" class="avatar-file-input" @change="onAvatarSelected">
      </div>
      <FormField v-model="form.username" label="用户名" type="input" placeholder="请输入用户名" required />
      <FormField v-model="form.bio" label="简介" type="textarea" :rows="3" placeholder="写一段简介让更多人认识你…" />
      <FormField label="性别">
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="gender" value="female" v-model="form.gender"><span>女</span></label>
          <label class="radio-item"><input type="radio" name="gender" value="male" v-model="form.gender"><span>男</span></label>
          <label class="radio-item"><input type="radio" name="gender" value="other" v-model="form.gender"><span>其他</span></label>
        </div>
      </FormField>
      <FormField label="地区">
        <div class="region-group">
          <select v-model="selectedProvince" class="form-select" @change="onProvinceChange">
            <option value="">省份</option>
            <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
          </select>
          <select v-model="selectedCity" class="form-select" :disabled="!selectedProvince" @change="onCityChange">
            <option value="">城市</option>
            <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </FormField>
      <button class="save-btn" :disabled="saving" @click="handleSave">{{ saving ? '保存中...' : '保存' }}</button>
    </div>
    <AvatarCropper v-if="cropperVisible" :image-src="cropImageSrc" @confirm="onCropConfirm" @cancel="onCropCancel" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'
import { validateForm, required, username, maxLength } from '../lib/validation'
import { toastError } from '../lib/error-handling'
import { getProvinces, getCities } from '../lib/china-regions'
import PageHeader from '../components/PageHeader.vue'
import FormField from '../components/FormField.vue'
import AvatarCropper from '../components/AvatarCropper.vue'

const router = useRouter()
const { profile, user, reloadProfile } = useAuth()
const saving = ref(false)

const provinces = getProvinces()
const selectedProvince = ref('')
const selectedCity = ref('')

const cities = computed(() => {
  if (!selectedProvince.value) return []
  return getCities(selectedProvince.value)
})

const avatarInput = ref(null)
const cropperVisible = ref(false)
const cropImageSrc = ref('')

const form = reactive({
  username: '',
  bio: '',
  gender: 'other',
  avatar_url: ''
})

onMounted(() => {
  if (profile.value) {
    form.username = profile.value.username || ''
    form.bio = profile.value.bio || ''
    form.avatar_url = profile.value.avatar_url || ''
    form.gender = profile.value.gender || 'other'
    // 解析已保存的地区数据
    const region = profile.value.region || ''
    if (region) {
      const parts = region.split('·')
      if (parts.length >= 1) selectedProvince.value = parts[0]
      if (parts.length >= 2) selectedCity.value = parts[1]
    }
  }
})

function triggerAvatarUpload() {
  avatarInput.value.click()
}

async function onAvatarSelected(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    Toast({ theme: 'warning', message: '请选择图片文件' })
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    cropImageSrc.value = ev.target.result
    cropperVisible.value = true
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

async function onCropConfirm(blob) {
  cropperVisible.value = false
  const uid = user.value?.id
  if (!uid) return
  // 路径:user-avatars/{uid}/avatar.jpg —— 必须用 folder 结构才能过 RLS (foldername(name))[1] = auth.uid()
  const filePath = `${uid}/avatar.jpg`
  try {
    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(filePath)
    form.avatar_url = urlData.publicUrl
    Toast({ theme: 'success', message: '头像已更新' })
  } catch (err) {
    console.error('[EditProfile] avatar upload failed:', err)
    toastError(err, '上传失败')
  }
}

function onCropCancel() {
  cropperVisible.value = false
  cropImageSrc.value = ''
}

function onProvinceChange() {
  selectedCity.value = ''
}

function onCityChange() {
  // 城市选择完成
}

async function handleSave() {
  if (saving.value) return
  const uid = user.value?.id
  if (!uid) { Toast({ theme: 'error', message: '未登录' }); return }
  const { valid, errors } = validateForm({
    username: [required('请填写用户名'), username()],
    bio: [maxLength(200, '简介最多 200 个字符')]
  }, {
    username: form.username,
    bio: form.bio
  })
  if (!valid) {
    Toast({ theme: 'error', message: Object.values(errors)[0] })
    return
  }
  saving.value = true
  const region = selectedProvince.value && selectedCity.value
    ? `${selectedProvince.value}·${selectedCity.value}`
    : selectedProvince.value || ''
  try {
    const { error } = await supabase.from('profiles')
      .update({
        username: form.username,
        display_name: form.username,
        bio: form.bio,
        gender: form.gender,
        region,
        avatar_url: form.avatar_url
      })
      .eq('id', uid)
    if (error) throw error
    reloadProfile()
    Toast({ theme: 'success', message: '保存成功' })
    router.back()
  } catch (e) {
    toastError(e, '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg);padding-top:var(--safe-top)}
.edit-body{padding:0 16px 40px}
.avatar-section{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 0}
.edit-avatar{width:80px;height:80px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center}
.edit-avatar img{width:100%;height:100%;object-fit:cover}
.change-avatar{font-size:13px;color:var(--brown);font-weight:500;cursor:pointer}
/* iOS WKWebView 上 display:none 的 input 调 .click() 偶发不弹相册,改用绝对定位+透明+禁用点击穿透 */
.avatar-file-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px}
.radio-group{display:flex;gap:16px}
.radio-item{display:flex;align-items:center;gap:6px;font-size:15px;color:var(--fg);cursor:pointer}
.radio-item input{accent-color:var(--brown)}
.region-group{display:flex;gap:12px}
.form-select{flex:1;height:48px;border-radius:var(--radius-btn);border:1.5px solid var(--border);background:var(--card);padding:0 12px;font-size:14px;font-family:var(--font-body);color:var(--fg);outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%237b7b7b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;cursor:pointer}
.form-select:focus{border-color:var(--brown);box-shadow:0 0 0 3px rgba(139,94,70,.1)}
.form-select:disabled{opacity:.5;cursor:not-allowed}
.save-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;font-size:15px;font-weight:600;font-family:var(--font-body);border:none;cursor:pointer;box-shadow:var(--shadow-btn);transition:transform .15s,opacity .15s;margin-top:5px}
.save-btn:active{transform:scale(.97)}
.save-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
</style>
