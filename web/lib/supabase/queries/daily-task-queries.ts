import { createClient } from '../server'
import type { Database } from '@/lib/database.types'

type DailyTask = Database['public']['Tables']['daily_tasks']['Row']
type DailyTaskLog = Database['public']['Tables']['daily_task_logs']['Row']

export async function getDailyTasks(profileId: string, petId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('daily_tasks')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (petId) {
    query = query.eq('pet_id', petId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getDailyTaskById(taskId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error) throw error
  return data
}

export async function createDailyTask(task: Omit<DailyTask, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_tasks')
    .insert(task)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDailyTask(taskId: string, updates: Partial<DailyTask>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDailyTask(taskId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('daily_tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

export async function getDailyTaskLogs(profileId: string, petId: string, date?: string) {
  const supabase = await createClient()

  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_task_logs')
    .select('*, daily_tasks(title, icon, category)')
    .eq('profile_id', profileId)
    .eq('pet_id', petId)
    .eq('task_date', targetDate)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function logDailyTaskCompletion(log: Omit<DailyTaskLog, 'id' | 'completed_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_task_logs')
    .insert({
      ...log,
      completed: true,
      completed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function skipDailyTask(log: Omit<DailyTaskLog, 'id' | 'completed_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_task_logs')
    .insert({
      ...log,
      completed: false,
      skipped: true
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTaskCompletionStats(profileId: string, petId: string, days: number = 7) {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const { data: tasks } = await supabase
    .from('daily_tasks')
    .select('id')
    .eq('profile_id', profileId)
    .eq('pet_id', petId)
    .eq('is_active', true)

  const { data: logs, error } = await supabase
    .from('daily_task_logs')
    .select('task_id, completed, task_date, skipped')
    .eq('profile_id', profileId)
    .eq('pet_id', petId)
    .gte('task_date', startDateStr)

  if (error) throw error

  type TaskLog = { task_id: string; completed: boolean; task_date: string; skipped?: boolean | null }
  const totalTasks = tasks?.length || 0
  const completedLogs = (logs as TaskLog[] | null)?.filter(l => l.completed) || []
  const skippedLogs = (logs as TaskLog[] | null)?.filter(l => l.skipped) || []

  // 按日期分组
  const byDate: Record<string, { completed: number; skipped: number; total: number }> = {}
  for (const log of (logs as TaskLog[] | null) || []) {
    if (!byDate[log.task_date]) {
      byDate[log.task_date] = { completed: 0, skipped: 0, total: totalTasks }
    }
    if (log.completed) byDate[log.task_date].completed++
    if (log.skipped) byDate[log.task_date].skipped++
  }

  return {
    totalTasks,
    completedCount: completedLogs.length,
    skippedCount: skippedLogs.length,
    completionRate: totalTasks > 0 ? Math.round((completedLogs.length / (totalTasks * days)) * 100) : 0,
    byDate
  }
}
