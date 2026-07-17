<template>
  <div class="skeleton-card">
    <div class="shimmer shimmer-thumb"></div>
    <div class="skeleton-body">
      <div class="shimmer shimmer-line" :style="{ width: '70%' }"></div>
      <div class="shimmer shimmer-line" :style="{ width: '50%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card{background:var(--card);border-radius:12px;overflow:hidden;display:flex;gap:12px;padding:12px}
.shimmer-thumb{width:72px;height:72px;border-radius:8px;flex-shrink:0}
.skeleton-body{flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center}
.shimmer-line{height:14px;border-radius:4px}
.shimmer{background:linear-gradient(90deg,rgba(0,0,0,.04) 25%,rgba(0,0,0,.08) 50%,rgba(0,0,0,.04) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
</style>
