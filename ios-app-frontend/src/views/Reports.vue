<template>
  <div class="app-shell">
    <PageHeader title="举报管理" />

    <!-- 统计 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-item">
        <div class="stat-value" style="color: #ff9500;">{{ reportStats.pending }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #34c759;">{{ reportStats.resolved }}</div>
        <div class="stat-label">已解决</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #999;">{{ reportStats.dismissed }}</div>
        <div class="stat-label">已驳回</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && reports.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">暂无举报</p>
    </div>

    <!-- 举报列表 -->
    <div v-else class="report-list">
      <div v-for="report in reports" :key="report.id" class="report-card">
        <div class="report-header">
          <span class="report-category">{{ getCategoryLabel(report.category) }}</span>
          <span class="report-status" :class="'status-' + report.status">{{ getStatusLabel(report.status) }}</span>
        </div>
        <div class="report-reason">{{ report.reason }}</div>
        <div class="report-meta">
          <span>举报者: {{ report.reporter_id ? '用户' : '匿名' }}</span>
          <span>{{ formatDate(report.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCommunityReports } from '../composables/useCommunityReports'
import PageHeader from '../components/PageHeader.vue'

const { reports, loading, fetchReports, getReportStatusLabel, getReportCategoryLabel } = useCommunityReports()

const reportStats = computed(() => {
  const stats = { pending: 0, resolved: 0, dismissed: 0 }
  for (const r of reports.value) {
    if (stats[r.status] !== undefined) stats[r.status]++
  }
  return stats
})

onMounted(() => {
  fetchReports()
})

function getCategoryLabel(cat) { return getReportCategoryLabel(cat) }
function getStatusLabel(status) { return getReportStatusLabel(status) }

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
.report-list { padding: 16px 0; }
.report-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.report-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.report-category { font-size: 13px; padding: 4px 10px; border-radius: 10px; background: #f5f5f5; color: #666; }
.report-status { font-size: 12px; padding: 4px 10px; border-radius: 10px; }
.status-pending { background: #fff3e0; color: #f57c00; }
.status-resolved { background: #e8f5e9; color: #2e7d32; }
.status-dismissed { background: #f5f5f5; color: #999; }
.report-reason { font-size: 14px; color: #333; margin-bottom: 8px; }
.report-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
</style>
