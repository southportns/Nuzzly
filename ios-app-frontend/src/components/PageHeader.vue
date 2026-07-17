<template>
  <header class="page-header">
    <button v-if="showBack" class="back-btn" @click="onBack" aria-label="返回">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <h1 class="page-title">{{ title }}</h1>
    <button v-if="actionText" class="action-btn" :disabled="actionDisabled" @click="$emit('action')">
      {{ actionLoading ? '保存中' : actionText }}
    </button>
    <span v-else class="action-placeholder"></span>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, required: true },
  actionText: { type: String, default: '' },
  actionLoading: { type: Boolean, default: false },
  actionDisabled: { type: Boolean, default: false },
  showBack: { type: Boolean, default: true },
  onBack: { type: Function, default: null }
})

const emit = defineEmits(['action'])
const router = useRouter()

function onBack() {
  if (props.onBack) props.onBack()
  else router.back()
}
</script>

<style scoped>
.page-header{display:flex;align-items:center;padding:12px 16px;gap:12px}
.back-btn{width:40px;height:40px;border-radius:50%;background:var(--card);box-shadow:var(--shadow-card);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);cursor:pointer;transition:transform .2s;flex-shrink:0}
.back-btn:active{transform:scale(.92)}
.back-btn svg{width:20px;height:20px;color:var(--fg)}
.page-title{font-family:var(--font-display);font-size:18px;font-weight:600;flex:1;text-align:center;color:var(--fg)}
.action-btn{font-size:15px;font-weight:500;color:var(--brown);cursor:pointer;background:none;border:none;flex-shrink:0;min-width:48px}
.action-btn:disabled{opacity:.5;cursor:default}
.action-placeholder{display:inline-block;width:48px;flex-shrink:0}
</style>
