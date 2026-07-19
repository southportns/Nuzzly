import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

const attachments = shallowRef([])
const loading = ref(false)

async function getUid() {
  const { data: session } = await supabase.auth.getSession()
  return session?.session?.user?.id
}

async function fetchAttachments(petId) {
  loading.value = true

  const { data, error } = await supabase
    .from('pet_attachments')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[usePetAttachments] fetch error:', error.message)
    attachments.value = []
  } else {
    attachments.value = data || []
  }
  loading.value = false
}

async function uploadAttachment({ pet_id, file, category = 'other' }) {
  const uid = await getUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'uploadAttachment')

  // 生成文件路径
  const fileExt = file.name.split('.').pop()
  const fileName = `${pet_id}/${Date.now()}.${fileExt}`

  // 上传文件到Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('pet-attachments')
    .upload(fileName, file)

  if (uploadError) throw normalizeError(uploadError, 'uploadAttachment')

  // 获取文件URL
  const { data: urlData } = supabase.storage
    .from('pet-attachments')
    .getPublicUrl(fileName)

  // 保存附件记录（通过 gateway 写入 DB）
  try {
    await writeGateway('CREATE_PET_ATTACHMENT', {
      pet_id,
      uploaded_by: uid,
      file_name: file.name,
      file_path: fileName,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      category,
      owner_type: 'pet',
      owner_id: pet_id
    })
  } catch (e) {
    throw normalizeError(e, 'uploadAttachment')
  }
  // gateway event 类型不返回行数据，本地构造一条乐观条目
  const optimistic = {
    pet_id,
    uploaded_by: uid,
    file_name: file.name,
    file_path: fileName,
    file_url: urlData.publicUrl,
    file_type: file.type,
    file_size: file.size,
    category,
    owner_type: 'pet',
    owner_id: pet_id,
    created_at: new Date().toISOString()
  }
  attachments.value = [optimistic, ...attachments.value]
  return optimistic
}

async function deleteAttachment(id) {
  // 获取附件信息
  const attachment = attachments.value.find(a => a.id === id)
  if (!attachment) throw new Error('附件不存在')

  // 先通过 gateway 删除 DB 记录
  try {
    await writeGateway('DELETE_PET_ATTACHMENT', { id })
  } catch (e) {
    throw normalizeError(e, 'deleteAttachment')
  }

  // 成功后再清理 Storage 文件
  const { error: storageError } = await supabase.storage
    .from('pet-attachments')
    .remove([attachment.file_path])

  if (storageError) console.warn('[usePetAttachments] storage delete error:', storageError.message)

  attachments.value = attachments.value.filter(a => a.id !== id)
}

async function getAttachmentUrl(path) {
  const { data } = supabase.storage
    .from('pet-attachments')
    .getPublicUrl(path)
  return data?.publicUrl
}

function getCategoryLabel(category) {
  const labels = {
    photo: '照片',
    medical: '医疗文件',
    vaccine: '疫苗证明',
    document: '证件',
    other: '其他'
  }
  return labels[category] || category || '其他'
}

function getCategoryIcon(category) {
  const icons = {
    photo: '📷',
    medical: '🏥',
    vaccine: '💉',
    document: '📄',
    other: '📎'
  }
  return icons[category] || '📎'
}

function formatFileSize(bytes) {
  if (bytes == null) return '未知'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function isImageFile(fileType) {
  return fileType?.startsWith('image/')
}

function isPdfFile(fileType) {
  return fileType === 'application/pdf'
}

function calculateAttachmentStats(attachmentsList) {
  if (!attachmentsList || attachmentsList.length === 0) return null

  const stats = {
    total: attachmentsList.length,
    totalSize: attachmentsList.reduce((sum, a) => sum + (a.file_size || 0), 0),
    byCategory: {},
    byType: {}
  }

  for (const att of attachmentsList) {
    stats.byCategory[att.category] = (stats.byCategory[att.category] || 0) + 1
    const typeGroup = att.file_type?.startsWith('image/') ? 'image' :
                     att.file_type === 'application/pdf' ? 'pdf' : 'other'
    stats.byType[typeGroup] = (stats.byType[typeGroup] || 0) + 1
  }

  stats.formattedSize = formatFileSize(stats.totalSize)

  return stats
}

export function usePetAttachments() {
  return {
    attachments,
    loading,
    fetchAttachments,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    getCategoryLabel,
    getCategoryIcon,
    formatFileSize,
    isImageFile,
    isPdfFile,
    calculateAttachmentStats
  }
}
