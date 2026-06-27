<template>
  <div class="app-shell">
    <div class="status-bar-spacer"></div>
    <header class="header anim-fade-up">
      <div class="header-row">
        <button class="back-btn" @click="$router.back()" aria-label="返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 class="page-title">通知中心</h1>
        <button v-if="unreadCount > 0" class="mark-all" @click="onMarkAllRead">全部已读</button>
        <span v-else class="mark-all done">已全部读</span>
      </div>
    </header>

    <div class="subtitle anim-fade-up anim-delay-1">
      <span>{{ unreadCount > 0 ? `还有 ${unreadCount} 条未读` : '所有通知已读' }}</span>
      <span class="total">共 {{ notifications.length }} 条</span>
    </div>

    <div v-if="loading" class="list-body">
      <div v-for="i in 4" :key="i" class="notif-card skeleton">
        <div class="notif-icon shimmer"></div>
        <div class="notif-content">
          <div class="shimmer-line w70"></div>
          <div class="shimmer-line w90"></div>
        </div>
      </div>
    </div>

    <div v-else-if="notifications.length" class="list-body">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="notif-card anim-fade-up"
        :class="{ unread: !n.is_read }"
        @click="onTap(n)"
      >
        <div class="notif-icon" :class="n.type">
          <svg v-if="n.type === 'followup_reminder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <svg v-else-if="n.type === 'followup_overdue'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <svg v-else-if="n.type === 'review_published'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="notif-content">
          <div class="notif-title" :class="{ bold: !n.is_read }">{{ n.title }}</div>
          <div v-if="n.body" class="notif-body">{{ n.body }}</div>
          <div class="notif-time">{{ formatTime(n.created_at) }}</div>
        </div>
        <div v-if="!n.is_read" class="unread-dot"></div>
      </div>
    </div>

    <EmptyState
      v-else
      class="anim-fade-up anim-delay-2"
      icon="🔔"
      title="暂无通知"
      description="当有新的追踪提醒或系统通知时，会在这里显示"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '../composables/useNotifications'
import EmptyState from '../components/EmptyState.vue'

const router = useRouter()
const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllRead } = useNotifications()

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function onTap(n) {
  markAsRead(n.id)
  if (n.action_url) router.push(n.action_url)
}

function onMarkAllRead() {
  markAllRead()
}

onMounted(() => fetchNotifications())
</script>

<style scoped>
.app-shell{width:100%;min-height:100vh;min-height:100dvh;padding-top:var(--safe-top);padding-bottom:calc(88px + var(--safe-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.header{position:relative;padding:20px 24px 0;z-index:1}
.header-row{display:flex;align-items:center;justify-content:space-between}
.back-btn{width:40px;height:40px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s;flex-shrink:0}
.back-btn:active{transform:scale(.9)}
.back-btn svg{width:20px;height:20px;color:var(--fg)}
.page-title{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--fg)}
.mark-all{font-size:13px;color:var(--brown);font-weight:500;cursor:pointer;background:none;border:none;padding:4px 8px}
.mark-all.done{color:var(--muted);cursor:default}
.subtitle{display:flex;align-items:center;justify-content:space-between;padding:16px 24px 0;font-size:14px;color:var(--muted)}
.total{font-size:12px;color:var(--muted);background:rgba(0,0,0,.04);padding:3px 10px;border-radius:var(--radius-btn)}
.list-body{padding:16px 20px;display:flex;flex-direction:column;gap:10px}
.notif-card{display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:20px;background:rgba(0,0,0,.03);cursor:pointer;transition:transform .15s}
.notif-card:active{transform:scale(.98)}
.notif-card.unread{background:var(--card);box-shadow:0 2px 12px rgba(0,0,0,.05);border:1px solid var(--border)}
.notif-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
.notif-icon svg{width:18px;height:18px}
.notif-icon.followup_reminder{background:rgba(255,122,89,.1);color:#FF7A59}
.notif-icon.followup_overdue{background:rgba(255,59,48,.1);color:#FF3B30}
.notif-icon.review_published{background:rgba(108,138,105,.1);color:#6C8A69}
.notif-icon.trust_score_change{background:rgba(123,167,188,.1);color:#7BA7BC}
.notif-icon:not(.followup_reminder):not(.followup_overdue):not(.review_published):not(.trust_score_change){background:rgba(139,94,70,.1);color:var(--brown)}
.notif-content{flex:1;min-width:0}
.notif-title{font-size:14px;color:var(--fg);line-height:1.4}
.notif-title.bold{font-weight:600}
.notif-body{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.notif-time{font-size:11px;color:var(--muted);margin-top:6px;opacity:.6}
.unread-dot{width:8px;height:8px;border-radius:50%;background:var(--brown);flex-shrink:0;margin-top:6px}
.shimmer{background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.shimmer-line{height:12px;border-radius:6px;margin-bottom:8px;background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 37%,rgba(0,0,0,.04) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite}
.shimmer-line.w70{width:70%}
.shimmer-line.w90{width:90%}
.status-bar-spacer{height:var(--safe-top)}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.anim-fade-up{opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards}
.anim-delay-1{animation-delay:.1s}.anim-delay-2{animation-delay:.2s}
</style>
