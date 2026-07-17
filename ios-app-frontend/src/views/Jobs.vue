<template>
  <div class="app-shell">
    <PageHeader title="计算任务" />

    <!-- 空状态 -->
    <div v-if="!loading && jobs.length === 0" class="empty-state">
      <div class="empty-icon">⚙️</div>
      <p class="empty-text">暂无计算任务</p>
    </div>

    <!-- 任务列表 -->
    <div v-else class="job-list">
      <div v-for="job in jobs" :key="job.id" class="job-card">
        <div class="job-header">
          <span class="job-type">{{ getJobTypeLabel(job.job_type) }}</span>
          <span class="job-status" :class="'status-' + job.status">{{ getJobStatusLabel(job.status) }}</span>
        </div>
        <div class="job-meta">
          <span>{{ formatDate(job.created_at) }}</span>
          <span v-if="job.error_message" class="job-error">{{ job.error_message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useComputationJobs } from '../composables/useComputationJobs'
import PageHeader from '../components/PageHeader.vue'

const { jobs, loading, fetchJobs, getJobStatusLabel, getJobTypeLabel } = useComputationJobs()

onMounted(() => {
  fetchJobs()
})

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.job-list { padding: 16px 0; }
.job-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.job-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.job-type { font-size: 15px; font-weight: 500; color: #333; }
.job-status { font-size: 12px; padding: 4px 10px; border-radius: 10px; }
.status-pending { background: #fff3e0; color: #f57c00; }
.status-processing { background: #e3f2fd; color: #1976d2; }
.status-processed { background: #e8f5e9; color: #2e7d32; }
.status-failed { background: #ffebee; color: #c62828; }
.job-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
.job-error { color: #ff3b30; }
</style>
