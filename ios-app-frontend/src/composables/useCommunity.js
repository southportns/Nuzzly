import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, apiCall, toastError } from '../lib/error-handling'
import { checkSensitiveWords } from '../lib/content-filter'
import { auditContent, auditImage } from '../lib/content-audit'

const posts = shallowRef([])
const loading = ref(false)
const hasMore = ref(true)
const myLikedPostIds = ref(new Set())

const PAGE_SIZE = 20

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

/**
 * 获取帖子列表（无限滚动分页）
 * @param {Object} options
 * @param {string} [options.petType] - 筛选宠物类型 cat/dog
 * @param {string} [options.breed] - 筛选品种
 * @param {number} [options.page] - 分页页码
 * @param {string} [options.cursor] - 游标（created_at）
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
async function fetchPosts({ petType, breed, cursor } = {}) {
  const uid = await getUid()

  let query = supabase
    .from('community_posts')
    .select(`
      id, profile_id, content, images, pet_type, breed,
      likes_count, review_status, created_at,
      public_profiles!inner(display_name, avatar_url)
    `)
    .eq('is_deleted', false)
    .in('review_status', ['approved', 'auto_approved'])
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (petType) query = query.eq('pet_type', petType)
  if (breed && breed !== '全部品种') query = query.eq('breed', breed)
  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query
  if (error) {
    console.warn('[useCommunity.fetchPosts]', error.message)
    return { data: null, error: normalizeError(error, 'fetchPosts') }
  }

  const newPosts = data || []

  // 首次加载或刷新时替换；无限滚动时追加
  if (!cursor) {
    posts.value = newPosts
  } else {
    posts.value = [...posts.value, ...newPosts]
  }

  hasMore.value = newPosts.length >= PAGE_SIZE

  // 获取当前用户对这批帖子的点赞状态
  if (uid && newPosts.length > 0) {
    const postIds = newPosts.map(p => p.id)
    const { data: likes } = await supabase
      .from('community_likes')
      .select('post_id')
      .eq('profile_id', uid)
      .in('post_id', postIds)
    if (likes) {
      const newLiked = new Set(myLikedPostIds.value)
      likes.forEach(l => newLiked.add(l.post_id))
      myLikedPostIds.value = newLiked
    }
  }

  return { data: newPosts, error: null }
}

/**
 * 发布帖子（通过 SECURITY DEFINER 函数，强制审核流程）
 * @param {Object} payload
 * @param {string} payload.content - 文本内容
 * @param {File[]} [payload.imageFiles] - 图片文件列表
 * @param {string} [payload.petType] - 宠物类型
 * @param {string} [payload.breed] - 品种
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
async function createPost({ content, imageFiles = [], petType, breed }) {
  const uid = await getUid()
  if (!uid) {
    toastError({ code: 'UNAUTHENTICATED' })
    return { data: null, error: { code: 'UNAUTHENTICATED' } }
  }

  // 1. 前端敏感词预检（仅 UX 提示）
  const { passed: wordPassed, words } = await checkSensitiveWords(content)
  if (!wordPassed) {
    return {
      data: null,
      error: { code: 'VALIDATION', message: `内容包含敏感词：${words.join('、')}，请修改后发布` }
    }
  }

  // 2. 后端审核
  const auditResult = await auditContent(content)
  if (!auditResult.passed) {
    return {
      data: null,
      error: { code: 'VALIDATION', message: auditResult.reason || '内容审核未通过' }
    }
  }

  // 3. 上传图片到 Supabase Storage
  const imageUrls = []
  for (const file of imageFiles.slice(0, 9)) {
    // EXIF 剥离 + 尺寸限制在前端预处理
    const processedFile = await preprocessImage(file)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('community-posts')
      .upload(path, processedFile, { contentType: file.type, upsert: false })

    if (uploadErr) {
      console.warn('[useCommunity.createPost] 图片上传失败:', uploadErr.message)
      continue
    }

    const { data: urlData } = supabase.storage
      .from('community-posts')
      .getPublicUrl(uploadData.path)
    imageUrls.push(urlData.publicUrl)

    // 图片审核（异步，不阻塞发布）
    auditImage(urlData.publicUrl).catch(() => {})
  }

  // 4. 通过 RPC create_community_post 发布（SECURITY DEFINER 强制审核）
  const { data, error } = await supabase.rpc('create_community_post', {
    p_content: content,
    p_images: imageUrls,
    p_pet_type: petType || null,
    p_breed: breed || null,
    p_ip_address: null  // IP 由后端补充
  })

  if (error) {
    return { data: null, error: normalizeError(error, 'createPost') }
  }

  // 5. 刷新帖子列表
  await fetchPosts({})

  return { data, error: null }
}

/**
 * 点赞/取消点赞
 * @param {string} postId
 * @param {boolean} liked - 当前是否已赞
 */
async function toggleLike(postId, liked) {
  const uid = await getUid()
  if (!uid) {
    toastError({ code: 'UNAUTHENTICATED' })
    return
  }

  const likedSet = new Set(myLikedPostIds.value)

  if (liked) {
    // 取消点赞
    const { error } = await supabase
      .from('community_likes')
      .delete()
      .eq('post_id', postId)
      .eq('profile_id', uid)
    if (error) {
      console.warn('[useCommunity.toggleLike] 取消点赞失败:', error.message)
      return
    }
    likedSet.delete(postId)
    // 本地更新计数
    posts.value = posts.value.map(p =>
      p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p
    )
  } else {
    // 点赞
    const { error } = await supabase
      .from('community_likes')
      .insert({ post_id: postId, profile_id: uid })
    if (error) {
      console.warn('[useCommunity.toggleLike] 点赞失败:', error.message)
      return
    }
    likedSet.add(postId)
    posts.value = posts.value.map(p =>
      p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
    )
  }

  myLikedPostIds.value = likedSet
}

/**
 * 举报帖子
 * @param {string} postId
 * @param {string} reason
 * @param {string} category
 */
async function reportPost(postId, reason, category = 'other') {
  const uid = await getUid()
  if (!uid) {
    toastError({ code: 'UNAUTHENTICATED' })
    return { data: null, error: { code: 'UNAUTHENTICATED' } }
  }

  return apiCall(() =>
    supabase
      .from('community_reports')
      .insert({ post_id: postId, reporter_id: uid, reason, category })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      }),
    'reportPost'
  )
}

/**
 * 软删除自己的帖子
 * @param {string} postId
 */
async function deletePost(postId) {
  return apiCall(() =>
    supabase
      .from('community_posts')
      .update({ is_deleted: true })
      .eq('id', postId)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        posts.value = posts.value.filter(p => p.id !== postId)
        return data
      }),
    'deletePost'
  )
}

/**
 * 检查当前用户是否已完成实名认证
 * @returns {Promise<{verified: boolean, hasBirthDate: boolean}>}
 */
async function checkVerification() {
  const uid = await getUid()
  if (!uid) return { verified: false, hasBirthDate: false }

  const { data } = await supabase
    .from('profiles')
    .select('phone_verified_at, birth_date')
    .eq('id', uid)
    .single()

  return {
    verified: !!data?.phone_verified_at,
    hasBirthDate: !!data?.birth_date
  }
}

/**
 * 图片预处理：剥离 EXIF + 限制尺寸
 */
async function preprocessImage(file) {
  // 5MB 限制
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('图片大小不能超过 5MB')
  }

  // 使用 canvas 剥离 EXIF 并限制尺寸
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      const MAX = 2048

      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
        'image/jpeg',
        0.85
      )
    }

    img.onerror = () => resolve(file) // 降级返回原文件
    img.src = url
  })
}

export function useCommunity() {
  return {
    posts, loading, hasMore, myLikedPostIds,
    fetchPosts, createPost, toggleLike, reportPost, deletePost,
    checkVerification
  }
}
