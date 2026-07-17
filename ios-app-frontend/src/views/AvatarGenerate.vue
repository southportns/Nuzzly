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
        <h1 class="greeting-main">生成3D卡通形象<br><span class="highlight">AI帮你创建专属宠物形象</span></h1>
      </div>
    </header>

    <div class="edit-body">
      <!-- 照片上传/预览区域 -->
      <div class="preview-card anim-fade-up anim-delay-2" @click="triggerUpload">
        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFileChange">
        <div v-if="avatarUrl" class="preview-image">
          <img :src="avatarUrl" alt="卡通形象">
          <div class="preview-hint">卡通形象已生成</div>
        </div>
        <div v-else-if="photoPreview" class="preview-image">
          <img :src="photoPreview" alt="宠物照片">
          <div class="preview-hint">点击可更换照片</div>
        </div>
        <div v-else class="preview-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>点击上传宠物照片</span>
        </div>
      </div>

      <!-- 生成按钮 -->
      <div class="action-area anim-fade-up anim-delay-3">
        <button
          class="generate-btn"
          :disabled="!photoFile || generating || !!avatarUrl"
          @click="generateAvatar"
        >
          <span v-if="generating" class="loading-spinner"></span>
          {{ generating ? '生成中...' : '生成3D卡通形象' }}
        </button>
        <div v-if="avatarUrl" class="success-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          卡通形象已生成并保存
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="finish-area anim-fade-up anim-delay-4">
        <button v-if="avatarUrl" class="finish-btn" @click="goToCreatePet">下一步：创建宠物档案</button>
        <button v-else class="skip-btn" @click="goToCreatePet">跳过，直接创建档案</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const fileInput = ref(null)
const photoFile = ref(null)
const photoPreview = ref('')
const avatarUrl = ref('')
const generating = ref(false)

function goBack() {
  router.replace('/')
}

function goToCreatePet() {
  router.push('/pet/create')
}

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('图片不能超过 5MB')
    return
  }
  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
  e.target.value = ''
}

async function generateAvatar() {
  if (!photoFile.value || generating.value || avatarUrl.value) return

  generating.value = true
  try {
    // 先上传照片到 Supabase Storage
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gooydkocbowchxoahhlg.supabase.co'
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ucS1uQjFw8kVuuNPkBfFAQ_5t1toCK5'
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('未登录')

    const ext = photoFile.value.name.split('.').pop() || 'jpg'
    const fileName = `temp-avatar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('pet-avatars')
      .upload(fileName, photoFile.value, { cacheControl: '3600', upsert: false })

    if (uploadErr) throw uploadErr

    const { data: urlData } = supabase.storage.from('pet-avatars').getPublicUrl(uploadData.path)
    const uploadedUrl = urlData.publicUrl

    // 调用生成 API（需要 petId，这里先用临时方式）
    // 实际生产中应先创建 pet 再生成 avatar
    alert('照片已上传。请先创建宠物档案，然后在宠物详情页生成卡通形象。')
    photoFile.value = null
    photoPreview.value = ''
  } catch (err) {
    console.error('上传失败:', err)
    alert(err.message || '上传失败，请稍后重试')
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.edit-shell{min-height:100vh;background:var(--bg);padding-bottom:calc(80px + var(--safe-bottom))}
.status-bar-spacer{height:var(--safe-top)}
.header{position:relative;padding:4px 24px 0;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 12px rgba(139,94,70,.12);flex-shrink:0;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.header-actions{display:flex;gap:10px}
.action-circle{width:36px;height:36px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s,box-shadow .2s}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:18px;height:18px;color:var(--fg)}
.greeting{margin-top:8px}
.greeting-main{font-family:var(--font-display);font-size:28px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--fg)}
.highlight{color:var(--brown)}
.edit-body{padding:20px 24px}
.preview-card{background:var(--card);border-radius:20px;border:1px solid var(--border);padding:24px;margin-bottom:20px;cursor:pointer;transition:transform .2s}
.preview-card:active{transform:scale(.98)}
.preview-image{display:flex;flex-direction:column;align-items:center;gap:12px}
.preview-image img{max-width:200px;max-height:200px;border-radius:16px;object-fit:cover}
.preview-hint{font-size:12px;color:var(--muted)}
.preview-placeholder{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px;color:var(--muted)}
.preview-placeholder svg{width:48px;height:48px;opacity:.3}
.action-area{margin-bottom:20px}
.generate-btn{width:100%;padding:16px;border-radius:16px;background:linear-gradient(135deg,#9B59B6,#8E44AD);color:#fff;font-size:16px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .2s,opacity .2s}
.generate-btn:active{transform:scale(.98)}
.generate-btn:disabled{opacity:.5;cursor:not-allowed}
.loading-spinner{width:20px;height:20px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.success-hint{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px;font-size:14px;color:#27AE60}
.success-hint svg{width:16px;height:16px}
.finish-area{margin-top:24px}
.finish-btn{width:100%;padding:16px;border-radius:16px;background:var(--brown);color:#fff;font-size:16px;font-weight:600;border:none;cursor:pointer;transition:transform .2s}
.finish-btn:active{transform:scale(.98)}
.skip-btn{width:100%;padding:16px;border-radius:16px;background:transparent;color:var(--muted);font-size:16px;font-weight:500;border:1px solid var(--border);cursor:pointer;transition:transform .2s}
.skip-btn:active{transform:scale(.98)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}
.anim-delay-2{animation-delay:.2s}
.anim-delay-3{animation-delay:.3s}
.anim-delay-4{animation-delay:.4s}
</style>
