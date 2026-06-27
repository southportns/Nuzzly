<template>
  <nav class="tab-bar ignore-vw">
    <div class="tab-item" :class="{ active: activeTab === 'home' }" @click="$router.push('/')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21H7a4 4 0 0 1-4-4v-6.292a4 4 0 0 1 1.927-3.421l5-3.03a4 4 0 0 1 4.146 0l5 3.03A4 4 0 0 1 21 10.707V17a4 4 0 0 1-4 4m-8-4h6"/></svg>
      <span>首页</span>
    </div>
    <div class="tab-item" :class="{ active: activeTab === 'products' }" @click="$router.push('/products')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      <span>产品库</span>
    </div>
    <div class="tab-center">
      <div class="tab-center-btn" @click="$router.push('/community')">
        <img src="/svg/导航栏.png" alt="毛球镇" class="tab-logo">
      </div>
    </div>
    <div class="tab-item" :class="{ active: activeTab === 'butler' }" @click="$router.push('/ai')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.4a2 2 0 0 0 1.3 1.3L21 12l-5.8 2.3a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.4a2 2 0 0 0-1.3-1.3L3 12l5.8-2.3a2 2 0 0 0 1.3-1.3z"/></svg>
      <span>AI助手</span>
    </div>
    <div class="tab-item" :class="{ active: activeTab === 'profile' }" @click="$router.push('/profile')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>我的</span>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  activeTab: { type: String, default: 'home' }
})
</script>

<style scoped>
/* 父容器 .tab-bar.ignore-vw 锁定 tab 栏整体不缩放(vite.config.js 的 selectorBlackList 会跳过选择器中包含 .ignore-vw 的规则),
   这里显式带上 .ignore-vw 前缀,让 logo / 管家图标的 px 也保持固定,不随 vw 在大屏上放大。 */
.tab-bar.ignore-vw .tab-center-btn {
  width: 56px;
  height: 56px;
}

.tab-bar.ignore-vw .tab-center-btn .tab-logo {
  width: 65px;
  height: 65px;
}

/* common.css 里的 .tab-item svg/span/padding 在 1920 视口会被 vw 放大到 ~123px / ~51px / ~40px,
   撑爆 405px tab-bar 容器,导致 .tab-center 被挤到容器外看不到。
   这里覆盖锁定实际像素。 */
.tab-bar.ignore-vw .tab-item {
  padding: 8px 16px;
  gap: 3px;
}

.tab-bar.ignore-vw .tab-item > svg {
  width: 24px;
  height: 24px;
}

.tab-bar.ignore-vw .tab-item > span {
  font-size: 10px;
}
</style>
