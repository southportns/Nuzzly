<template>
  <div class="settings-shell">
    <header class="settings-header">
      <button class="back-btn" @click="$router.back()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <h1 class="settings-title">设置</h1>
    </header>
    <div class="settings-body">
      <div class="settings-group">
        <div class="settings-group-title">账号与资料</div>
        <div class="settings-cell" @click="$router.push('/settings/sub/account')"><span>账号与安全</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
        <div class="settings-cell" @click="$router.push('/settings/sub/pets')"><span>宠物档案</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">会员</div>
        <div class="settings-cell" @click="$router.push('/settings/sub/membership')"><span>会员</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">显示与语言</div>
        <div class="settings-cell" @click="$router.push('/settings/sub/language')"><span>语言</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
        <div class="settings-cell" @click="$router.push('/settings/sub/fontsize')"><span>文字大小</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">基础</div>
        <div class="settings-cell" @click="$router.push('/settings/sub/notification')"><span>通知</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
        <div class="settings-cell" @click="$router.push('/settings/sub/general')"><span>通用</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
        <div class="settings-cell" @click="$router.push('/settings/sub/privacy')"><span>隐私</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">内容与社交</div>
        <div class="settings-cell" @click="$router.push('/settings/sub/content')"><span>我的内容</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
        <div class="settings-cell" @click="$router.push('/settings/sub/interaction')"><span>互动设置</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">其他</div>
        <div class="settings-cell" @click="$router.push('/settings/sub/about')"><span>关于我们</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
        <div class="settings-cell" @click="$router.push('/settings/sub/feedback')"><span>帮助与反馈</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div v-if="isAdmin" class="settings-group">
        <div class="settings-group-title">管理</div>
        <div class="settings-cell" @click="$router.push('/admin')"><span>管理员控制台</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { signOut, profile } = useAuth()

const isAdmin = computed(() => profile.value?.is_admin)

async function handleLogout() {
  await signOut()
  router.replace('/login')
}
</script>

<style scoped>
.settings-shell{width:100%;min-height:100vh;min-height:100dvh;background:var(--bg);padding-top:var(--safe-top)}
.settings-header{display:flex;align-items:center;padding:12px 16px;gap:12px}
.back-btn{width:40px;height:40px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s}
.back-btn:active{transform:scale(.92)}
.back-btn svg{width:20px;height:20px;color:var(--fg)}
.settings-title{font-family:var(--font-display);font-size:18px;font-weight:600;flex:1;text-align:center;margin-right:40px}
.settings-body{padding:0 16px 40px}
.settings-group{background:var(--card);border-radius:12px;margin-bottom:12px;overflow:hidden}
.settings-group-title{font-size:13px;color:var(--muted);padding:16px 16px 8px;letter-spacing:.01em}
.settings-cell{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
.settings-cell:last-child{border-bottom:none}
.settings-cell:active{background:rgba(0,0,0,.03)}
.settings-cell span{font-size:16px;color:var(--fg)}
.settings-cell svg{width:16px;height:16px;color:var(--muted)}
.logout-btn{width:100%;height:48px;border-radius:var(--radius-btn);background:var(--card);border:1px solid var(--border);font-size:16px;color:var(--red);font-weight:500;cursor:pointer;transition:background .15s;margin-top:8px}
.logout-btn:active{background:rgba(255,59,48,.05)}
</style>
