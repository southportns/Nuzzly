<template>
  <div class="app-shell">
    <PageHeader title="数据信任" />

    <!-- 空状态 -->
    <div v-if="!loading && trustScores.length === 0" class="empty-state">
      <div class="empty-icon">🛡️</div>
      <p class="empty-text">暂无信任分数</p>
    </div>

    <!-- 信任分数列表 -->
    <div v-else class="score-list">
      <div v-for="score in trustScores" :key="score.id" class="score-card">
        <div class="score-header">
          <span class="score-entity">{{ score.entity_type }}</span>
          <span class="score-level" :class="getTrustLevel(score.trust_score).color">
            {{ getTrustLevel(score.trust_score).label }}
          </span>
        </div>
        <div class="score-value">{{ (score.trust_score * 100).toFixed(0) }}</div>
        <div class="score-bar">
          <div class="score-bar-fill" :style="{ width: (score.trust_score * 100) + '%' }"></div>
        </div>
        <div class="score-factors">
          <span v-if="score.has_photos" class="factor-tag positive">有照片</span>
          <span v-if="score.has_voucher" class="factor-tag positive">有凭证</span>
          <span v-if="score.has_long_term_data" class="factor-tag positive">长期数据</span>
          <span v-if="score.is_anomaly" class="factor-tag negative">异常</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDataTrustScores } from '../composables/useDataTrustScores'
import PageHeader from '../components/PageHeader.vue'

const { trustScores, loading, fetchTrustScores, getTrustLevel } = useDataTrustScores()

onMounted(() => {
  fetchTrustScores()
})
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; }
.score-list { padding: 16px 0; }
.score-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.score-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.score-entity { font-size: 14px; color: #666; }
.score-level { font-size: 12px; padding: 4px 10px; border-radius: 10px; }
.score-value { font-size: clamp(24px,7vw,36px); font-weight: 600; color: #333; text-align: center; margin-bottom: 12px; }
.score-bar { height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
.score-bar-fill { height: 100%; background: #ff6b4a; border-radius: 4px; transition: width 0.3s; }
.score-factors { display: flex; gap: 8px; }
.factor-tag { font-size: 11px; padding: 4px 10px; border-radius: 10px; }
.factor-tag.positive { background: #e8f5e9; color: #2e7d32; }
.factor-tag.negative { background: #ffebee; color: #c62828; }
</style>
