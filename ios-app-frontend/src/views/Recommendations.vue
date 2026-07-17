<template>
  <div class="app-shell">
    <PageHeader title="推荐系统" />

    <!-- 加载态 -->
    <div v-if="loading || generating" class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ generating ? '正在生成推荐...' : '加载中...' }}</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="recommendations.length === 0" class="empty-state">
      <div class="empty-icon">🎯</div>
      <p class="empty-text">暂无推荐</p>
      <p class="empty-hint">系统会根据宠物信息生成个性化推荐</p>
      <button class="generate-btn" @click="handleGenerate">生成推荐</button>
    </div>

    <!-- 推荐列表 -->
    <div v-else class="recommendation-list">
      <div v-for="(rec, idx) in recommendations" :key="idx" class="rec-card">
        <div class="rec-rank">#{{ idx + 1 }}</div>
        <div class="rec-info">
          <div class="rec-name">{{ rec.products?.name || '产品' }}</div>
          <div class="rec-brand">{{ rec.products?.brand }}</div>
          <div class="rec-score">匹配度: {{ rec.score || '-' }}</div>
        </div>
        <div class="rec-price" v-if="rec.products?.price_max">
          ¥{{ rec.products.price_max }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useRecommendations } from '../composables/useRecommendations'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const { recommendations, loading, generating, fetchRecommendations, generateRecommendations } = useRecommendations()

onMounted(() => {
  if (petId.value) fetchRecommendations(petId.value)
})

async function handleGenerate() {
  if (!petId.value) return
  await generateRecommendations(petId.value, {})
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.loading-state { text-align: center; padding: 60px 20px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #ff6b4a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #999; margin-bottom: 20px; }
.generate-btn { padding: 12px 32px; background: #ff6b4a; color: #fff; border: none; border-radius: 12px; font-size: 15px; }
.recommendation-list { padding: 16px 0; }
.rec-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.rec-rank { width: 32px; height: 32px; border-radius: 50%; background: #ff6b4a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.rec-info { flex: 1; }
.rec-name { font-size: 15px; font-weight: 500; color: #333; }
.rec-brand { font-size: 13px; color: #999; }
.rec-score { font-size: 12px; color: #ff6b4a; margin-top: 4px; }
.rec-price { font-size: 16px; font-weight: 600; color: #333; }
</style>
