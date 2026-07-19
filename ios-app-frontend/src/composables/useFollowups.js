import { ref, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'
import { writeGateway } from '../lib/gateway'
import { normalizeError, ERROR_CODES } from '../lib/error-handling'

// 长期追踪 composable：查询追踪计划 + 提交追踪条目 + 标记完成
// 对应 web 端 followup-wizard，Day 7/14/30/60/90/180 追踪提醒
// schedules 列表整体替换，使用 shallowRef 减少深度响应式开销
const schedules = shallowRef([])
const loading = ref(false)
const submitting = ref(false)

// 追踪日配置（与 phase2 schema CHECK 一致）
const FOLLOWUP_DAYS = [7, 14, 30, 60, 90, 180]

// 状态映射
const STATUS_LABEL = {
  pending: '待填写',
  reminded: '待填写',
  completed: '已完成',
  overdue: '已过期'
}

// 查询当前用户的追踪计划列表（带产品和宠物信息）
// status: 'pending' | 'completed' | 'overdue' | undefined(全部)
// options.silent: true 时只返回数据，不写入 schedules.value（用于计数等不污染列表场景）
async function fetchSchedules(status, options = {}) {
  const { silent = false } = options
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) { if (!silent) schedules.value = []; return [] }

  if (!silent) loading.value = true
  let query = supabase
    .from('review_followup_schedules')
    .select(`
      id, review_id, profile_id, followup_day, due_date, status,
      reminder_sent_at, completed_at, created_at,
      product_reviews!inner(
        id, product_id, pet_id,
        products!inner(name, brand, image_url),
        pets!inner(name, breed, species)
      )
    `)
    .eq('profile_id', uid)
    .order('due_date', { ascending: true })

  if (status === 'pending') {
    query = query.in('status', ['pending', 'reminded'])
  } else if (status === 'completed') {
    query = query.eq('status', 'completed')
  } else if (status === 'overdue') {
    query = query.eq('status', 'overdue')
  }

  const { data, error } = await query
  if (!silent) loading.value = false
  if (error) {
    console.warn('[useFollowups.fetchSchedules]', error.message)
    if (!silent) schedules.value = []
    return []
  }
  if (!silent) schedules.value = data || []
  return data || []
}

// 查询单个追踪计划详情
async function fetchSchedule(scheduleId) {
  const { data, error } = await supabase
    .from('review_followup_schedules')
    .select(`
      id, review_id, profile_id, followup_day, due_date, status,
      completed_at, created_at,
      product_reviews!inner(
        id, product_id, pet_id,
        products!inner(name, brand, image_url),
        pets!inner(name, breed, species, stomach_health)
      )
    `)
    .eq('id', scheduleId)
    .maybeSingle()
  if (error) {
    console.warn('[useFollowups.fetchSchedule]', error.message)
    return null
  }
  return data
}

// 提交追踪条目（5步向导收集的数据）
// payload: { schedule_id, stool_status?, coat_status?, energy_status?,
//            appetite_status?, continued_usage?, repurchase_intent?,
//            overall_satisfaction?, health_notes? }
async function submitFollowupEntry(payload) {
  const { data: session } = await supabase.auth.getSession()
  const uid = session?.session?.user?.id
  if (!uid) throw new Error('未登录')

  submitting.value = true
  const entryPayload = {
    schedule_id: payload.schedule_id,
    stool_status: payload.stool_status || null,
    coat_status: payload.coat_status || null,
    energy_status: payload.energy_status || null,
    appetite_status: payload.appetite_status || null,
    continued_usage: payload.continued_usage ?? null,
    repurchase_intent: payload.repurchase_intent || null,
    overall_satisfaction: payload.overall_satisfaction ?? null,
    health_notes: payload.health_notes || null
  }

  try {
    await writeGateway('CREATE_FOLLOWUP_ENTRY', entryPayload)
  } catch (e) {
    submitting.value = false
    throw normalizeError(e, 'submitFollowupEntry')
  }

  // 标记追踪计划为已完成
  try {
    await writeGateway('UPDATE_FOLLOWUP_SCHEDULE', {
      id: payload.schedule_id,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
  } catch (e) {
    console.warn('[useFollowups] 标记完成失败', e.message)
    // 条目已插入，标记失败不阻断流程
  }

  submitting.value = false
  // gateway event 类型不返回行数据，返回 payload 作为乐观结果
  return { ...entryPayload, profile_id: uid, created_at: new Date().toISOString() }
}

export function useFollowups() {
  return {
    schedules, loading, submitting,
    FOLLOWUP_DAYS, STATUS_LABEL,
    fetchSchedules, fetchSchedule, submitFollowupEntry
  }
}
