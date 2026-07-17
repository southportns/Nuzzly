<template>
  <div class="app-shell">
    <PageHeader title="宠物附件" :action-text="'上传'" @action="triggerUpload" />

    <!-- 统计 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-item">
        <div class="stat-value">{{ attachments.length }}</div>
        <div class="stat-label">全部</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ imageCount }}</div>
        <div class="stat-label">图片</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ docCount }}</div>
        <div class="stat-label">文档</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && attachments.length === 0" class="empty-state">
      <div class="empty-icon">📎</div>
      <p class="empty-text">暂无附件</p>
      <p class="empty-hint">点击右上角上传照片或文档</p>
    </div>

    <!-- 附件网格 -->
    <div v-else class="attachment-grid">
      <div v-for="att in attachments" :key="att.id" class="attachment-item" @click="previewAttachment(att)">
        <img v-if="isImage(att.file_type)" :src="att.file_url" class="attachment-thumb" />
        <div v-else class="attachment-icon">📄</div>
        <div class="attachment-name">{{ att.file_name }}</div>
        <div class="attachment-size">{{ formatSize(att.file_size) }}</div>
        <button class="delete-btn" @click.stop="handleDelete(att)">×</button>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" accept="image/*,.pdf,.doc,.docx" style="display: none" @change="handleFileChange" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePetAttachments } from '../composables/usePetAttachments'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { attachments, loading, fetchAttachments, uploadAttachment, deleteAttachment } = usePetAttachments()

const fileInput = ref(null)

const imageCount = computed(() => attachments.value.filter(a => a.file_type?.startsWith('image/')).length)
const docCount = computed(() => attachments.value.filter(a => a.file_type === 'application/pdf').length)

onMounted(() => {
  if (petId.value) fetchAttachments(petId.value)
})

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file || !petId.value) return
  try {
    await uploadAttachment({ pet_id: petId.value, file, category: 'other' })
  } catch (err) {
    console.error(err)
  }
  e.target.value = ''
}

async function handleDelete(att) {
  if (confirm(`确定删除"${att.file_name}"吗？`)) {
    await deleteAttachment(att.id)
  }
}

function previewAttachment(att) {
  window.open(att.file_url, '_blank')
}

function isImage(type) {
  return type?.startsWith('image/')
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.stats-row { display: flex; gap: 16px; margin: 16px 0; }
.stat-item { flex: 1; background: #fff; border-radius: 12px; padding: 12px; text-align: center; }
.stat-value { font-size: 24px; font-weight: 600; color: #333; }
.stat-label { font-size: 12px; color: #999; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #999; }
.attachment-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px 0; }
.attachment-item { position: relative; background: #fff; border-radius: 12px; overflow: hidden; }
.attachment-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; }
.attachment-icon { width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; background: #f5f5f5; font-size: 32px; }
.attachment-name { padding: 8px; font-size: 12px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.attachment-size { padding: 0 8px 8px; font-size: 11px; color: #999; }
.delete-btn { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(0,0,0,0.5); color: #fff; font-size: 14px; }
</style>
