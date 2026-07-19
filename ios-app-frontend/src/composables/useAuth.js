import { ref, readonly } from 'vue'
import { supabase } from '../lib/supabase'
import { normalizeError } from '../lib/error-handling'

// 全局单例状态
const user = ref(null)
const profile = ref(null)
const loading = ref(true)
const error = ref(null)

let initialized = false

function init() {
  if (initialized) return
  initialized = true

  supabase.auth.getSession().then(({ data }) => {
    user.value = data.session?.user ?? null
    loading.value = false
    if (user.value) loadProfile(user.value.id)
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
    if (user.value) loadProfile(user.value.id)
    else profile.value = null
  })
}

async function loadProfile(uid) {
  const { data, error } = await supabase
    .from('profiles')
    // 注意：profiles 表当前不含 gender / region 字段，已移除避免返回 undefined
    .select('id, username, display_name, avatar_url, bio, trust_score, review_count, is_admin, user_number')
    .eq('id', uid)
    .maybeSingle()
  if (error) {
    // loadProfile 是非关键路径（背景加载），吞错并打日志即可
    console.warn('[useAuth.loadProfile]', normalizeError(error, 'loadProfile'))
    return
  }
  profile.value = data
}

async function signIn(identifier, password) {
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: identifier, password })
  if (signInError) throw normalizeError(signInError, 'signIn')
  return data
}

async function signUp(email, password, username) {
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  })
  if (signUpError) throw normalizeError(signUpError, 'signUp')
  if (data.user) {
    const { data: userNumber } = await supabase.rpc('get_next_user_number')
    const displayName = username || email.split('@')[0]
    await supabase.from('profiles').upsert({
      id: data.user.id,
      username: displayName,
      display_name: displayName,
      user_number: userNumber || 1
    })
  }
  return data
}

async function signOut() {
  await supabase.auth.signOut()
  user.value = null
  profile.value = null
}

export function useAuth() {
  init()
  return { user: readonly(user), profile: readonly(profile), loading: readonly(loading), error, signIn, signUp, signOut, reloadProfile: () => user.value && loadProfile(user.value.id) }
}
