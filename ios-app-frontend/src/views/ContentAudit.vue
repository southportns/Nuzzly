<template>
  <div class="app-shell">
    <PageHeader title="内容审核" />

    <!-- 统计 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-item">
        <div class="stat-value" style="color: #ff9500;">{{ moderationStats.pending }}</div>
        <div class="stat-label">待审核</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #34c759;">{{ moderationStats.approved }}</div>
        <div class="stat-label">已通过</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #ff3b30;">{{ moderationStats.rejected }}</div>
        <div class="stat-label">已拒绝</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && moderationQueue.length === 0" class="empty-state">
      <div class="empty-icon">✅</div>
      <p class="empty-text">暂无待审核内容</p>
    </div>

    <!-- 审核列表 -->
    <div v-else class="audit-list">
      <div v-for="post in moderationQueue" :key="post.id" class="audit-card">
        <div class="audit-content">{{ post.content }}</div>
        <div class="audit-meta">
          <span>{{ post.profiles?.display_name || '用户' }}</span>
          <span>{{ formatDate(post.created_at) }}</span>
        </div>
        <div class="audit-actions">
          <button class="btn-reject" @click="handleReject(post.id)">拒绝</button>
          <button class="btn-approve" @click="handleApprove(post.id)">通过</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useContentModeration } from '../composables/useContentModeration'
import PageHeader from '../components/PageHeader.vue'

const { moderationQueue, moderationStats, loading, fetchModerationQueue, fetchModerationStats, approvePost, rejectPost } = useContentModeration()

onMounted(async () => {
  await fetchModerationStats()
  await fetchModerationQueue()
})

async function handleApprove(id) {
  await approvePost(id)
  await fetchModerationStats()
}

async function handleReject(id) {
  if (confirm('确定拒绝此内容吗？')) {
    await rejectPost(id, '内容不符合规范')
    await fetchModerationStats()
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
.stat-item { background: #fff; border-radius: 12px; padding: 16px; text-align: center; }
.stat-value { font-size: clamp(20px,5.5vw,28px); font-weight: 600; }
.stat-label { font-size: 12px; color: #999; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.audit-list { padding: 16px 0; }
.audit-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.audit-content { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 12px; }
.audit-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; margin-bottom: 12px; }
.audit-actions { display: flex; gap: 12px; }
.btn-reject { flex: 1; padding: 10px; border: 1px solid #ff3b30; border-radius: 8px; background: #fff; color: #ff3b30; font-size: 14px; }
.btn-approve { flex: 1; padding: 10px; border: none; border-radius: 8px; background: #34c759; color: #fff; font-size: 14px; }
</style>
