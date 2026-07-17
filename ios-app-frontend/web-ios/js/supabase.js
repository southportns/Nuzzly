/* nuzzly web-ios - Supabase 初始化
 * 凭据来自 Vue 版 .env.local（anon 公开密钥，与前端 bundle 暴露面一致）
 * 需在 HTML 中先加载 CDN: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
 */
const SUPABASE_URL = 'https://gooydkocbowchxoahhlg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvb3lka29jYm93Y2h4b2FoaGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Njc4NDEsImV4cCI6MjA5NDE0Mzg0MX0.6kYwNpvpT8RplEfiAZRy6a1FaSmQGTA_RpYFA-jaXvQ'

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
})
