<template>
  <div class="app-shell">
    <!-- 顶栏 -->
    <header class="header anim-fade-up">
      <div class="header-row">
        <img class="brand-logo" src="/nuzzly-zuhe.png" alt="Nuzzly 毛球镇" />
        <div class="header-actions">
          <button class="action-circle" aria-label="通知" @click="$router.push('/notifications')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.134 11C18.715 16.375 21 18 21 18H3s3-2.133 3-9.6c0-1.697.632-3.325 1.757-4.525S10.41 2 12 2q.507 0 1 .09M19 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m-5.27 13a2 2 0 0 1-3.46 0"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 筛选栏 -->
    <div class="filter-bar anim-fade-up anim-delay-1">
      <div class="toggle-group">
        <div class="toggle-option" :class="{ active: petType === '' }" @click="petType = ''; refresh()">全部</div>
        <div class="toggle-option" :class="{ active: petType === 'cat' }" @click="petType = 'cat'; refresh()">猫猫</div>
        <div class="toggle-option" :class="{ active: petType === 'dog' }" @click="petType = 'dog'; refresh()">狗狗</div>
      </div>
      <div class="search-breed-wrapper" :class="{ active: showBreed || selectedBreed !== '全部品种' }">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="breedSearch"
          class="breed-search-input"
          :placeholder="selectedBreed === '全部品种' ? '搜索品种...' : selectedBreed"
          @focus="showBreed = true"
          @input="showBreed = true"
        />
        <button v-if="selectedBreed !== '全部品种'" class="clear-btn" @click.stop="selectedBreed = '全部品种'; breedSearch = ''; refresh()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="breed-dropdown" :class="{ show: showBreed }">
          <div v-if="filteredBreeds.length === 0" class="dropdown-empty">没有找到相关品种</div>
          <div v-for="b in filteredBreeds" :key="b" class="dropdown-item" :class="{ selected: b === selectedBreed }" @click="selectedBreed = b; showBreed = false; breedSearch = ''; refresh()">{{ b }}</div>
        </div>
      </div>
    </div>

    <!-- 帖子列表 -->
    <div class="feed" ref="feedRef">
      <!-- 加载状态 -->
      <div v-if="loading && posts.length === 0" class="empty-state">
        <div class="empty-icon">🐾</div>
        <div class="empty-text">加载中...</div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && posts.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">还没有帖子，快来发第一条吧！</div>
      </div>

      <!-- 帖子卡片 -->
      <template v-else>
        <div v-for="post in posts" :key="post.id" class="post-card anim-fade-up">
          <div class="post-user">
            <img v-if="post.profiles?.avatar_url" class="post-avatar" :src="post.profiles.avatar_url" alt="" />
            <div v-else class="post-avatar post-avatar-fallback">{{ (post.profiles?.display_name || '?')[0] }}</div>
            <div class="post-username">{{ post.profiles?.display_name || '匿名用户' }}</div>
          </div>
          <div class="post-content">
            <p class="post-text">{{ post.content }}</p>
            <div v-if="post.images && post.images.length > 0" class="post-images" :class="imageLayoutClass(post.images.length)">
              <img v-for="(img, j) in post.images" :key="j" class="post-img" :src="img" alt="" loading="lazy" @click="previewImage(img)" />
            </div>
            <div class="post-meta">
              <div class="post-action" :class="{ liked: myLikedPostIds.has(post.id) }" @click="handleToggleLike(post)">
                <svg viewBox="0 0 24 24" :fill="myLikedPostIds.has(post.id) ? 'var(--brown)' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span>{{ post.likes_count || 0 }}</span>
              </div>
              <div class="post-action" @click="handleReport(post)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>举报</span>
              </div>
              <div v-if="post.profile_id === currentUserId" class="post-action" @click="handleDelete(post)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </div>
              <div class="post-time">{{ formatTime(post.created_at) }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 无限滚动哨兵 -->
      <div ref="sentinelRef" class="scroll-sentinel"></div>

      <!-- 加载更多 -->
      <div v-if="loading && posts.length > 0" class="loading-more">
        <div class="loading-spinner"></div>
        <span>加载更多...</span>
      </div>

      <!-- 没有更多 -->
      <div v-if="!hasMore && posts.length > 0" class="no-more">没有更多了</div>
    </div>

    <div class="bottom-spacer"></div>

    <!-- 发帖 FAB -->
    <button class="fab" @click="showCreatePost = true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- 发帖弹窗 -->
    <Teleport to="body">
      <div v-if="showCreatePost" class="modal-overlay" @click.self="showCreatePost = false">
        <div class="modal-content">
          <div class="modal-header">
            <button class="modal-close" @click="showCreatePost = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">发布动态</span>
            <button class="modal-submit" :disabled="!newContent.trim() || submitting" @click="handleCreatePost">发布</button>
          </div>
          <div class="modal-body">
            <!-- 实名认证提示 -->
            <div v-if="!phoneVerified" class="verify-banner" @click="showPhoneVerify = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>需要完成手机号认证后才能发帖，点击认证</span>
            </div>

            <textarea
              v-model="newContent"
              class="post-input"
              placeholder="分享你和毛孩子的故事..."
              maxlength="2000"
              rows="5"
            ></textarea>
            <div class="char-count">{{ newContent.length }}/2000</div>

            <!-- 图片预览 -->
            <div v-if="previewUrls.length > 0" class="image-preview-grid">
              <div v-for="(url, i) in previewUrls" :key="i" class="preview-item">
                <img :src="url" alt="" />
                <button class="preview-remove" @click="removeImage(i)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div v-if="previewUrls.length < 9" class="preview-add" @click="triggerFileInput">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
            <div v-else class="add-image-row" @click="triggerFileInput">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>添加图片</span>
            </div>
            <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none" @change="handleFileSelect" />

            <!-- 宠物档案选择 -->
            <div v-if="userPets.length > 0" class="pet-select-section">
              <div class="pet-select-label">关联宠物</div>
              <div class="pet-select-list">
                <div
                  v-for="pet in userPets"
                  :key="pet.id"
                  class="pet-select-item"
                  :class="{ active: selectedPetId === pet.id }"
                  @click="selectedPetId = selectedPetId === pet.id ? '' : pet.id"
                >
                  <img v-if="pet.photo_url" class="pet-select-avatar" :src="pet.photo_url" alt="" />
                  <div v-else class="pet-select-avatar pet-select-avatar-fallback">{{ pet.name[0] }}</div>
                  <div class="pet-select-info">
                    <div class="pet-select-name">{{ pet.name }}</div>
                    <div class="pet-select-meta">{{ pet.breed || (pet.species === 'cat' ? '猫猫' : pet.species === 'dog' ? '狗狗' : '其他') }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 用户协议确认 -->
            <div class="agreement-row">
              <label class="agreement-label">
                <input type="checkbox" v-model="agreedToTerms" />
                <span>我已阅读并同意<a class="link" href="javascript:void(0)" @click.stop="showAgreement = true">《社区规范》</a>和<a class="link" href="javascript:void(0)" @click.stop="showPrivacy = true">《隐私政策》</a></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 举报弹窗 -->
    <Teleport to="body">
      <div v-if="showReportModal" class="modal-overlay" @click.self="showReportModal = false">
        <div class="modal-content modal-sm">
          <div class="modal-header">
            <button class="modal-close" @click="showReportModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">举报</span>
            <button class="modal-submit" :disabled="!reportReason.trim()" @click="submitReport">提交</button>
          </div>
          <div class="modal-body">
            <div class="report-categories">
              <button v-for="cat in reportCategories" :key="cat.value" class="report-cat-btn" :class="{ active: reportCategory === cat.value }" @click="reportCategory = cat.value">{{ cat.label }}</button>
            </div>
            <textarea v-model="reportReason" class="post-input" placeholder="请描述举报原因..." rows="3" maxlength="500"></textarea>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 手机号认证弹窗 -->
    <Teleport to="body">
      <div v-if="showPhoneVerify" class="modal-overlay" @click.self="showPhoneVerify = false">
        <div class="modal-content modal-sm">
          <div class="modal-header">
            <button class="modal-close" @click="showPhoneVerify = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">手机号认证</span>
            <button class="modal-submit" :disabled="!phoneNumber.trim() || !verifyCode.trim()" @click="submitPhoneVerify">验证</button>
          </div>
          <div class="modal-body">
            <p class="verify-hint">根据《互联网跟帖评论服务管理规定》，发帖需完成手机号实名认证</p>
            <input v-model="phoneNumber" class="verify-input" type="tel" placeholder="请输入手机号" maxlength="11" />
            <div class="verify-code-row">
              <input v-model="verifyCode" class="verify-input" type="text" placeholder="验证码" maxlength="6" />
              <button class="verify-code-btn" :disabled="countdown > 0" @click="sendVerifyCode">
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 社区规范弹窗 -->
    <Teleport to="body">
      <div v-if="showAgreement" class="modal-overlay" @click.self="showAgreement = false">
        <div class="modal-content">
          <div class="modal-header">
            <button class="modal-close" @click="showAgreement = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">社区规范</span>
            <div style="width:48px"></div>
          </div>
          <div class="modal-body agreement-body">
            <h3>一、社区准则</h3>
            <p>1. 尊重他人，友善交流，不发布攻击、侮辱、歧视性内容。</p>
            <p>2. 不发布虚假、误导性信息，包括但不限于虚假产品推荐、不实饲养经验。</p>
            <p>3. 不发布广告、推广、引流等商业内容。</p>
            <p>4. 不发布涉及政治、色情、暴力的内容。</p>
            <p>5. 不发布涉及个人隐私的信息（如他人手机号、住址等）。</p>
            <h3>二、违规处理</h3>
            <p>违反社区规范的内容将被删除，严重违规者将被限制发帖权限。</p>
            <h3>三、未成年人保护</h3>
            <p>14周岁以下用户发帖需监护人同意，夜间（22:00-6:00）不可发帖。</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 隐私政策弹窗 -->
    <Teleport to="body">
      <div v-if="showPrivacy" class="modal-overlay" @click.self="showPrivacy = false">
        <div class="modal-content">
          <div class="modal-header">
            <button class="modal-close" @click="showPrivacy = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span class="modal-title">隐私政策</span>
            <div style="width:48px"></div>
          </div>
          <div class="modal-body agreement-body">
            <h3>信息收集</h3>
            <p>我们收集您的手机号码用于实名认证，收集您发布的文字和图片内容用于社区展示。</p>
            <h3>信息使用</h3>
            <p>手机号码仅用于实名认证，不会向其他用户展示。发布的内容将根据《网络安全法》要求留存6个月。</p>
            <h3>信息保护</h3>
            <p>我们采用行业标准的加密技术保护您的个人信息，不会向第三方出售您的个人数据。</p>
            <h3>您的权利</h3>
            <p>您有权查看、修改、删除您的个人信息。账号注销后，您的帖子将匿名化处理（显示为"已注销用户"）。</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 图片预览 -->
    <Teleport to="body">
      <div v-if="previewingImage" class="image-preview-overlay" @click="previewingImage = null">
        <img :src="previewingImage" alt="" class="image-preview-full" />
      </div>
    </Teleport>
  </div>
  <TabBar active-tab="community" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import TabBar from '../components/TabBar.vue'
import { useCommunity } from '../composables/useCommunity'
import { toastError } from '../lib/error-handling'
import { Toast } from 'tdesign-mobile-vue'
import { supabase } from '../lib/supabase'

const {
  posts, loading, hasMore, myLikedPostIds,
  fetchPosts, createPost, toggleLike, reportPost, deletePost,
  checkVerification
} = useCommunity()

// 筛选状态
const petType = ref('')
const selectedBreed = ref('全部品种')
const showBreed = ref(false)
const breedSearch = ref('')
const breedCache = ref([]) // 从数据库加载的品种缓存

// 过滤后的品种列表
const filteredBreeds = computed(() => {
  const keyword = breedSearch.value.trim().toLowerCase()
  const list = breedOptions.value
  if (!keyword) return list
  return list.filter(b => b.toLowerCase().includes(keyword))
})

// 从数据库加载品种
async function loadBreeds(species) {
  try {
    let query = supabase.from('breed_aliases').select('canonical').limit(500)
    if (species) query = query.eq('species', species)
    const { data } = await query
    const unique = [...new Set((data || []).map(r => r.canonical))]
    breedCache.value = ['全部品种', ...unique]
  } catch {
    breedCache.value = breedOptionsStatic.value
  }
}

// 发帖状态
const showCreatePost = ref(false)
const newContent = ref('')
const selectedPetId = ref('') // 选中的宠物档案ID
const userPets = ref([]) // 用户的宠物档案列表
const imageFiles = ref([])
const previewUrls = ref([])
const submitting = ref(false)
const agreedToTerms = ref(false)
const phoneVerified = ref(false)
const fileInputRef = ref(null)

// 举报状态
const showReportModal = ref(false)
const reportingPost = ref(null)
const reportReason = ref('')
const reportCategory = ref('other')

// 手机号认证
const showPhoneVerify = ref(false)
const phoneNumber = ref('')
const verifyCode = ref('')
const countdown = ref(0)

// 协议弹窗
const showAgreement = ref(false)
const showPrivacy = ref(false)

// 图片预览
const previewingImage = ref(null)

// 无限滚动
const sentinelRef = ref(null)
const feedRef = ref(null)
let observer = null

// 当前用户
const currentUserId = ref(null)

// 静态品种列表作为 fallback
const breedOptionsStatic = computed(() => {
  const cat = ['全部品种', '英国短毛猫', '布偶猫', '曼基康矮脚猫', '波斯猫', '暹罗猫', '美短', '橘猫', '狸花猫']
  const dog = ['全部品种', '柯基', '金毛', '泰迪', '哈士奇', '柴犬', '拉布拉多', '边牧', '萨摩耶']
  const all = ['全部品种', ...cat.slice(1), ...dog.slice(1)]
  if (petType.value === 'cat') return cat
  if (petType.value === 'dog') return dog
  return all
})

// 优先使用数据库数据，fallback 到静态列表
const breedOptions = computed(() => {
  if (breedCache.value.length > 0) return breedCache.value
  return breedOptionsStatic.value
})

const reportCategories = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'violence', label: '暴力恐怖' },
  { value: 'pornography', label: '色情低俗' },
  { value: 'political', label: '政治敏感' },
  { value: 'fraud', label: '诈骗' },
  { value: 'privacy', label: '隐私泄露' },
  { value: 'other', label: '其他' }
]

// 刷新列表
async function refresh() {
  await fetchPosts({ petType: petType.value || undefined, breed: selectedBreed.value })
  setupObserver()
}

// 图片布局
function imageLayoutClass(count) {
  if (count === 1) return 'single'
  if (count === 2) return 'double'
  return ''
}

// 时间格式化
function formatTime(dateStr) {
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 点赞
function handleToggleLike(post) {
  toggleLike(post.id, myLikedPostIds.value.has(post.id))
}

// 举报
function handleReport(post) {
  reportingPost.value = post
  reportReason.value = ''
  reportCategory.value = 'other'
  showReportModal.value = true
}

async function submitReport() {
  if (!reportingPost.value) return
  const { error } = await reportPost(reportingPost.value.id, reportReason.value, reportCategory.value)
  if (error) {
    toastError(error, '举报失败')
  } else {
    Toast({ theme: 'success', message: '举报已提交，我们将尽快处理' })
    showReportModal.value = false
  }
}

// 删除帖子
async function handleDelete(post) {
  if (!confirm('确定删除这条动态吗？')) return
  const { error } = await deletePost(post.id)
  if (error) toastError(error, '删除失败')
  else Toast({ theme: 'success', message: '已删除' })
}

// 发帖
async function handleCreatePost() {
  if (!agreedToTerms.value) {
    Toast({ theme: 'warning', message: '请先同意社区规范和隐私政策' })
    return
  }
  if (!phoneVerified.value) {
    showPhoneVerify.value = true
    return
  }

  // 根据选中的宠物档案获取 petType 和 breed
  let petType = undefined
  let breed = undefined
  if (selectedPetId.value) {
    const pet = userPets.value.find(p => p.id === selectedPetId.value)
    if (pet) {
      petType = pet.species
      breed = pet.breed || undefined
    }
  }

  submitting.value = true
  const { data, error } = await createPost({
    content: newContent.value,
    imageFiles: imageFiles.value,
    petType,
    breed
  })
  submitting.value = false

  if (error) {
    toastError(error, '发布失败')
    return
  }

  Toast({ theme: 'success', message: '发布成功' })
  showCreatePost.value = false
  newContent.value = ''
  selectedPetId.value = ''
  imageFiles.value = []
  previewUrls.value = []
  agreedToTerms.value = false
}

// 图片选择
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files || [])
  const remaining = 9 - imageFiles.value.length
  const toAdd = files.slice(0, remaining)

  for (const file of toAdd) {
    if (file.size > 5 * 1024 * 1024) {
      Toast({ theme: 'warning', message: '图片大小不能超过5MB' })
      continue
    }
    imageFiles.value.push(file)
    previewUrls.value.push(URL.createObjectURL(file))
  }
  // 重置 input 以便选择相同文件
  e.target.value = ''
}

function removeImage(index) {
  URL.revokeObjectURL(previewUrls.value[index])
  imageFiles.value.splice(index, 1)
  previewUrls.value.splice(index, 1)
}

// 图片预览
function previewImage(url) {
  previewingImage.value = url
}

// 手机号认证
async function sendVerifyCode() {
  if (!/^1\d{10}$/.test(phoneNumber.value)) {
    Toast({ theme: 'warning', message: '请输入正确的手机号' })
    return
  }
  const { error } = await supabase.auth.signInWithOtp({ phone: `+86${phoneNumber.value}` })
  if (error) {
    toastError(error, '验证码发送失败')
    return
  }
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
  Toast({ theme: 'success', message: '验证码已发送' })
}

async function submitPhoneVerify() {
  const { error } = await supabase.auth.verifyOtp({
    phone: `+86${phoneNumber.value}`,
    token: verifyCode.value,
    type: 'sms'
  })
  if (error) {
    toastError(error, '验证失败')
    return
  }

  // 更新 profiles 表
  const uid = (await supabase.auth.getSession()).data?.session?.user?.id
  if (uid) {
    await supabase
      .from('profiles')
      .update({ phone_verified_at: new Date().toISOString() })
      .eq('id', uid)
  }

  phoneVerified.value = true
  showPhoneVerify.value = false
  Toast({ theme: 'success', message: '认证成功' })
}

// 无限滚动 IntersectionObserver
function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinelRef.value) return

  observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && hasMore.value && !loading.value) {
      const lastPost = posts.value[posts.value.length - 1]
      if (lastPost) {
        await fetchPosts({
          petType: petType.value || undefined,
          breed: selectedBreed.value,
          cursor: lastPost.created_at
        })
      }
    }
  }, { rootMargin: '200px' })

  observer.observe(sentinelRef.value)
}

// 关闭下拉
function closeBreed(e) {
  if (showBreed.value && !e.target.closest('.search-breed-wrapper')) {
    showBreed.value = false
    if (selectedBreed.value === '全部品种') breedSearch.value = ''
  }
}

// 监听宠物类型变化，重新加载品种
watch(petType, (val) => {
  selectedBreed.value = '全部品种'
  loadBreeds(val || undefined)
})

// 获取用户宠物档案
async function loadUserPets(userId) {
  if (!userId) return
  try {
    const { data } = await supabase
      .from('pets')
      .select('id, name, species, breed, photo_url')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    userPets.value = data || []
  } catch {
    userPets.value = []
  }
}

onMounted(async () => {
  document.addEventListener('click', closeBreed)

  // 获取当前用户
  const { data: session } = await supabase.auth.getSession()
  currentUserId.value = session?.session?.user?.id

  // 检查实名认证
  const { verified } = await checkVerification()
  phoneVerified.value = verified

  // 加载品种数据
  await loadBreeds()

  // 加载用户宠物档案
  if (currentUserId.value) {
    await loadUserPets(currentUserId.value)
  }

  // 加载帖子
  await refresh()
  await nextTick()
  setupObserver()
})

onUnmounted(() => {
  document.removeEventListener('click', closeBreed)
  if (observer) observer.disconnect()
  previewUrls.value.forEach(url => URL.revokeObjectURL(url))
})
</script>

<style scoped>
.app-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(88px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;position:relative}
.header{position:relative;padding:4px 24px 0;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.brand-logo{height:32px;width:auto;display:block;flex-shrink:0;object-fit:contain}
.header-actions{display:flex;gap:10px}
.action-circle{width:41.31px;height:41.31px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s}
.action-circle:active{transform:scale(.92)}
.action-circle svg{width:18px;height:18px;color:var(--fg)}

/* 筛选栏 */
.filter-bar{display:flex;align-items:center;gap:10px;padding:12px 24px 0;position:relative;z-index:10}
.toggle-group{display:flex;background:var(--card);border-radius:var(--radius-pill);box-shadow:var(--shadow-card);border:1px solid var(--border);overflow:hidden;height:40px}
.toggle-option{padding:0 18px;font-size:14px;font-weight:500;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .25s;letter-spacing:.01em}
.toggle-option.active{color:#fff;background:var(--brown)}

/* 品种搜索框 */
.search-breed-wrapper{position:relative;display:flex;align-items:center;height:40px;padding:0 14px;border-radius:var(--radius-pill);background:var(--card);box-shadow:var(--shadow-card);border:1px solid var(--border);gap:8px;transition:all .2s;flex:1;max-width:180px}
.search-breed-wrapper.active{border-color:var(--brown);box-shadow:var(--shadow-btn)}
.search-icon{width:16px;height:16px;color:var(--muted);flex-shrink:0}
.search-breed-wrapper.active .search-icon{color:var(--brown)}
.breed-search-input{border:none;background:transparent;outline:none;font-size:14px;font-weight:500;color:var(--fg);width:100%;min-width:0;font-family:var(--font-body);letter-spacing:.01em}
.breed-search-input::placeholder{color:var(--muted)}
.clear-btn{width:20px;height:20px;border:none;background:rgba(0,0,0,.06);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.clear-btn:active{background:rgba(0,0,0,.1)}
.clear-btn svg{width:12px;height:12px;color:var(--muted)}
.breed-dropdown{position:absolute;top:calc(100% + 8px);left:0;right:0;min-width:140px;background:var(--card);border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.12);border:1px solid var(--border);padding:8px;z-index:50;display:none;max-height:320px;overflow-y:auto}
.breed-dropdown.show{display:block}
.dropdown-empty{padding:16px;text-align:center;font-size:13px;color:var(--muted)}
.dropdown-item{padding:12px 16px;font-size:14px;color:var(--fg);border-radius:12px;cursor:pointer;transition:background .15s;letter-spacing:.01em}
.dropdown-item:active{background:rgba(0,0,0,.04)}
.dropdown-item.selected{color:var(--brown);font-weight:600}

/* 帖子列表 */
.feed{padding:20px 24px 0;display:flex;flex-direction:column;gap:16px;position:relative;z-index:1}
.post-card{background:var(--card);border-radius:var(--radius-card);box-shadow:var(--shadow-card);border:1px solid var(--border);padding:20px;display:flex;gap:16px;transition:transform .2s}
.post-card:active{transform:scale(.98)}
.post-user{display:flex;flex-direction:column;align-items:center;gap:8px;flex-shrink:0}
.post-avatar{width:48px;height:48px;border-radius:50%;overflow:hidden;object-fit:cover}
.post-avatar-fallback{background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:#fff}
.post-username{font-size:13px;font-weight:600;color:var(--fg);text-align:center;max-width:64px;line-height:1.2;letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.post-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}
.post-text{font-size:14px;line-height:1.6;color:var(--fg);display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.post-images{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border-radius:16px;overflow:hidden}
.post-images.single{grid-template-columns:1fr}
.post-images.double{grid-template-columns:1fr 1fr}
.post-img{width:100%;aspect-ratio:1;border-radius:12px;object-fit:cover;background:var(--border);cursor:pointer}
.post-images.single .post-img{aspect-ratio:16/9;border-radius:16px}
.post-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.post-action{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);cursor:pointer;transition:color .2s;letter-spacing:.01em}
.post-action:active{color:var(--brown)}
.post-action.liked{color:var(--brown)}
.post-action.liked svg{stroke:var(--brown)}
.post-action svg{width:16px;height:16px}
.post-time{font-size:11px;color:var(--muted);margin-left:auto}

/* 空状态 */
.empty-state{display:flex;flex-direction:column;align-items:center;padding:80px 20px;gap:12px}
.empty-icon{font-size:48px}
.empty-text{font-size:14px;color:var(--muted)}

/* 无限滚动 */
.scroll-sentinel{height:1px}
.loading-more{display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:var(--muted);font-size:13px}
.loading-spinner{width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--brown);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.no-more{text-align:center;padding:20px;font-size:12px;color:var(--muted)}

/* FAB */
.fab{position:fixed;right:clamp(16px,4vw,24px);bottom:calc(88px + var(--safe-bottom) + 16px);width:52px;height:52px;border-radius:50%;background:var(--brown);color:#fff;border:none;box-shadow:0 4px 20px rgba(139,94,70,.4);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:100;transition:transform .2s,box-shadow .2s}
.fab:active{transform:scale(.9)}
.fab svg{width:24px;height:24px}

/* 下拉菜单 */
/* Removed old dropdown styles */

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center}
.modal-content{width:100%;max-width:500px;background:var(--bg);border-radius:24px 24px 0 0;max-height:85vh;display:flex;flex-direction:column;animation:slideUp .3s ease}
.modal-sm .modal-content{max-height:60vh}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--sep);flex-shrink:0}
.modal-close{width:32px;height:32px;border:none;background:rgba(0,0,0,.05);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
.modal-close svg{width:16px;height:16px;color:var(--muted)}
.modal-title{font-size:16px;font-weight:600}
.modal-submit{padding:8px 16px;border:none;border-radius:var(--radius-pill);background:var(--brown);color:#fff;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .2s}
.modal-submit:disabled{opacity:.4;cursor:not-allowed}
.modal-body{padding:20px;overflow-y:auto;flex:1}

/* 发帖输入 */
.post-input{width:100%;border:none;background:transparent;font-size:14px;line-height:1.6;color:var(--fg);resize:none;outline:none;font-family:var(--font-body)}
.post-input::placeholder{color:var(--muted)}
.char-count{text-align:right;font-size:12px;color:var(--muted);margin-top:4px}

/* 实名认证提示 */
.verify-banner{display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(255,149,0,.1);border-radius:12px;margin-bottom:16px;cursor:pointer;font-size:13px;color:#FF9500}
.verify-banner svg{width:18px;height:18px;flex-shrink:0}

/* 图片预览网格 */
.image-preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.preview-item{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden}
.preview-item img{width:100%;height:100%;object-fit:cover}
.preview-remove{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.5);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer}
.preview-remove svg{width:12px;height:12px}
.preview-add{aspect-ratio:1;border-radius:12px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer}
.preview-add svg{width:24px;height:24px}

.add-image-row{display:flex;align-items:center;gap:8px;padding:12px 16px;border:1px dashed var(--border);border-radius:12px;margin-top:12px;cursor:pointer;color:var(--muted);font-size:13px}
.add-image-row svg{width:20px;height:20px}

/* 宠物档案选择 */
.pet-select-section{margin-top:16px}
.pet-select-label{font-size:13px;font-weight:500;color:var(--muted);margin-bottom:10px}
.pet-select-list{display:flex;flex-wrap:wrap;gap:10px}
.pet-select-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--radius-card);border:1px solid var(--border);background:var(--card);cursor:pointer;transition:all .2s;flex:1;min-width:140px}
.pet-select-item:active{transform:scale(.97)}
.pet-select-item.active{border-color:var(--brown);background:rgba(139,94,70,.06)}
.pet-select-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0}
.pet-select-avatar-fallback{background:linear-gradient(135deg,var(--beige),var(--brown));display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#fff}
.pet-select-info{display:flex;flex-direction:column;gap:2px;min-width:0}
.pet-select-name{font-size:14px;font-weight:500;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pet-select-meta{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* 协议 */
.agreement-row{margin-top:16px}
.agreement-label{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--muted);cursor:pointer}
.agreement-label input{margin-top:2px;accent-color:var(--brown)}
.link{color:var(--brown);text-decoration:underline}

/* 举报分类 */
.report-categories{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.report-cat-btn{padding:6px 14px;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--card);font-size:12px;color:var(--fg);cursor:pointer;transition:all .2s}
.report-cat-btn.active{background:var(--brown);color:#fff;border-color:transparent}

/* 手机号认证 */
.verify-hint{font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5}
.verify-input{width:100%;padding:12px 16px;border:1px solid var(--border);border-radius:12px;font-size:14px;background:var(--card);color:var(--fg);outline:none;margin-bottom:12px;font-family:var(--font-body)}
.verify-input:focus{border-color:var(--brown)}
.verify-code-row{display:flex;gap:10px}
.verify-code-row .verify-input{flex:1;margin-bottom:0}
.verify-code-btn{padding:0 16px;border-radius:12px;border:none;background:var(--brown);color:#fff;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0}
.verify-code-btn:disabled{opacity:.4;cursor:not-allowed}

/* 协议正文 */
.agreement-body h3{font-size:15px;font-weight:600;color:var(--fg);margin:16px 0 8px}
.agreement-body h3:first-child{margin-top:0}
.agreement-body p{font-size:13px;line-height:1.8;color:var(--muted);margin-bottom:4px}

/* 图片全屏预览 */
.image-preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:300;display:flex;align-items:center;justify-content:center;cursor:pointer}
.image-preview-full{max-width:100%;max-height:100%;object-fit:contain}

.bottom-spacer{height:40px}

@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}.anim-delay-2{animation-delay:.2s}.anim-delay-3{animation-delay:.3s}.anim-delay-4{animation-delay:.4s}.anim-delay-5{animation-delay:.5s}
</style>
