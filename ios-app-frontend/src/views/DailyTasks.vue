<template>
  <div class="app-shell">
    <PageHeader
      title="任务管理"
      :action-text="'添加'"
      @action="showAddSheet = true"
    />

    <!-- 宠物切换 Tabs -->
    <div class="pet-tabs" v-if="pets.length > 1">
      <div
        v-for="pet in pets"
        :key="pet.id"
        class="pet-tab"
        :class="{ active: pet.id === petId }"
        @click="switchPet(pet.id)"
      >
        <span class="pet-tab-emoji">{{ SPECIES_EMOJI[pet.species] || '🐾' }}</span>
        <span>{{ pet.name }}</span>
      </div>
    </div>

    <!-- 今日得分概览 -->
    <div class="score-overview" v-if="!loading">
      <div class="score-circle" :class="scoreColorClass">
        <span class="score-num">{{ todayScore }}</span>
        <span class="score-unit">分</span>
      </div>
      <div class="score-detail">
        <div class="score-title">今日完成度</div>
        <div class="score-bar-wrap">
          <div class="score-bar">
            <div class="score-bar-fill" :style="{ width: todayScore + '%' }" :class="scoreColorClass"></div>
          </div>
          <span class="score-bar-text">{{ completedCount }}/{{ totalCount }} 项</span>
        </div>
      </div>
    </div>

    <!-- 加载态 -->
    <div v-if="loading" class="skeleton-list">
      <div class="task-row skeleton" v-for="i in 5" :key="i">
        <div class="shimmer-circle"></div>
        <div class="shimmer-line w60"></div>
      </div>
    </div>

    <!-- 任务列表 -->
    <template v-else>
      <!-- 待完成 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">待完成</span>
          <span class="section-badge">{{ pendingTasks.length }}</span>
        </div>
        <div v-if="pendingTasks.length === 0" class="empty-hint">🎉 全部完成，太棒了！</div>
        <div
          v-for="task in pendingTasks"
          :key="task.id"
          class="task-row pending"
          @click="onToggleTask(task)"
          @touchstart="onTaskTouchStart($event, task)"
          @touchend="onTaskTouchEnd($event, task)"
        >
          <div class="task-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div class="task-info">
            <span class="task-icon">{{ task.icon || '📋' }}</span>
            <div class="task-text">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">{{ task.weight }}分 · {{ freqLabel(task) }}{{ task.reminder_time ? ' · ' + task.reminder_time.slice(0,5) : '' }}</div>
            </div>
          </div>
          <div class="task-weight">+{{ task.weight }}</div>
        </div>
      </div>

      <!-- 已完成 -->
      <div class="section" v-if="completedTasks.length > 0">
        <div class="section-header">
          <span class="section-title done">已完成</span>
          <span class="section-badge done-count">{{ completedTasks.length }}</span>
        </div>
        <div
          v-for="task in completedTasks"
          :key="task.id"
          class="task-row completed"
          @click="onToggleTask(task)"
        >
          <div class="task-check checked">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <div class="task-info">
            <span class="task-icon">{{ task.icon || '📋' }}</span>
            <div class="task-text">
              <div class="task-title done">{{ task.title }}</div>
              <div class="task-meta">{{ task.weight }}分 · {{ freqLabel(task) }}</div>
            </div>
          </div>
          <div class="task-weight done">✓</div>
        </div>
      </div>

      <!-- 模板库 -->
      <div class="section">
        <div class="section-header collapsible" @click="showTemplates = !showTemplates">
          <span class="section-title">📦 任务模板库</span>
          <svg :class="{ rotated: showTemplates }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div v-if="showTemplates" class="template-grid">
          <div
            v-for="tpl in availableTemplates"
            :key="tpl.title"
            class="template-chip"
            @click="addFromTemplate(tpl)"
          >
            <span>{{ tpl.icon }}</span>
            <span>{{ tpl.title }}</span>
            <span class="template-freq">{{ freqLabel(tpl) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 添加任务 Bottom Sheet -->
    <div v-if="showAddSheet" class="sheet-overlay" @click.self="showAddSheet = false">
      <div class="sheet-panel">
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">添加任务</h3>

        <!-- 快速模板选择 -->
        <div class="quick-templates" v-if="!customForm.title">
          <div
            v-for="tpl in builtinTemplates"
            :key="tpl.title"
            class="quick-tpl-row"
            @click="fillFromTemplate(tpl)"
          >
            <span>{{ tpl.icon }}</span>
            <span>{{ tpl.title }}</span>
            <span class="q-freq">{{ freqLabel(tpl) }}</span>
          </div>
          <div class="quick-tpl-row custom" @click="customForm.title = ''">
            <span>✏</span>
            <span>自定义任务</span>
          </div>
        </div>

        <!-- 自定义表单 -->
        <template v-else>
          <div class="form-group">
            <label class="form-label">任务名称</label>
            <input v-model="customForm.title" type="text" class="form-input" placeholder="例如：清理猫砂盆">
          </div>
          <div class="form-group">
            <label class="form-label">图标</label>
            <div class="icon-picker">
              <span
                v-for="icon in commonIcons"
                :key="icon"
                class="icon-option"
                :class="{ active: customForm.icon === icon }"
                @click="customForm.icon = icon"
              >{{ icon }}</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label class="form-label">频率</label>
              <select v-model="customForm.frequency" class="form-input">
                <option v-for="o in FREQUENCY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
            <div class="form-group half" v-if="customForm.frequency === 'custom_days'">
              <label class="form-label">间隔天数</label>
              <input v-model.number="customForm.custom_days" type="number" min="1" class="form-input" placeholder="3">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label class="form-label">权重分</label>
              <div class="weight-picker">
                <button @click="customForm.weight = Math.max(1, customForm.weight - 5)">−</button>
                <span>{{ customForm.weight }}</span>
                <button @click="customForm.weight = Math.min(100, customForm.weight + 5)">+</button>
              </div>
            </div>
            <div class="form-group half">
              <label class="form-label">提醒时间</label>
              <input v-model="customForm.reminder_time" type="time" class="form-input">
            </div>
          </div>
        </template>

        <div class="sheet-actions">
          <button v-if="customForm.title" class="sheet-btn secondary" @click="resetForm">返回选择</button>
          <button
            v-if="customForm.title !== undefined"
            class="sheet-btn primary"
            :disabled="!customForm.title.trim()"
            @click="handleAddTask"
          >添加任务</button>
        </div>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="showDeleteConfirm" class="sheet-overlay" @click.self="showDeleteConfirm = false">
      <div class="sheet-panel">
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">确认删除</h3>
        <p class="delete-desc">确定要删除任务"{{ deletingTask?.title }}"吗？</p>
        <div class="sheet-actions">
          <button class="sheet-btn secondary" @click="showDeleteConfirm = false">取消</button>
          <button class="sheet-btn danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import PageHeader from '../components/PageHeader.vue'
import { usePets } from '../composables/usePets'
import { useDailyTasks } from '../composables/useDailyTasks'

const route = useRoute()
const router = useRouter()
const { pets, fetchPets } = usePets()

const SPECIES_EMOJI = { cat: '🐱', dog: '🐶' }

const petId = ref(route.params.petId)
const showAddSheet = ref(false)
const showTemplates = ref(false)
const showDeleteConfirm = ref(false)
const deletingTask = ref(null)
const saving = ref(false)

const {
  tasks, loading, todayScore, todayProgress,
  pendingTasks, completedTasks,
  refresh, toggleTask, addTask, removeTask,
  getBuiltInTemplates, FREQUENCY_LABELS, FREQUENCY_OPTIONS
} = useDailyTasks(petId.value)

const completedCount = computed(() => todayProgress.value.completedCount)
const totalCount = computed(() => todayProgress.value.totalCount)

const scoreColorClass = computed(() => {
  const s = todayScore.value
  if (s >= 80) return 'good'
  if (s >= 50) return 'warn'
  return 'bad'
})

function freqLabel(task) {
  if (task.frequency === 'custom_days') return `每${task.custom_days || 1}天`
  return FREQUENCY_LABELS[task.frequency] || task.frequency
}

const builtinTemplates = computed(() => {
  const pet = pets.value.find(p => p.id === petId.value)
  return getBuiltInTemplates(pet?.species || 'other')
})

const availableTemplates = computed(() => {
  const existingTitles = new Set(tasks.value.map(t => t.title))
  return builtinTemplates.value.filter(t => !existingTitles.has(t.title))
})

// 自定义任务表单
const commonIcons = ['🍽', '💧', '🧹', '🦮', '🧼', '💊', '✂', '🏥', '🪥', '🧸', '🌿', '📋']
const defaultForm = {
  title: undefined,
  icon: '📋',
  frequency: 'daily',
  custom_days: null,
  reminder_time: null,
  weight: 10,
  reminder_enabled: true
}
const customForm = ref({ ...defaultForm })

function fillFromTemplate(tpl) {
  customForm.value = {
    title: tpl.title,
    icon: tpl.icon,
    frequency: tpl.frequency,
    custom_days: tpl.custom_days || null,
    reminder_time: tpl.reminder_time || null,
    weight: tpl.weight || 10,
    reminder_enabled: !!tpl.reminder_time
  }
}

function addFromTemplate(tpl) {
  fillFromTemplate(tpl)
  showAddSheet.value = true
}

function resetForm() {
  customForm.value = { ...defaultForm }
}

async function handleAddTask() {
  if (saving.value) return
  saving.value = true
  try {
    await addTask({
      title: customForm.value.title.trim(),
      icon: customForm.value.icon,
      frequency: customForm.value.frequency,
      custom_days: customForm.value.custom_days,
      reminder_time: customForm.value.reminder_time || null,
      reminder_enabled: customForm.value.reminder_enabled,
      weight: customForm.value.weight
    })
    Toast({ theme: 'success', message: '任务已添加' })
    showAddSheet.value = false
    resetForm()
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '添加失败' })
  } finally {
    saving.value = false
  }
}

// 任务切换完成状态
async function onToggleTask(task) {
  try {
    await toggleTask(task.id, task.completed)
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '操作失败' })
  }
}

// 长按删除
let taskTouchTimer = null
function onTaskTouchStart(e, task) {
  if (task.is_builtin) return
  taskTouchTimer = setTimeout(() => {
    deletingTask.value = task
    showDeleteConfirm.value = true
  }, 600)
}

function onTaskTouchEnd(e, task) {
  if (taskTouchTimer) {
    clearTimeout(taskTouchTimer)
    taskTouchTimer = null
  }
}

async function confirmDelete() {
  if (!deletingTask.value) return
  try {
    await removeTask(deletingTask.value.id)
    Toast({ theme: 'success', message: '已删除' })
    showDeleteConfirm.value = false
    deletingTask.value = null
  } catch (e) {
    Toast({ theme: 'error', message: e.message || '删除失败' })
  }
}

async function switchPet(newPetId) {
  if (newPetId === petId.value) return
  petId.value = newPetId
  router.replace('/tasks/' + newPetId)
  await refresh()
}

onMounted(async () => {
  await fetchPets()
  if (petId.value) await refresh()
})
</script>

<style scoped>
.app-shell {
  width: 100%; min-height: 100vh; min-height: 100dvh;
  padding-top: var(--safe-top);
  padding-bottom: calc(80px + var(--safe-bottom));
  overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Pet Tabs */
.pet-tabs { display: flex; gap: 8px; padding: 12px 16px; overflow-x: auto; -ms-overflow-style: none; scrollbar-width: none; }
.pet-tabs::-webkit-scrollbar { display: none; }
.pet-tab {
  flex-shrink: 0; display: flex; align-items: center; gap: 4px;
  padding: 6px 14px; border-radius: var(--radius-pill);
  background: rgba(0,0,0,.04); font-size: 14px; color: var(--muted); cursor: pointer;
  transition: all .2s;
}
.pet-tab.active { background: var(--brown); color: #fff; }
.pet-tab-emoji { font-size: 16px; }

/* Score Overview */
.score-overview {
  display: flex; align-items: center; gap: 20px;
  margin: 8px 20px 20px; padding: 20px;
  background: var(--card); border-radius: var(--radius-card);
  box-shadow: var(--shadow-card); border: 1px solid var(--border);
}
.score-circle {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: rgba(108,138,105,.08); color: var(--green);
}
.score-circle.warn { background: rgba(255,149,0,.08); color: #FF9500; }
.score-circle.bad { background: rgba(255,59,48,.08); color: #FF3B30; }
.score-circle.good { background: rgba(108,138,105,.08); color: var(--green); }
.score-num { font-family: var(--font-num); font-size: 28px; font-weight: 700; line-height: 1; }
.score-unit { font-size: 11px; opacity: .7; }
.score-detail { flex: 1; min-width: 0; }
.score-title { font-size: 15px; font-weight: 600; color: var(--fg); margin-bottom: 8px; }
.score-bar-wrap { display: flex; align-items: center; gap: 8px; }
.score-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(0,0,0,.06); overflow: hidden; }
.score-bar-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
.score-bar-fill.good { background: linear-gradient(90deg, var(--green), #34C759); }
.score-bar-fill.warn { background: linear-gradient(90deg, #FF9500, #FFCC02); }
.score-bar-fill.bad { background: linear-gradient(90deg, #FF3B30, #FF9500); }
.score-bar-text { font-size: 12px; color: var(--muted); white-space: nowrap; }

/* Section */
.section { padding: 0 20px; margin-bottom: 16px; }
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.section-header.collapsible { cursor: pointer; }
.section-header.collapsible svg { width: 16px; height: 16px; color: var(--muted); transition: transform .25s; }
.section-header.collapsible svg.rotated { transform: rotate(180deg); }
.section-title { font-size: 16px; font-weight: 600; color: var(--fg); }
.section-title.done { color: var(--muted); }
.section-badge {
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-pill);
  background: rgba(255,149,0,.1); color: #FF9500;
}
.section-badge.done-count { background: rgba(108,138,105,.1); color: var(--green); }
.empty-hint { text-align: center; font-size: 14px; color: var(--muted); padding: 20px 0; }

/* Task Row */
.task-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; margin-bottom: 6px;
  border-radius: 16px; background: var(--card);
  box-shadow: 0 1px 4px rgba(0,0,0,.03);
  border: 1px solid var(--border);
  cursor: pointer; transition: transform .15s;
  user-select: none;
}
.task-row:active { transform: scale(.98); }
.task-row.completed { opacity: .55; }
.task-check { width: 24px; height: 24px; flex-shrink: 0; }
.task-check svg { width: 24px; height: 24px; color: var(--muted); }
.task-check.checked svg { color: var(--green); }
.task-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.task-icon { font-size: 20px; flex-shrink: 0; }
.task-text { flex: 1; min-width: 0; }
.task-title { font-size: 15px; color: var(--fg); font-weight: 500; }
.task-title.done { color: var(--muted); text-decoration: line-through; }
.task-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
.task-weight { font-size: 14px; font-weight: 600; color: var(--brown); white-space: nowrap; }
.task-weight.done { color: var(--green); }

/* Template Grid */
.template-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.template-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 14px; border-radius: var(--radius-pill);
  background: rgba(0,0,0,.04); font-size: 13px; color: var(--fg); cursor: pointer;
  transition: background .15s;
}
.template-chip:active { background: rgba(0,0,0,.1); }
.template-freq { font-size: 11px; color: var(--muted); margin-left: 2px; }

/* Sheet */
.sheet-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.35);
  display: flex; align-items: flex-end; justify-content: center;
}
.sheet-panel {
  width: 100%; max-width: 480px; max-height: 80vh;
  background: var(--card); border-radius: 24px 24px 0 0;
  padding: 12px 20px 32px; overflow-y: auto;
}
.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,.12); margin: 0 auto 16px; }
.sheet-title { font-size: 18px; font-weight: 700; color: var(--fg); margin-bottom: 16px; }

/* Quick Template Selector */
.quick-templates { display: flex; flex-direction: column; gap: 4px; }
.quick-tpl-row {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: 12px; cursor: pointer;
  font-size: 15px; color: var(--fg); transition: background .15s;
}
.quick-tpl-row:active { background: rgba(0,0,0,.04); }
.quick-tpl-row.custom { color: var(--brown); font-weight: 500; }
.q-freq { font-size: 12px; color: var(--muted); margin-left: auto; }

/* Form */
.form-group { margin-bottom: 14px; }
.form-group.half { margin-bottom: 0; flex: 1; }
.form-label { font-size: 13px; color: var(--muted); display: block; margin-bottom: 6px; }
.form-input {
  width: 100%; height: 42px; border: 1px solid var(--border); border-radius: 10px;
  padding: 0 12px; font-size: 15px; font-family: var(--font-body); color: var(--fg);
  background: var(--bg); outline: none; box-sizing: border-box;
}
.form-input:focus { border-color: var(--brown); }
.form-row { display: flex; gap: 12px; }

/* Icon Picker */
.icon-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.icon-option {
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  border-radius: 10px; font-size: 20px; cursor: pointer;
  background: var(--bg); border: 1.5px solid transparent; transition: all .15s;
}
.icon-option.active { border-color: var(--brown); background: rgba(139,94,70,.08); }

/* Weight Picker */
.weight-picker {
  display: flex; align-items: center; gap: 12px;
  height: 42px; padding: 0 14px; border-radius: 10px;
  background: var(--bg); border: 1px solid var(--border);
}
.weight-picker button {
  width: 28px; height: 28px; border-radius: 50%; border: none;
  background: var(--brown); color: #fff; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.weight-picker button:active { opacity: .7; }
.weight-picker span { font-family: var(--font-num); font-size: 17px; font-weight: 600; color: var(--fg); }

/* Sheet Actions */
.sheet-actions { display: flex; gap: 12px; margin-top: 16px; }
.sheet-btn {
  flex: 1; height: 46px; border-radius: var(--radius-btn);
  font-size: 15px; font-weight: 500; cursor: pointer; transition: transform .15s;
  border: none;
}
.sheet-btn:active { transform: scale(.97); }
.sheet-btn.primary { background: var(--brown); color: #fff; }
.sheet-btn.secondary { background: rgba(0,0,0,.06); color: var(--fg); }
.sheet-btn.danger { background: #FF3B30; color: #fff; }
.sheet-btn:disabled { opacity: .4; }

.delete-desc { font-size: 14px; color: var(--muted); text-align: center; padding: 12px 0; }

/* Skeleton */
.skeleton-list { padding: 0 20px; }
.task-row.skeleton { gap: 16px; }
.shimmer-circle {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);
  background-size: 400% 100%; animation: shimmer 1.4s ease infinite;
}
.shimmer-line {
  height: 14px; border-radius: 7px;
  background: linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);
  background-size: 400% 100%; animation: shimmer 1.4s ease infinite;
}
.shimmer-line.w60 { width: 60%; }
@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
</style>
