<template>
  <div class="app-shell">
    <PageHeader title="环境档案" :action-text="environmentProfile ? '编辑' : '添加'" @action="showForm = true" />

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="env-skeleton skeleton">
        <div class="shimmer-line w60"></div>
        <div class="shimmer-line w80"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!environmentProfile" class="empty-state">
      <div class="empty-icon">🏠</div>
      <p class="empty-text">暂无环境档案</p>
      <p class="empty-hint">添加环境信息可以帮助系统提供更精准的建议</p>
      <button class="add-btn" @click="showForm = true">添加档案</button>
    </div>

    <!-- 档案详情 -->
    <div v-else class="env-detail">
      <!-- 环境评分 -->
      <div class="env-score" v-if="envScore">
        <div class="score-value">{{ envScore }}</div>
        <div class="score-label">环境评分</div>
      </div>

      <!-- 环境信息 -->
      <div class="info-card">
        <div class="info-item">
          <span class="info-label">📍 地区</span>
          <span class="info-value">{{ environmentProfile.region || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">🌡️ 气候</span>
          <span class="info-value">{{ getClimateLabel(environmentProfile.climate_type) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">🏃 活动量</span>
          <span class="info-value">{{ getActivityLabel(environmentProfile.activity_level) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">🏠 室内外</span>
          <span class="info-value">{{ getIndoorOutdoorLabel(environmentProfile.indoor_outdoor) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">💧 水源</span>
          <span class="info-value">{{ getWaterSourceLabel(environmentProfile.water_source) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">🐾 多宠</span>
          <span class="info-value">{{ environmentProfile.multi_pet_household ? '是' : '否' }}</span>
        </div>
      </div>
    </div>

    <!-- 编辑表单 -->
    <div v-if="showForm" class="sheet-overlay" @click.self="showForm = false">
      <div class="sheet-content">
        <div class="sheet-header">
          <span class="sheet-title">{{ environmentProfile ? '编辑档案' : '添加档案' }}</span>
          <button class="sheet-close" @click="showForm = false">×</button>
        </div>
        <div class="sheet-body">
          <div class="form-group">
            <label class="form-label">地区</label>
            <input v-model="form.region" class="form-input" placeholder="例如：北京、上海" />
          </div>
          <div class="form-group">
            <label class="form-label">气候类型</label>
            <select v-model="form.climate_type" class="form-select">
              <option value="">请选择</option>
              <option value="tropical">热带</option>
              <option value="subtropical">亚热带</option>
              <option value="temperate">温带</option>
              <option value="continental">大陆性</option>
              <option value="arid">干旱</option>
              <option value="cold">寒冷</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">活动水平</label>
            <select v-model="form.activity_level" class="form-select">
              <option value="">请选择</option>
              <option value="low">低活动量</option>
              <option value="moderate">中等活动量</option>
              <option value="high">高活动量</option>
              <option value="very_high">非常高</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">室内/室外</label>
            <select v-model="form.indoor_outdoor" class="form-select">
              <option value="">请选择</option>
              <option value="indoor">纯室内</option>
              <option value="mixed">室内外混合</option>
              <option value="outdoor">纯室外</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">水源</label>
            <select v-model="form.water_source" class="form-select">
              <option value="">请选择</option>
              <option value="tap">自来水</option>
              <option value="filtered">过滤水</option>
              <option value="bottled">瓶装水</option>
              <option value="spring">山泉水</option>
            </select>
          </div>
        </div>
        <div class="sheet-footer">
          <button class="btn-cancel" @click="showForm = false">取消</button>
          <button class="btn-confirm" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEnvironmentProfiles } from '../composables/useEnvironmentProfiles'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const petId = ref(route.query.pet || '')

const {
  environmentProfile, loading,
  fetchEnvironmentProfile, createOrUpdateEnvironmentProfile,
  getClimateTypeLabel, getActivityLevelLabel, getIndoorOutdoorLabel, getWaterSourceLabel,
  calculateEnvironmentScore
} = useEnvironmentProfiles()

const showForm = ref(false)
const form = ref({
  region: '',
  climate_type: '',
  activity_level: '',
  indoor_outdoor: '',
  water_source: '',
})

const envScore = computed(() => calculateEnvironmentScore(environmentProfile.value))

onMounted(() => {
  if (petId.value) {
    fetchEnvironmentProfile(petId.value)
  }
})

watch(environmentProfile, (val) => {
  if (val) {
    form.value = {
      region: val.region || '',
      climate_type: val.climate_type || '',
      activity_level: val.activity_level || '',
      indoor_outdoor: val.indoor_outdoor || '',
      water_source: val.water_source || '',
    }
  }
})

function getClimateLabel(type) { return getClimateTypeLabel(type) }
function getActivityLabel(level) { return getActivityLevelLabel(level) }
function getIndoorOutdoorLabel(val) { return getIndoorOutdoorLabel(val) }
function getWaterSourceLabel(val) { return getWaterSourceLabel(val) }

async function handleSave() {
  try {
    await createOrUpdateEnvironmentProfile(petId.value, form.value)
    showForm.value = false
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #f5f5f5; padding: 0 16px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; color: #333; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #999; margin-bottom: 20px; }
.add-btn { padding: 12px 32px; background: #ff6b4a; color: #fff; border: none; border-radius: 12px; font-size: 15px; }
.env-detail { padding: 16px 0; }
.env-score { text-align: center; background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
.score-value { font-size: 48px; font-weight: 600; color: #ff6b4a; }
.score-label { font-size: 13px; color: #999; }
.info-card { background: #fff; border-radius: 12px; overflow: hidden; }
.info-item { display: flex; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.info-label { font-size: 14px; color: #666; }
.info-value { font-size: 14px; color: #333; font-weight: 500; }
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet-content { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; max-height: 80vh; overflow-y: auto; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sheet-title { font-size: 17px; font-weight: 600; }
.sheet-close { width: 28px; height: 28px; border: none; background: #f5f5f5; border-radius: 50%; font-size: 18px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
.form-input, .form-select { width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 15px; }
.sheet-footer { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel { flex: 1; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 15px; }
.btn-confirm { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #ff6b4a; color: #fff; font-size: 15px; }
</style>
