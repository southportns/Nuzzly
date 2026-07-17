import { ref, computed, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

// 全局共享状态
const tasksByPet = {}        // petId -> shallowRef([])
const todayLogsByPet = {}    // petId -> shallowRef([])
const loading = ref(false)

function getOrCreatePetTasks(petId) {
  if (!tasksByPet[petId]) {
    tasksByPet[petId] = shallowRef([])
  }
  return tasksByPet[petId]
}

function getOrCreatePetLogs(petId) {
  if (!todayLogsByPet[petId]) {
    todayLogsByPet[petId] = shallowRef([])
  }
  return todayLogsByPet[petId]
}

function getSessionUid() {
  return supabase.auth.getSession().then(r => r.data?.session?.user?.id || null)
}

/**
 * 判断今天是否是任务的到期日
 */
function isTaskDueToday(task, todayDate) {
  switch (task.frequency) {
    case 'daily':
      return true
    case 'weekly':
      // 本周内没有完成过就算到期
      if (!task.last_completed_date) return true
      const lastCompleted = new Date(task.last_completed_date)
      const today = new Date(todayDate)
      const dayDiff = Math.floor((today - lastCompleted) / 86400000)
      // 如果距离上次完成 >= 7 天，或者不在同一周内
      return dayDiff >= 7 || !isSameWeek(lastCompleted, today)
    case 'monthly':
      if (!task.last_completed_date) return true
      return !isSameMonth(new Date(task.last_completed_date), new Date(todayDate))
    case 'custom_days':
      if (!task.last_completed_date) return true
      const customDiff = Math.floor((new Date(todayDate) - new Date(task.last_completed_date)) / 86400000)
      return customDiff >= (task.custom_days || 1)
    default:
      return true
  }
}

function isSameWeek(d1, d2) {
  const getWeekYear = d => {
    const start = new Date(d.getFullYear(), 0, 1)
    return Math.floor(((d - start) / 86400000 + start.getDay() + 1) / 7)
  }
  return d1.getFullYear() === d2.getFullYear() && getWeekYear(d1) === getWeekYear(d2)
}

function isSameMonth(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
}

// ========================================
// fetchTasks — 拉取该宠物的所有活跃任务
// ========================================
async function fetchTasks(petId) {
  const uid = await getSessionUid()
  if (!uid) return

  loading.value = true
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('sort_order')

  loading.value = false
  if (error) {
    console.warn('[useDailyTasks] fetchTasks error:', error.message)
    return []
  }
  return data || []
}

// ========================================
// fetchTodayLogs — 拉取/计算今日日志
// ========================================
async function fetchTodayLogs(petId) {
  const uid = await getSessionUid()
  if (!uid) return []

  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('daily_task_logs')
    .select('*')
    .eq('pet_id', petId)
    .eq('task_date', today)

  if (error) {
    console.warn('[useDailyTasks] fetchTodayLogs error:', error.message)
    return []
  }
  return data || []
}

// ========================================
// toggleTask — 切换完成状态（含懒创建日志）
// ========================================
async function toggleTask(taskId, petId, currentlyCompleted) {
  const uid = await getSessionUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'toggleTask')

  const today = new Date().toISOString().slice(0, 10)

  if (currentlyCompleted) {
    // 取消完成 → 更新日志为未完成
    const { error } = await supabase
      .from('daily_task_logs')
      .update({ completed: false, completed_at: null })
      .eq('task_id', taskId)
      .eq('task_date', today)

    if (error) throw normalizeError(error, 'toggleTask')
  } else {
    // 标记完成 → upsert 日志
    const { error } = await supabase
      .from('daily_task_logs')
      .upsert({
        task_id: taskId,
        pet_id: petId,
        profile_id: uid,
        task_date: today,
        completed: true,
        completed_at: new Date().toISOString(),
        skipped: false
      }, { onConflict: 'task_id,pet_id,task_date' })

    if (error) throw normalizeError(error, 'toggleTask')
  }

  // 刷新该宠物的日志缓存
  getOrCreatePetLogs(petId).value = await fetchTodayLogs(petId)
}

// ========================================
// computeTodayScore — 计算今日评分
// ========================================
function computeTodayScore(tasks, logs) {
  const today = new Date().toISOString().slice(0, 10)
  const dueTasks = tasks.filter(t => isTaskDueToday(t, today))

  if (dueTasks.length === 0) return { score: 100, completedCount: 0, totalCount: 0 }

  const logMap = {}
  logs.forEach(l => { logMap[l.task_id] = l })

  let completedWeight = 0
  let totalWeight = 0

  dueTasks.forEach(t => {
    const log = logMap[t.id]
    // 给日志补充 last_completed_date 用于到期判断
    if (log) t.last_completed_date = log.task_date
    totalWeight += t.weight || 10
    if (log && log.completed) {
      completedWeight += t.weight || 10
    }
  })

  const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 100
  return {
    score,
    completedCount: dueTasks.filter(t => logMap[t.id]?.completed).length,
    totalCount: dueTasks.length
  }
}

// ========================================
// addTask — 添加自定义任务
// ========================================
async function addTask(petId, taskData) {
  const uid = await getSessionUid()
  if (!uid) throw normalizeError({ code: ERROR_CODES.UNAUTHENTICATED, message: '未登录' }, 'addTask')

  const { data, error } = await supabase
    .from('daily_tasks')
    .insert({
      pet_id: petId,
      profile_id: uid,
      category: taskData.category || 'other',
      title: taskData.title,
      icon: taskData.icon || '📋',
      frequency: taskData.frequency || 'daily',
      custom_days: taskData.custom_days || null,
      reminder_time: taskData.reminder_time || null,
      reminder_enabled: taskData.reminder_enabled || false,
      weight: taskData.weight || 10,
      sort_order: taskData.sort_order || 99,
      is_builtin: false,
      is_active: true
    })
    .select()
    .single()

  if (error) throw normalizeError(error, 'addTask')

  // 刷新缓存
  const tasks = getOrCreatePetTasks(petId)
  tasks.value = [...tasks.value, data]
  return data
}

// ========================================
// updateTask — 更新任务
// ========================================
async function updateTask(taskId, updates) {
  const { data, error } = await supabase
    .from('daily_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw normalizeError(error, 'updateTask')
  return data
}

// ========================================
// removeTask — 禁用/删除任务
// ========================================
async function removeTask(taskId, petId) {
  const { error } = await supabase
    .from('daily_tasks')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw normalizeError(error, 'removeTask')

  const tasks = getOrCreatePetTasks(petId)
  tasks.value = tasks.value.filter(t => t.id !== taskId)
}

// ========================================
// 内置任务模板
// ========================================
const BUILTIN_TEMPLATES = {
  cat: [
    { title: '早晨喂食', icon: '🍽', category: 'feeding', frequency: 'daily', weight: 20, reminder_time: '08:00' },
    { title: '晚上喂食', icon: '🍽', category: 'feeding', frequency: 'daily', weight: 20, reminder_time: '19:00' },
    { title: '换水', icon: '💧', category: 'water', frequency: 'daily', weight: 15, reminder_time: '09:00' },
    { title: '铲屎', icon: '🧹', category: 'litter', frequency: 'daily', weight: 15, reminder_time: '20:00' },
    { title: '食盆清洁', icon: '🧼', category: 'bowl_clean', frequency: 'weekly', weight: 10, reminder_time: '10:00' },
    { title: '驱虫', icon: '💊', category: 'deworm', frequency: 'monthly', weight: 10 },
    { title: '梳毛', icon: '✂', category: 'grooming', frequency: 'weekly', weight: 10 }
  ],
  dog: [
    { title: '早晨喂食', icon: '🍽', category: 'feeding', frequency: 'daily', weight: 20, reminder_time: '08:00' },
    { title: '晚上喂食', icon: '🍽', category: 'feeding', frequency: 'daily', weight: 20, reminder_time: '19:00' },
    { title: '换水', icon: '💧', category: 'water', frequency: 'daily', weight: 10, reminder_time: '09:00' },
    { title: '早晨遛狗', icon: '🦮', category: 'walk', frequency: 'daily', weight: 15, reminder_time: '07:30' },
    { title: '晚上遛狗', icon: '🦮', category: 'walk', frequency: 'daily', weight: 15, reminder_time: '19:00' },
    { title: '食盆清洁', icon: '🧼', category: 'bowl_clean', frequency: 'weekly', weight: 10, reminder_time: '10:00' },
    { title: '驱虫', icon: '💊', category: 'deworm', frequency: 'monthly', weight: 10 }
  ],
  other: [
    { title: '早晨喂食', icon: '🍽', category: 'feeding', frequency: 'daily', weight: 20, reminder_time: '08:00' },
    { title: '晚上喂食', icon: '🍽', category: 'feeding', frequency: 'daily', weight: 20, reminder_time: '19:00' },
    { title: '换水', icon: '💧', category: 'water', frequency: 'daily', weight: 15, reminder_time: '09:00' },
    { title: '食盆清洁', icon: '🧼', category: 'bowl_clean', frequency: 'weekly', weight: 10, reminder_time: '10:00' },
    { title: '驱虫', icon: '💊', category: 'deworm', frequency: 'monthly', weight: 10 }
  ]
}

function getBuiltInTemplates(species) {
  return BUILTIN_TEMPLATES[species] || BUILTIN_TEMPLATES.other
}

// ========================================
// 频率标签映射
// ========================================
const FREQUENCY_LABELS = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  custom_days: '每N天'
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom_days', label: '自定义天数' }
]

const CATEGORY_LABELS = {
  feeding: '喂食',
  water: '换水',
  litter: '铲屎',
  walk: '遛狗',
  bowl_clean: '食盆清洁',
  deworm: '驱虫',
  grooming: '梳毛/美容',
  medicine: '喂药',
  other: '其他'
}

// ========================================
// 导出
// ========================================
export function useDailyTasks(petId) {
  let currentPetId = petId

  function getTasksRef() { return getOrCreatePetTasks(currentPetId) }
  function getLogsRef() { return getOrCreatePetLogs(currentPetId) }

  /**
   * 拉取全部数据
   */
  async function refresh(newPetId) {
    if (newPetId != null) currentPetId = newPetId
    if (!currentPetId) return

    const [tasks, logs] = await Promise.all([
      fetchTasks(currentPetId),
      fetchTodayLogs(currentPetId)
    ])
    getTasksRef().value = tasks
    getLogsRef().value = logs
    return { tasks, logs }
  }

  /**
   * 今日评分（响应式）
   */
  const todayScore = computed(() => {
    const result = computeTodayScore(getTasksRef().value, getLogsRef().value)
    return result.score
  })

  const todayProgress = computed(() => {
    const result = computeTodayScore(getTasksRef().value, getLogsRef().value)
    return result
  })

  /**
   * 今日到期的任务列表（包含完成状态）
   */
  const todayTasks = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    const logMap = {}
    getLogsRef().value.forEach(l => { logMap[l.task_id] = l })

    return getTasksRef().value
      .filter(t => isTaskDueToday(t, today))
      .map(t => ({
        ...t,
        completed: logMap[t.id]?.completed || false,
        logId: logMap[t.id]?.id || null
      }))
  })

  /**
   * 已完成和未完成分组的任务
   */
  const pendingTasks = computed(() => todayTasks.value.filter(t => !t.completed))
  const completedTasks = computed(() => todayTasks.value.filter(t => t.completed))

  return {
    tasks: getTasksRef(),
    logs: getLogsRef(),
    loading,
    todayScore,
    todayProgress,
    todayTasks,
    pendingTasks,
    completedTasks,
    refresh,
    toggleTask: (taskId, currentlyCompleted) => toggleTask(taskId, currentPetId, currentlyCompleted),
    addTask: (taskData) => addTask(currentPetId, taskData),
    updateTask: (id, updates) => updateTask(id, updates),
    removeTask: (taskId) => removeTask(taskId, currentPetId),
    getBuiltInTemplates,
    FREQUENCY_LABELS,
    FREQUENCY_OPTIONS,
    CATEGORY_LABELS
  }
}
