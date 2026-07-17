/* nuzzly web-ios - 数据层
 * 忠实复刻自 Vue 版 composables：useAuth/usePets/useHealthRecords/useDailyTasks/
 * useDietLogs/useHealthReminders/useNotifications 的查询与计算逻辑。
 */
(function () {
  const sb = window.sb

  async function getUid() {
    const { data } = await sb.auth.getSession()
    return data.session?.user?.id || null
  }

  /* ---------- useAuth ---------- */
  async function getCurrentUser() {
    const { data: { user } } = await sb.auth.getUser()
    return user
  }
  async function getProfile(uid) {
    const { data, error } = await sb
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, gender, region, trust_score, review_count, is_admin, user_number')
      .eq('id', uid)
      .maybeSingle()
    if (error) { console.warn('[data.getProfile]', error.message); return null }
    return data
  }
  async function signIn(identifier, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email: identifier, password })
    if (error) throw error
    return data
  }
  async function signUp(email, password, username) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } })
    if (error) throw error
    if (data.user) {
      let userNumber = 1
      try { const { data: n } = await sb.rpc('get_next_user_number'); userNumber = n || 1 } catch (e) {}
      const displayName = username || email.split('@')[0]
      await sb.from('profiles').upsert({ id: data.user.id, username: displayName, display_name: displayName, user_number: userNumber })
    }
    return data
  }
  async function signOut() { await sb.auth.signOut() }

  /* ---------- usePets ---------- */
  async function getPets(uid) {
    const { data, error } = await sb
      .from('pets')
      .select('id, name, species, breed, age_years, age_months, gender, weight_kg, neutered, stomach_health, photo_url, avatar_url, is_active')
      .eq('profile_id', uid)
      .eq('is_active', true)
      .order('created_at')
    if (error) { console.warn('[data.getPets]', error.message); return [] }
    return data || []
  }

  /* ---------- useHealthRecords（体重） ---------- */
  async function getHealthRecords(uid, petId) {
    let q = sb.from('health_records')
      .select('id, record_type, record_time, weight_kg, symptom_code, severity, diagnosis, medication_name, notes, metadata')
      .order('record_time', { ascending: false }).limit(20)
    if (uid) q = q.eq('profile_id', uid)
    if (petId) q = q.eq('pet_id', petId)
    const { data, error } = await q
    if (error) { console.warn('[data.getHealthRecords]', error.message); return [] }
    return data || []
  }
  function pickWeightRecords(records) {
    return records.filter(r => r.record_type === 'weight' && r.weight_kg)
  }

  /* ---------- useDietLogs ---------- */
  async function getDietLogs(uid, petId) {
    let q = sb.from('diet_logs').select('*').order('created_at', { ascending: false }).limit(20)
    if (uid) q = q.eq('profile_id', uid)
    if (petId) q = q.eq('pet_id', petId)
    const { data, error } = await q
    if (error) { console.warn('[data.getDietLogs]', error.message); return [] }
    return data || []
  }

  /* ---------- useHealthReminders ---------- */
  async function getHealthReminders(uid, petId) {
    let q = sb.from('health_reminders').select('*').order('due_date', { ascending: true })
    if (uid) q = q.eq('profile_id', uid)
    if (petId) q = q.eq('pet_id', petId)
    const { data, error } = await q
    if (error) { console.warn('[data.getHealthReminders]', error.message); return [] }
    return data || []
  }
  function computeDueCount(reminders) {
    const now = new Date()
    const weekLater = new Date(now); weekLater.setDate(weekLater.getDate() + 7)
    const today = now.toISOString().slice(0, 10)
    const limit = weekLater.toISOString().slice(0, 10)
    return reminders.filter(r => !r.is_completed && r.due_date >= today && r.due_date <= limit).length
  }

  /* ---------- useNotifications ---------- */
  async function getNotifications(uid, limit = 30) {
    const { data, error } = await sb
      .from('notifications')
      .select('id, title, body, type, action_url, is_read, created_at')
      .eq('profile_id', uid)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) { console.warn('[data.getNotifications]', error.message); return [] }
    return data || []
  }
  function computeUnreadCount(notifications) {
    return notifications.filter(n => !n.is_read).length
  }

  /* ---------- useDailyTasks（今日评分，忠实复刻） ---------- */
  function isSameWeek(d1, d2) {
    const wy = d => {
      const start = new Date(d.getFullYear(), 0, 1)
      return Math.floor(((d - start) / 86400000 + start.getDay() + 1) / 7)
    }
    return d1.getFullYear() === d2.getFullYear() && wy(d1) === wy(d2)
  }
  function isSameMonth(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
  }
  function isTaskDueToday(task, todayDate) {
    switch (task.frequency) {
      case 'daily': return true
      case 'weekly':
        if (!task.last_completed_date) return true
        const lc = new Date(task.last_completed_date), t = new Date(todayDate)
        const diff = Math.floor((t - lc) / 86400000)
        return diff >= 7 || !isSameWeek(lc, t)
      case 'monthly':
        if (!task.last_completed_date) return true
        return !isSameMonth(new Date(task.last_completed_date), new Date(todayDate))
      case 'custom_days':
        if (!task.last_completed_date) return true
        const cd = Math.floor((new Date(todayDate) - new Date(task.last_completed_date)) / 86400000)
        return cd >= (task.custom_days || 1)
      default: return true
    }
  }
  async function getDailyTasks(petId) {
    const { data, error } = await sb
      .from('daily_tasks').select('*')
      .eq('pet_id', petId).eq('is_active', true).order('sort_order')
    if (error) { console.warn('[data.getDailyTasks]', error.message); return [] }
    return data || []
  }
  async function getTodayLogs(petId) {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await sb
      .from('daily_task_logs').select('*')
      .eq('pet_id', petId).eq('task_date', today)
    if (error) { console.warn('[data.getTodayLogs]', error.message); return [] }
    return data || []
  }
  function computeTodayScore(tasks, logs) {
    const today = new Date().toISOString().slice(0, 10)
    const dueTasks = tasks.filter(t => isTaskDueToday(t, today))
    if (dueTasks.length === 0) return { score: 100, completedCount: 0, totalCount: 0 }
    const logMap = {}
    logs.forEach(l => { logMap[l.task_id] = l })
    let cw = 0, tw = 0
    dueTasks.forEach(t => {
      const log = logMap[t.id]
      if (log) t.last_completed_date = log.task_date
      tw += t.weight || 10
      if (log && log.completed) cw += t.weight || 10
    })
    const score = tw > 0 ? Math.round((cw / tw) * 100) : 100
    return {
      score,
      completedCount: dueTasks.filter(t => logMap[t.id]?.completed).length,
      totalCount: dueTasks.length
    }
  }

  window.NuzzlyData = {
    getUid, getCurrentUser, getProfile, signIn, signUp, signOut,
    getPets, getHealthRecords, pickWeightRecords,
    getDietLogs, getHealthReminders, computeDueCount,
    getNotifications, computeUnreadCount,
    getDailyTasks, getTodayLogs, computeTodayScore
  }
})()
