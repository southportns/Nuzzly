<template>
  <div class="chip-group">
    <div
      v-for="opt in options"
      :key="opt.value"
      class="chip"
      :class="{ active: modelValue === opt.value }"
      @click="$emit('update:modelValue', opt.value)"
    >
      <span v-if="opt.emoji" class="chip-emoji">{{ opt.emoji }}</span>
      {{ opt.label }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  // 双向绑定当前选中值
  modelValue: { type: [Boolean, String, Number, null], default: '' },
  // 选项数组：[{ value, label, emoji? }]
  options: { type: Array, required: true }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.chip-group{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:8px 16px;border-radius:var(--radius-pill);background:var(--card);border:1px solid var(--border);font-size:14px;color:var(--fg);cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:4px}
.chip.active{background:var(--brown);color:#fff;border-color:var(--brown)}
.chip:active{transform:scale(.96)}
.chip-emoji{font-size:14px;line-height:1}
</style>
