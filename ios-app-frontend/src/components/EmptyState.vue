<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="description" class="empty-desc">{{ description }}</div>
    <button v-if="actionText" class="empty-action" @click="$emit('action')">{{ actionText }}</button>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '🐾' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center}
.empty-icon{font-size:48px;line-height:1;margin-bottom:12px;opacity:.8}
.empty-title{font-size:16px;font-weight:600;color:var(--fg);margin-bottom:6px}
.empty-desc{font-size:13px;color:var(--muted);line-height:1.5;max-width:260px}
.empty-action{margin-top:16px;padding:8px 24px;background:var(--brown);color:#fff;border:none;border-radius:var(--radius-pill);font-size:14px;font-weight:500;cursor:pointer;transition:transform .2s}
.empty-action:active{transform:scale(.96)}
</style>
