<template>
  <div class="edit-shell">
    <PageHeader :title="title" />

    <div class="edit-body">
      <!-- 账号与安全：修改密码 -->
      <template v-if="key === 'account'">
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <div class="readonly-value">{{ userEmail || '未登录' }}</div>
        </div>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input v-model="pwForm.password" type="password" class="form-input" placeholder="至少 6 位" />
        </div>
        <div class="form-group">
          <label class="form-label">确认新密码</label>
          <input v-model="pwForm.confirm" type="password" class="form-input" placeholder="再次输入" />
        </div>
        <button class="primary-btn" :disabled="saving" @click="handleChangePassword">{{ saving ? '更新中' : '更新密码' }}</button>

        <!-- 账号注销 -->
        <div class="delete-section">
          <div class="delete-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>注销账号后，所有数据将被永久删除且无法恢复</span>
          </div>
          <button class="delete-btn" @click="showDeleteConfirm = true">注销账号</button>
        </div>

        <!-- 注销确认弹窗 -->
        <Teleport to="body">
          <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
            <div class="modal-box">
              <div class="modal-icon">⚠️</div>
              <h3 class="modal-title">确认注销账号？</h3>
              <p class="modal-desc">此操作将永久删除您的账号及所有关联数据，包括宠物档案、评价记录、健康数据等，且<strong>无法恢复</strong>。</p>
              <div class="modal-input-group">
                <label class="modal-label">请输入 <strong>注销</strong> 以确认</label>
                <input v-model="deleteConfirmText" class="form-input" placeholder="输入「注销」" />
              </div>
              <div class="modal-actions">
                <button class="modal-cancel" @click="showDeleteConfirm = false; deleteConfirmText = ''">取消</button>
                <button class="modal-confirm" :disabled="deleteConfirmText !== '注销' || deleting" @click="handleDeleteAccount">
                  {{ deleting ? '注销中…' : '确认注销' }}
                </button>
              </div>
            </div>
          </div>
        </Teleport>
      </template>

      <!-- 宠物档案：列表 + 添加 -->
      <template v-else-if="key === 'pets'">
        <div v-for="p in pets" :key="p.id" class="pet-row">
          <div class="pet-row-main" @click="$router.push('/pets/' + p.id)">
            <div class="pet-emoji">{{ SPECIES_EMOJI[p.species] || '🐾' }}</div>
            <div class="pet-info">
              <div class="pet-name">{{ p.name }}</div>
              <div class="pet-meta">{{ p.breed || p.species }} · {{ p.age_years || 0 }}岁{{ p.age_months || 0 }}月 · {{ p.weight_kg ? Number(p.weight_kg).toFixed(1) : '--' }}kg</div>
            </div>
          </div>
          <button class="pet-del-btn" @click.stop="handleDeletePet(p)">删除</button>
        </div>
        <div v-if="!pets.length" class="empty-hint">还没有宠物档案</div>
        <button class="primary-btn" @click="$router.push('/pet/create')">+ 添加宠物</button>
      </template>

      <!-- 关于我们 -->
      <template v-else-if="key === 'about'">
        <div class="form-group center">
          <div class="app-logo">🐾</div>
          <div class="app-name">毛球镇 Nuzzly</div>
          <div class="app-version">版本 1.0.0</div>
        </div>
        <div class="settings-group">
          <div class="cell"><span>用户协议</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
          <div class="cell"><span>隐私政策</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
          <div class="cell"><span>开源许可</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
        </div>
      </template>

      <!-- 帮助与反馈 -->
      <template v-else-if="key === 'feedback'">
        <FormField label="反馈类型" required>
          <ChipGroup v-model="feedbackForm.type" :options="feedbackTypeOptions" />
        </FormField>
        <div class="form-group">
          <label class="form-label">详细描述</label>
          <textarea v-model="feedbackForm.content" class="form-textarea" rows="4" placeholder="请描述您遇到的问题或建议…"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">联系方式（可选）</label>
          <input v-model="feedbackForm.contact" type="text" class="form-input" placeholder="邮箱或手机号" />
        </div>
        <button class="primary-btn" :disabled="saving" @click="handleFeedback">{{ saving ? '提交中' : '提交反馈' }}</button>
      </template>

      <!-- 通知设置 -->
      <template v-else-if="key === 'notification'">
        <div class="settings-group">
          <div class="cell toggle"><span>推送通知</span><input type="checkbox" v-model="notif.push" class="toggle-switch"></div>
          <div class="cell toggle"><span>饮食提醒</span><input type="checkbox" v-model="notif.diet" class="toggle-switch"></div>
          <div class="cell toggle"><span>疫苗提醒</span><input type="checkbox" v-model="notif.vaccine" class="toggle-switch"></div>
          <div class="cell toggle"><span>社区互动</span><input type="checkbox" v-model="notif.social" class="toggle-switch"></div>
        </div>
        <button class="primary-btn" @click="saveLocal('通知设置已保存')">保存</button>
      </template>

      <!-- 会员 -->
      <template v-else-if="key === 'membership'">
        <div class="membership-card">
          <div class="membership-badge">🌟</div>
          <div class="membership-title">基础会员</div>
          <div class="membership-desc">享受所有核心功能</div>
        </div>
        <div class="settings-group">
          <div class="cell"><span>专属推荐</span><span class="cell-value">已解锁</span></div>
          <div class="cell"><span>AI 问答</span><span class="cell-value">已解锁</span></div>
          <div class="cell"><span>长期追踪</span><span class="cell-value">已解锁</span></div>
          <div class="cell"><span>社区互动</span><span class="cell-value">已解锁</span></div>
        </div>
        <p class="hint-text">更多高级功能即将推出，敬请期待</p>
      </template>

      <!-- 语言 -->
      <template v-else-if="key === 'language'">
        <div class="settings-group">
          <div class="cell toggle" @click="lang = 'zh-CN'">
            <span>简体中文</span>
            <span v-if="lang === 'zh-CN'" class="check">✓</span>
          </div>
          <div class="cell toggle" @click="lang = 'en'">
            <span>English</span>
            <span v-if="lang === 'en'" class="check">✓</span>
          </div>
          <div class="cell toggle" @click="lang = 'ja'">
            <span>日本語</span>
            <span v-if="lang === 'ja'" class="check">✓</span>
          </div>
        </div>
        <p class="hint-text">语言切换将在下次启动时生效</p>
      </template>

      <!-- 文字大小 -->
      <template v-else-if="key === 'fontsize'">
        <div class="fontsize-preview" :style="{ fontSize: fontSize + 'px' }">
          <p>这是预览文字效果</p>
          <p class="small">较小的辅助文字</p>
        </div>
        <div class="fontsize-control">
          <span class="fontsize-label">A</span>
          <input type="range" v-model.number="fontSize" min="12" max="20" step="1" class="fontsize-slider" />
          <span class="fontsize-label big">A</span>
        </div>
        <div class="fontsize-value">{{ fontSize }}px</div>
        <button class="primary-btn" @click="saveFontSize">保存</button>
      </template>

      <!-- 通用 -->
      <template v-else-if="key === 'general'">
        <div class="settings-group">
          <div class="cell toggle">
            <span>深色模式</span>
            <input type="checkbox" v-model="general.darkMode" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>自动播放视频</span>
            <input type="checkbox" v-model="general.autoPlay" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>图片高质量加载</span>
            <input type="checkbox" v-model="general.highQuality" class="toggle-switch">
          </div>
        </div>
        <button class="primary-btn" @click="saveGeneral">保存</button>
        <button class="danger-btn" @click="clearCache">清除缓存</button>
      </template>

      <!-- 隐私 -->
      <template v-else-if="key === 'privacy'">
        <div class="settings-group">
          <div class="cell toggle">
            <span>公开我的主页</span>
            <input type="checkbox" v-model="privacy.publicProfile" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>显示评价记录</span>
            <input type="checkbox" v-model="privacy.showReviews" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>允许推荐算法</span>
            <input type="checkbox" v-model="privacy.allowRecommend" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>分享使用数据</span>
            <input type="checkbox" v-model="privacy.shareData" class="toggle-switch">
          </div>
        </div>
        <button class="primary-btn" @click="savePrivacy">保存</button>
      </template>

      <!-- 我的内容 -->
      <template v-else-if="key === 'content'">
        <div class="settings-group">
          <div class="cell" @click="$router.push('/followups')">
            <span>我的评价</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="cell" @click="$router.push('/followups')">
            <span>长期追踪</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="cell" @click="$router.push('/products')">
            <span>收藏的产品</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </template>

      <!-- 互动设置 -->
      <template v-else-if="key === 'interaction'">
        <div class="settings-group">
          <div class="cell toggle">
            <span>允许评论</span>
            <input type="checkbox" v-model="interaction.allowComment" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>允许关注</span>
            <input type="checkbox" v-model="interaction.allowFollow" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>点赞通知</span>
            <input type="checkbox" v-model="interaction.likeNotify" class="toggle-switch">
          </div>
          <div class="cell toggle">
            <span>评论通知</span>
            <input type="checkbox" v-model="interaction.commentNotify" class="toggle-switch">
          </div>
        </div>
        <button class="primary-btn" @click="saveInteraction">保存</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useAuth } from '../composables/useAuth'
import { usePets } from '../composables/usePets'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader.vue'
import FormField from '../components/FormField.vue'
import ChipGroup from '../components/ChipGroup.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { pets, fetchPets } = usePets()
const saving = ref(false)

// 账号注销
const showDeleteConfirm = ref(false)
const deleteConfirmText = ref('')
const deleting = ref(false)

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }
const FEEDBACK_TYPES = ['功能建议', '问题反馈', '体验问题', '其他']
const feedbackTypeOptions = computed(() => FEEDBACK_TYPES.map(t => ({ value: t, label: t })))

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

const key = computed(() => route.params.key)
const TITLE_MAP = {
  account: '账号与安全', pets: '宠物档案', membership: '会员',
  language: '语言', fontsize: '文字大小', notification: '通知',
  general: '通用', privacy: '隐私', content: '我的内容',
  interaction: '互动设置', about: '关于我们', feedback: '帮助与反馈'
}
const title = computed(() => TITLE_MAP[key.value] || '设置')
const userEmail = computed(() => user.value?.email || '')

const pwForm = reactive({ password: '', confirm: '' })
const feedbackForm = reactive({ type: '功能建议', content: '', contact: '' })
const notif = reactive({ push: true, diet: true, vaccine: true, social: false })

// 新增设置状态
const lang = ref('zh-CN')
const fontSize = ref(14)
const general = reactive({ darkMode: false, autoPlay: true, highQuality: true })
const privacy = reactive({ publicProfile: true, showReviews: true, allowRecommend: true, shareData: false })
const interaction = reactive({ allowComment: true, allowFollow: true, likeNotify: true, commentNotify: true })

onMounted(() => {
  const k = key.value
  if (k === 'pets') fetchPets()
  if (k === 'notification') Object.assign(notif, loadJson('nuzzly_notif', {}))
  if (k === 'language') lang.value = localStorage.getItem('nuzzly_lang') || 'zh-CN'
  if (k === 'fontsize') fontSize.value = Number(localStorage.getItem('nuzzly_fontsize')) || 14
  if (k === 'general') Object.assign(general, loadJson('nuzzly_general', {}))
  if (k === 'privacy') Object.assign(privacy, loadJson('nuzzly_privacy', {}))
  if (k === 'interaction') Object.assign(interaction, loadJson('nuzzly_interaction', {}))
})

async function handleChangePassword() {
  if (saving.value) return
  if (!pwForm.password || pwForm.password.length < 6) { Toast({ theme: 'warning', message: '密码至少 6 位' }); return }
  if (pwForm.password !== pwForm.confirm) { Toast({ theme: 'warning', message: '两次密码不一致' }); return }
  saving.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: pwForm.password })
    if (error) throw new Error(error.message)
    Toast({ theme: 'success', message: '密码已更新' })
    pwForm.password = ''; pwForm.confirm = ''
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '更新失败' })
  } finally {
    saving.value = false
  }
}

async function handleDeleteAccount() {
  if (deleting.value || deleteConfirmText.value !== '注销') return
  deleting.value = true
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('未登录')

    // 软删除 profile
    await supabase.from('profiles').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', currentUser.id)

    // 注销登录
    await supabase.auth.signOut()
    Toast({ theme: 'success', message: '账号已注销' })
    showDeleteConfirm.value = false
    deleteConfirmText.value = ''
    router.replace('/login')
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '注销失败，请联系客服' })
  } finally {
    deleting.value = false
  }
}

async function handleDeletePet(pet) {
  if (!confirm(`确定要删除「${pet.name}」的档案吗？此操作不可恢复。`)) return
  try {
    await supabase.from('pets').update({ is_active: false }).eq('id', pet.id)
    Toast({ theme: 'success', message: '已删除' })
    fetchPets()
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '删除失败' })
  }
}

async function handleFeedback() {
  if (saving.value) return
  if (!feedbackForm.content.trim()) { Toast({ theme: 'warning', message: '请填写描述' }); return }
  saving.value = true
  // 反馈暂存本地（无后端反馈表）；可扩展为调用 /api/feedback
  try {
    const list = JSON.parse(localStorage.getItem('nuzzly_feedback') || '[]')
    list.push({ ...feedbackForm, created_at: new Date().toISOString() })
    localStorage.setItem('nuzzly_feedback', JSON.stringify(list))
    Toast({ theme: 'success', message: '反馈已提交，感谢支持' })
    feedbackForm.content = ''; feedbackForm.contact = ''
    router.back()
  } catch (e) {
    Toast({ theme: 'error', message: '提交失败' })
  } finally {
    saving.value = false
  }
}

function saveLocal(msg) {
  saveJson('nuzzly_notif', notif)
  Toast({ theme: 'success', message: msg })
}

function saveFontSize() {
  localStorage.setItem('nuzzly_fontsize', String(fontSize.value))
  Toast({ theme: 'success', message: '文字大小已保存' })
}

function saveGeneral() {
  saveJson('nuzzly_general', general)
  Toast({ theme: 'success', message: '通用设置已保存' })
}

function savePrivacy() {
  saveJson('nuzzly_privacy', privacy)
  Toast({ theme: 'success', message: '隐私设置已保存' })
}

function saveInteraction() {
  saveJson('nuzzly_interaction', interaction)
  Toast({ theme: 'success', message: '互动设置已保存' })
}

function clearCache() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('nuzzly_')) keys.push(k)
  }
  keys.forEach(k => localStorage.removeItem(k))
  Toast({ theme: 'success', message: '缓存已清除' })
}
</script>

<style scoped>
.edit-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg);padding-top:var(--safe-top)}
.edit-body{padding:0 16px 40px}
.form-group{background:var(--card);border-radius:12px;padding:16px;margin-bottom:12px}
.form-group.center{display:flex;flex-direction:column;align-items:center;gap:6px;padding:24px 16px}
.form-label{font-size:13px;color:var(--muted);display:block;margin-bottom:8px;letter-spacing:.01em}
.form-input{width:100%;height:44px;border:1px solid var(--border);border-radius:10px;padding:0 14px;font-size:15px;font-family:var(--font-body);color:var(--fg);background:var(--bg);outline:none;transition:border-color .2s;box-sizing:border-box}
.form-input:focus{border-color:var(--brown)}
.form-textarea{width:100%;border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:15px;font-family:var(--font-body);color:var(--fg);background:var(--bg);outline:none;resize:none;transition:border-color .2s;box-sizing:border-box}
.form-textarea:focus{border-color:var(--brown)}
.readonly-value{font-size:15px;color:var(--fg);padding:10px 0}
.primary-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--brown);color:#fff;font-size:16px;font-weight:500;border:none;cursor:pointer;transition:transform .15s;margin-top:8px}
.primary-btn:active{transform:scale(.98)}
.primary-btn:disabled{opacity:.5}
.settings-group{background:var(--card);border-radius:12px;margin-bottom:12px;overflow:hidden}
.cell{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer}
.cell:last-child{border-bottom:none}
.cell span{font-size:16px;color:var(--fg)}
.cell svg{width:16px;height:16px;color:var(--muted)}
.cell.toggle{cursor:default}
.toggle-switch{accent-color:var(--brown);width:20px;height:20px}
.chip-group{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:8px 16px;border-radius:var(--radius-pill);background:var(--bg);border:1px solid var(--border);font-size:14px;color:var(--fg);cursor:pointer;transition:all .2s}
.chip.active{background:var(--brown);color:#fff;border-color:var(--brown)}
.pet-row{display:flex;align-items:center;gap:8px;background:var(--card);border-radius:12px;padding:14px 16px;margin-bottom:12px}
.pet-row-main{display:flex;align-items:center;gap:12px;flex:1;min-width:0;cursor:pointer}
.pet-emoji{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.pet-info{flex:1;min-width:0}
.pet-name{font-size:16px;font-weight:600;color:var(--fg)}
.pet-meta{font-size:12px;color:var(--muted);margin-top:2px}
.pet-del-btn{flex-shrink:0;height:30px;padding:0 10px;border-radius:8px;background:transparent;color:#FF3B30;font-size:12px;font-weight:500;border:1px solid rgba(255,59,48,.2);cursor:pointer;transition:all .15s}
.pet-del-btn:active{background:rgba(255,59,48,.08);transform:scale(.95)}
.empty-hint{text-align:center;color:var(--muted);font-size:14px;padding:24px 0}
.app-logo{font-size:48px}
.app-name{font-size:18px;font-weight:600;color:var(--fg);margin-top:4px}
.app-version{font-size:13px;color:var(--muted)}
.placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;gap:8px}
.placeholder-icon{font-size:56px}
.placeholder-text{font-size:16px;color:var(--fg);font-weight:500}
.placeholder-sub{font-size:13px;color:var(--muted)}
.check{color:var(--brown);font-weight:700;font-size:16px}
.cell-value{font-size:13px;color:var(--green)}
.hint-text{text-align:center;font-size:12px;color:var(--muted);padding:16px 0}
.membership-card{background:linear-gradient(135deg,var(--brown),#D7B593);border-radius:20px;padding:28px 20px;text-align:center;margin-bottom:16px}
.membership-badge{font-size:40px;margin-bottom:8px}
.membership-title{font-size:20px;font-weight:700;color:#fff}
.membership-desc{font-size:13px;color:rgba(255,255,255,.7);margin-top:4px}
.fontsize-preview{background:var(--card);border-radius:16px;padding:24px 20px;margin-bottom:16px;text-align:center}
.fontsize-preview p{color:var(--fg);margin-bottom:8px}
.fontsize-preview .small{color:var(--muted);font-size:12px}
.fontsize-control{display:flex;align-items:center;gap:12px;padding:0 8px;margin-bottom:8px}
.fontsize-label{font-size:14px;color:var(--muted);font-weight:500}
.fontsize-label.big{font-size:20px}
.fontsize-slider{flex:1;accent-color:var(--brown);height:4px}
.fontsize-value{text-align:center;font-size:13px;color:var(--muted);margin-bottom:16px}
.danger-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:transparent;color:#FF3B30;font-size:16px;font-weight:500;border:1px solid rgba(255,59,48,.2);cursor:pointer;margin-top:12px}
.danger-btn:active{background:rgba(255,59,48,.05)}

/* 账号注销 */
.delete-section{margin-top:32px;padding-top:20px;border-top:1px solid var(--border)}
.delete-warning{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;background:rgba(255,59,48,.05);border-radius:10px;margin-bottom:12px}
.delete-warning svg{width:18px;height:18px;color:#FF3B30;flex-shrink:0;margin-top:1px}
.delete-warning span{font-size:13px;color:#FF3B30;line-height:1.5}
.delete-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:transparent;color:#FF3B30;font-size:16px;font-weight:500;border:1px solid rgba(255,59,48,.2);cursor:pointer;transition:all .15s}
.delete-btn:active{background:rgba(255,59,48,.05);transform:scale(.98)}

/* 弹窗 */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:24px}
.modal-box{width:100%;max-width:320px;background:var(--card);border-radius:20px;padding:28px 24px 20px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.modal-icon{font-size:40px;margin-bottom:8px}
.modal-title{font-size:18px;font-weight:700;color:var(--fg);margin:0 0 8px}
.modal-desc{font-size:13px;color:var(--muted);line-height:1.6;margin:0 0 16px}
.modal-desc strong{color:#FF3B30}
.modal-input-group{margin-bottom:16px;text-align:left}
.modal-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:block}
.modal-label strong{color:var(--fg)}
.modal-actions{display:flex;gap:10px}
.modal-cancel{flex:1;height:44px;border-radius:var(--radius-btn);background:var(--bg);border:1px solid var(--border);font-size:15px;color:var(--fg);font-weight:500;cursor:pointer}
.modal-cancel:active{background:rgba(0,0,0,.04)}
.modal-confirm{flex:1;height:44px;border-radius:var(--radius-btn);background:#FF3B30;border:none;font-size:15px;color:#fff;font-weight:500;cursor:pointer;transition:opacity .15s}
.modal-confirm:active{opacity:.85}
.modal-confirm:disabled{opacity:.4;cursor:default}
</style>
