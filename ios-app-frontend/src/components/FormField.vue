<template>
  <div class="form-group" :class="{ half }">
    <label class="form-label">{{ label }}<span v-if="required" class="required-mark">*</span></label>
    <!-- 输入框 -->
    <input
      v-if="type === 'input'"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :type="inputType"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="form-input"
    />
    <!-- 数字输入框 -->
    <input
      v-else-if="type === 'number'"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))"
      type="number"
      :step="step"
      :min="min"
      :max="max"
      :placeholder="placeholder"
      class="form-input"
    />
    <!-- 多行文本 -->
    <textarea
      v-else-if="type === 'textarea'"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :placeholder="placeholder"
      :rows="rows"
      class="form-textarea"
    ></textarea>
    <!-- 只读展示 -->
    <div v-else-if="type === 'readonly'" class="readonly-value">{{ modelValue || placeholder }}</div>
    <!-- 默认插槽（自定义内容：单选组、chip 组等） -->
    <slot v-else></slot>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  modelValue: { type: [String, Number, null], default: '' },
  type: { type: String, default: 'slot' }, // input | number | textarea | readonly | slot
  inputType: { type: String, default: 'text' }, // 透传给 <input type>
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  required: { type: Boolean, default: false },
  half: { type: Boolean, default: false }, // 用于 form-row 双列布局
  step: { type: [String, Number], default: '' },
  min: { type: [String, Number], default: '' },
  max: { type: [String, Number], default: '' },
  rows: { type: [String, Number], default: 3 }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.form-group{background:var(--card);border-radius:12px;padding:16px;margin-bottom:12px}
.form-group.half{flex:1}
.form-label{font-size:13px;color:var(--muted);display:block;margin-bottom:8px;letter-spacing:.01em}
.required-mark{color:var(--brown);margin-left:2px}
.form-input{width:100%;height:44px;border:1px solid var(--border);border-radius:10px;padding:0 14px;font-size:15px;font-family:var(--font-body);color:var(--fg);background:var(--bg);outline:none;transition:border-color .2s;box-sizing:border-box}
.form-input:focus{border-color:var(--brown)}
.form-textarea{width:100%;border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:15px;font-family:var(--font-body);color:var(--fg);background:var(--bg);outline:none;resize:none;transition:border-color .2s;box-sizing:border-box}
.form-textarea:focus{border-color:var(--brown)}
.readonly-value{font-size:15px;color:var(--fg);padding:4px 0}
</style>
